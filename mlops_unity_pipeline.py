"""Autonomous Unity MLOps orchestration pipeline.

This module provides an end-to-end workflow for:
1) LLM-driven Unity C# behavior generation
2) Headless Unity environment build
3) ML-Agents training (online and/or offline)
4) Model registration in Vertex AI (optional)
5) Cron-based recurring training schedules

The implementation is intentionally provider-agnostic with pragmatic defaults,
so teams can wire in their own command templates and credentials.
"""

from __future__ import annotations

import asyncio
import dataclasses
import datetime as dt
import json
import logging
import os
import pathlib
import shutil
import subprocess
import tempfile
import textwrap
import uuid
from dataclasses import dataclass, field
from typing import Any, Callable, Dict, Iterable, List, Optional

try:
    from croniter import croniter  # type: ignore
except Exception:  # pragma: no cover - optional dependency at runtime
    croniter = None

LOGGER = logging.getLogger(__name__)


@dataclass(slots=True)
class UnityAssetSpec:
    """Defines a Unity asset/behavior to generate and train."""

    asset_id: str
    name: str
    asset_type: str
    description: str
    observation_space: Dict[str, Any] = field(default_factory=dict)
    action_space: Dict[str, Any] = field(default_factory=dict)
    reward_spec: Dict[str, Any] = field(default_factory=dict)
    tags: List[str] = field(default_factory=list)


@dataclass(slots=True)
class RLTrainingConfig:
    """ML-Agents training configuration for a single training run."""

    algorithm: str = "PPO"
    max_steps: int = 1_000_000
    num_envs: int = 16
    time_scale: float = 20.0
    batch_size: int = 1024
    buffer_size: int = 10_240
    learning_rate: float = 3e-4
    hidden_units: int = 256
    num_layers: int = 2
    offline_dataset_path: Optional[str] = None
    run_id_prefix: str = "unity-mlops"


@dataclass(slots=True)
class TrainingJob:
    """One unit of work for the orchestration pipeline."""

    job_id: str
    asset_spec: UnityAssetSpec
    rl_config: RLTrainingConfig
    created_at: dt.datetime = field(default_factory=lambda: dt.datetime.now(dt.timezone.utc))
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass(slots=True)
class TrainingResult:
    """Output artifact metadata for a completed job."""

    job_id: str
    status: str
    generated_script_path: Optional[str] = None
    unity_build_path: Optional[str] = None
    trained_model_path: Optional[str] = None
    tensorboard_dir: Optional[str] = None
    vertex_model_resource_name: Optional[str] = None
    started_at: dt.datetime = field(default_factory=lambda: dt.datetime.now(dt.timezone.utc))
    completed_at: Optional[dt.datetime] = None
    metrics: Dict[str, Any] = field(default_factory=dict)
    logs: List[str] = field(default_factory=list)


@dataclass(slots=True)
class TrainingSchedule:
    """Cron-style schedule for recurring training jobs."""

    schedule_id: str
    cron_expression: str
    asset_specs: List[UnityAssetSpec]
    rl_config: RLTrainingConfig
    enabled: bool = True
    timezone: str = "UTC"
    metadata: Dict[str, Any] = field(default_factory=dict)


class UnityMLOpsOrchestrator:
    """Coordinates code generation, build, training, and model registration."""

    def __init__(
        self,
        workspace_dir: str | os.PathLike[str] = "./.mlops_unity",
        llm_codegen_fn: Optional[Callable[[UnityAssetSpec], str]] = None,
        unity_executable: Optional[str] = None,
        unity_project_path: Optional[str] = None,
        webhook_url: Optional[str] = None,
    ) -> None:
        self.workspace_dir = pathlib.Path(workspace_dir)
        self.workspace_dir.mkdir(parents=True, exist_ok=True)
        self.llm_codegen_fn = llm_codegen_fn
        self.unity_executable = unity_executable or os.getenv("UNITY_EXECUTABLE")
        self.unity_project_path = unity_project_path or os.getenv("UNITY_PROJECT_PATH")
        self.webhook_url = webhook_url or os.getenv("TRAINING_WEBHOOK_URL")

    async def execute_training_job(self, job: TrainingJob) -> TrainingResult:
        """Runs the complete training flow for one job."""
        result = TrainingResult(job_id=job.job_id, status="running")
        result.logs.append(f"[{job.job_id}] started at {result.started_at.isoformat()}")

        try:
            generated_script = await self.generate_unity_code(job.asset_spec)
            result.generated_script_path = str(generated_script)

            build_path = await self.build_unity_environment(job, generated_script)
            result.unity_build_path = str(build_path)

            train_info = await self.train_agent(job, build_path)
            result.trained_model_path = train_info["model_path"]
            result.tensorboard_dir = train_info.get("tensorboard_dir")
            result.metrics.update(train_info.get("metrics", {}))

            vertex_id = await self.register_model_vertex_ai(job, train_info["model_path"])
            result.vertex_model_resource_name = vertex_id

            result.status = "completed"
            result.logs.append(f"[{job.job_id}] completed successfully")
        except Exception as exc:  # pragma: no cover - runtime failure path
            result.status = "failed"
            result.logs.append(f"[{job.job_id}] failed: {exc}")
            raise
        finally:
            result.completed_at = dt.datetime.now(dt.timezone.utc)
            await self._send_webhook(result)

        return result

    async def generate_unity_code(self, asset_spec: UnityAssetSpec) -> pathlib.Path:
        """Generates a C# script for the Unity asset behavior."""
        asset_dir = self.workspace_dir / "generated_assets" / asset_spec.asset_id
        asset_dir.mkdir(parents=True, exist_ok=True)
        script_path = asset_dir / f"{asset_spec.name}.cs"

        if self.llm_codegen_fn:
            script_content = await asyncio.to_thread(self.llm_codegen_fn, asset_spec)
        else:
            script_content = self._fallback_script_template(asset_spec)

        script_path.write_text(script_content, encoding="utf-8")
        return script_path

    async def build_unity_environment(
        self,
        job: TrainingJob,
        generated_script_path: pathlib.Path,
    ) -> pathlib.Path:
        """Builds a Unity executable for training.

        If Unity CLI isn't configured, this creates a mock build folder so the
        remaining pipeline can still be validated locally.
        """
        build_dir = self.workspace_dir / "builds" / job.job_id
        build_dir.mkdir(parents=True, exist_ok=True)

        if self.unity_executable and self.unity_project_path:
            cmd = [
                self.unity_executable,
                "-quit",
                "-batchmode",
                "-projectPath",
                self.unity_project_path,
                "-executeMethod",
                "MLOpsBuildPipeline.BuildTrainingEnvironment",
                "-logFile",
                str(build_dir / "unity-build.log"),
            ]
            await self._run_command(cmd, cwd=str(self.workspace_dir))
        else:
            (build_dir / "README.txt").write_text(
                "Mock build created because UNITY_EXECUTABLE/UNITY_PROJECT_PATH not set.\n",
                encoding="utf-8",
            )
            shutil.copy2(generated_script_path, build_dir / generated_script_path.name)

        return build_dir

    async def train_agent(self, job: TrainingJob, unity_build_path: pathlib.Path) -> Dict[str, Any]:
        """Runs ML-Agents training and returns artifacts/metrics metadata."""
        run_id = f"{job.rl_config.run_id_prefix}-{job.job_id}-{uuid.uuid4().hex[:8]}"
        output_root = self.workspace_dir / "training_runs" / run_id
        output_root.mkdir(parents=True, exist_ok=True)

        trainer_yaml = output_root / "trainer_config.yaml"
        trainer_yaml.write_text(self._build_trainer_yaml(job), encoding="utf-8")

        command = [
            "mlagents-learn",
            str(trainer_yaml),
            f"--run-id={run_id}",
            "--force",
            f"--num-envs={job.rl_config.num_envs}",
            f"--time-scale={job.rl_config.time_scale}",
            f"--env={unity_build_path}",
        ]

        if job.rl_config.offline_dataset_path:
            command.append(f"--initialize-from={job.rl_config.offline_dataset_path}")

        try:
            await self._run_command(command, cwd=str(output_root))
            simulated = False
        except FileNotFoundError:
            simulated = True
            (output_root / "training.log").write_text(
                "mlagents-learn binary not found; simulated training run.\n",
                encoding="utf-8",
            )

        model_path = output_root / "models" / f"{job.asset_spec.name}.onnx"
        model_path.parent.mkdir(parents=True, exist_ok=True)
        if not model_path.exists():
            model_path.write_bytes(b"simulated-model")

        metrics = {
            "algorithm": job.rl_config.algorithm,
            "max_steps": job.rl_config.max_steps,
            "simulated": simulated,
        }
        return {
            "model_path": str(model_path),
            "tensorboard_dir": str(output_root / "summaries"),
            "metrics": metrics,
        }

    async def register_model_vertex_ai(self, job: TrainingJob, model_path: str) -> Optional[str]:
        """Registers model in Vertex AI if configured.

        This method intentionally avoids hard dependency on google-cloud-aiplatform.
        Set VERTEX_ENABLE=true and provide VERTEX_PROJECT/VERTEX_REGION to enable.
        """
        if os.getenv("VERTEX_ENABLE", "false").lower() != "true":
            return None

        project = os.getenv("VERTEX_PROJECT")
        region = os.getenv("VERTEX_REGION", "us-central1")
        display_name = f"{job.asset_spec.name}-{job.job_id}"
        if not project:
            raise ValueError("VERTEX_PROJECT must be set when VERTEX_ENABLE=true")

        try:
            from google.cloud import aiplatform  # type: ignore
        except Exception as exc:  # pragma: no cover
            raise RuntimeError("google-cloud-aiplatform is required for Vertex registration") from exc

        def _register() -> str:
            aiplatform.init(project=project, location=region)
            model = aiplatform.Model.upload(
                display_name=display_name,
                artifact_uri=str(pathlib.Path(model_path).parent),
                serving_container_image_uri="us-docker.pkg.dev/vertex-ai/prediction/sklearn-cpu.1-2:latest",
            )
            return model.resource_name

        return await asyncio.to_thread(_register)

    async def _run_command(self, command: Iterable[str], cwd: Optional[str] = None) -> None:
        LOGGER.info("Running command: %s", " ".join(command))

        def _run() -> None:
            subprocess.run(list(command), cwd=cwd, check=True)

        await asyncio.to_thread(_run)

    async def _send_webhook(self, result: TrainingResult) -> None:
        if not self.webhook_url:
            return

        payload = dataclasses.asdict(result)

        def _post() -> None:
            import urllib.request

            req = urllib.request.Request(
                self.webhook_url,
                data=json.dumps(payload, default=str).encode("utf-8"),
                headers={"Content-Type": "application/json"},
                method="POST",
            )
            with urllib.request.urlopen(req, timeout=10):
                return

        try:
            await asyncio.to_thread(_post)
        except Exception as exc:  # pragma: no cover
            LOGGER.warning("Webhook failed: %s", exc)

    def _build_trainer_yaml(self, job: TrainingJob) -> str:
        behavior_name = job.asset_spec.name
        cfg = job.rl_config
        return textwrap.dedent(
            f"""
            behaviors:
              {behavior_name}:
                trainer_type: {cfg.algorithm.lower()}
                max_steps: {cfg.max_steps}
                hyperparameters:
                  batch_size: {cfg.batch_size}
                  buffer_size: {cfg.buffer_size}
                  learning_rate: {cfg.learning_rate}
                network_settings:
                  hidden_units: {cfg.hidden_units}
                  num_layers: {cfg.num_layers}
            """
        ).strip() + "\n"

    def _fallback_script_template(self, asset_spec: UnityAssetSpec) -> str:
        return textwrap.dedent(
            f"""
            using UnityEngine;

            public class {asset_spec.name} : MonoBehaviour
            {{
                // Auto-generated fallback behavior.
                // Description: {asset_spec.description}

                void Start()
                {{
                    Debug.Log("{asset_spec.name} initialized.");
                }}

                void Update()
                {{
                    // TODO: Replace with generated ML-Agents behavior logic.
                }}
            }}
            """
        ).strip() + "\n"


class TrainingScheduler:
    """Simple asynchronous cron scheduler for training jobs."""

    def __init__(self, orchestrator: UnityMLOpsOrchestrator, poll_interval_seconds: int = 30) -> None:
        self.orchestrator = orchestrator
        self.poll_interval_seconds = poll_interval_seconds
        self._schedules: Dict[str, TrainingSchedule] = {}
        self._next_run_at: Dict[str, dt.datetime] = {}

    def add_schedule(self, schedule: TrainingSchedule) -> None:
        if croniter is None:
            raise RuntimeError("croniter is required for TrainingScheduler")

        self._schedules[schedule.schedule_id] = schedule
        self._next_run_at[schedule.schedule_id] = self._compute_next_run(schedule)

    def remove_schedule(self, schedule_id: str) -> None:
        self._schedules.pop(schedule_id, None)
        self._next_run_at.pop(schedule_id, None)

    async def run_forever(self) -> None:
        while True:
            await self.run_pending()
            await asyncio.sleep(self.poll_interval_seconds)

    async def run_pending(self) -> None:
        now = dt.datetime.now(dt.timezone.utc)
        tasks: List[asyncio.Task[Any]] = []

        for schedule_id, schedule in list(self._schedules.items()):
            if not schedule.enabled:
                continue

            due_at = self._next_run_at.get(schedule_id)
            if due_at and now >= due_at:
                for spec in schedule.asset_specs:
                    job = TrainingJob(
                        job_id=f"{schedule_id}-{spec.asset_id}-{now.strftime('%Y%m%d%H%M%S')}",
                        asset_spec=spec,
                        rl_config=schedule.rl_config,
                        metadata={"schedule_id": schedule_id},
                    )
                    tasks.append(asyncio.create_task(self.orchestrator.execute_training_job(job)))

                self._next_run_at[schedule_id] = self._compute_next_run(schedule, base=now)

        if tasks:
            await asyncio.gather(*tasks)

    def _compute_next_run(self, schedule: TrainingSchedule, base: Optional[dt.datetime] = None) -> dt.datetime:
        if croniter is None:
            raise RuntimeError("croniter is required for TrainingScheduler")

        base = base or dt.datetime.now(dt.timezone.utc)
        itr = croniter(schedule.cron_expression, base)
        next_dt = itr.get_next(dt.datetime)
        if next_dt.tzinfo is None:
            next_dt = next_dt.replace(tzinfo=dt.timezone.utc)
        return next_dt.astimezone(dt.timezone.utc)


async def _demo() -> None:
    orchestrator = UnityMLOpsOrchestrator()

    job = TrainingJob(
        job_id="demo-job",
        asset_spec=UnityAssetSpec(
            asset_id="demo-asset",
            name="SimpleAgent",
            asset_type="behavior",
            description="Reach target position while avoiding obstacles.",
        ),
        rl_config=RLTrainingConfig(max_steps=100_000),
    )

    result = await orchestrator.execute_training_job(job)
    print(json.dumps(dataclasses.asdict(result), indent=2, default=str))


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    asyncio.run(_demo())
