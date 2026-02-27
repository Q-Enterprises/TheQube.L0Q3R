# Unity MLOps Pipeline Setup Guide

This guide explains how to run an autonomous Unity reinforcement learning pipeline using `mlops_unity_pipeline.py`.

## What this pipeline does

1. Generates Unity C# behavior scripts from an asset specification.
2. Builds Unity environments in headless mode.
3. Trains RL agents with ML-Agents (supports offline bootstrap path).
4. Registers trained models in Vertex AI (optional).
5. Schedules recurring jobs with cron expressions.

## Prerequisites

- Python 3.10+
- Unity editor with CLI support (optional but recommended)
- ML-Agents CLI
- `croniter` for scheduling

Install dependencies:

```bash
pip install mlagents==1.0.0 pyyaml croniter

# Verify ML-Agents CLI compatibility
mlagents-learn --help
```

> `pyyaml` is used to emit structured trainer configuration (including behavioral cloning blocks for demonstration data).

Optional for Vertex AI registration:

```bash
pip install google-cloud-aiplatform
```

## Quick start (single job)

Create a `test.py`:

```python
import asyncio
from mlops_unity_pipeline import (
    RLTrainingConfig,
    TrainingJob,
    UnityAssetSpec,
    UnityMLOpsOrchestrator,
)


async def main():
    orchestrator = UnityMLOpsOrchestrator()

    asset = UnityAssetSpec(
        asset_id="test-001",
        name="SimpleAgent",
        asset_type="behavior",
        description="Reach target position",
    )

    config = RLTrainingConfig(
        algorithm="PPO",
        max_steps=100_000,
    )

    job = TrainingJob(
        job_id="test-job",
        asset_spec=asset,
        rl_config=config,
    )

    result = await orchestrator.execute_training_job(job)
    print(f"Done: {result.status}, model={result.trained_model_path}")


asyncio.run(main())
```

Run it:

```bash
python test.py
```

## Environment variables

| Variable | Required | Purpose |
|---|---:|---|
| `UNITY_EXECUTABLE` | No | Path to Unity CLI executable |
| `UNITY_PROJECT_PATH` | No | Path to Unity project |
| `VERTEX_ENABLE` | No | Set `true` to upload model to Vertex AI |
| `VERTEX_PROJECT` | If Vertex enabled | GCP project id |
| `VERTEX_REGION` | No | Vertex region (`us-central1` default) |
| `VERTEX_SERVING_CONTAINER_IMAGE_URI` | If Vertex enabled | Serving container image URI compatible with ONNX artifacts |
| `TRAINING_WEBHOOK_URL` | No | Webhook called on job completion |

If Unity variables are not configured, the pipeline creates a mock build so local validation still works.



## Vertex AI model registration for ONNX

When `VERTEX_ENABLE=true`, the pipeline uploads the trained model artifact directory to Vertex AI and configures the serving container from environment variables.

Expected defaults for ONNX artifacts:

- `VERTEX_SERVING_CONTAINER_IMAGE_URI=us-docker.pkg.dev/vertex-ai/prediction/onnxruntime-cpu.1-15:latest`
- `VERTEX_SERVING_CONTAINER_PREDICT_ROUTE=/predict`
- `VERTEX_SERVING_CONTAINER_HEALTH_ROUTE=/health`

Required packaging layout for `artifact_uri`:

- The uploaded artifact URI points to the parent directory of your ONNX file.
- At minimum, include the model file in that directory (for example `model.onnx`).
- Keep container/runtime expectations aligned with artifact format: ONNX models require an ONNX-compatible serving image.

If an ONNX artifact is paired with a known incompatible default (for example a `sklearn` serving container), registration fails early with a clear validation error before upload.

## 24/7 scheduled training

Create `scheduler.py`:

```python
import asyncio
from mlops_unity_pipeline import (
    RLTrainingConfig,
    TrainingSchedule,
    TrainingScheduler,
    UnityAssetSpec,
    UnityMLOpsOrchestrator,
)


async def run_forever():
    orchestrator = UnityMLOpsOrchestrator()
    scheduler = TrainingScheduler(orchestrator)

    schedule = TrainingSchedule(
        schedule_id="nightly",
        cron_expression="0 2 * * *",
        asset_specs=[
            UnityAssetSpec(
                asset_id="nav-001",
                name="NavigationAgent",
                asset_type="behavior",
                description="Navigate obstacles to reach goal",
                observation_space={"raycast": 8, "velocity": 2},
                action_space={"type": "continuous", "size": 2},
            )
        ],
        rl_config=RLTrainingConfig(
            algorithm="PPO",
            max_steps=1_000_000,
            num_envs=16,
            time_scale=20.0,
        ),
    )

    scheduler.add_schedule(schedule)
    await scheduler.run_forever()


asyncio.run(run_forever())
```

## Offline RL workflow

Suggested process:

1. Collect demonstration trajectories in your Unity environment.
2. Export demonstrations to your dataset storage.
3. Set `offline_dataset_path` in `RLTrainingConfig`. This is written into trainer YAML under `behavioral_cloning.demo_path`.
4. If warm-starting from an existing ML-Agents run, set `initialize_from_run_id` separately.
5. Run scheduled jobs to retrain from datasets regularly.
6. Optionally fine-tune online in simulation.

## Production deployment notes

- Containerize the pipeline and run as a long-lived service.
- Mount a persistent volume for `.mlops_unity/` artifacts.
- Expose TensorBoard summaries from `training_runs/*/summaries`.
- Use CI to validate schema/config changes.
- Separate dev/staging/prod GCP projects for model registry.

## Monitoring

- Pipeline logs: stdout/stderr from worker process.
- Training summaries: TensorBoard directory emitted per run.
- Webhook payload: includes status, timestamps, metrics, and artifact paths.

## Troubleshooting

- `croniter is required`: install `croniter`.
- `mlagents-learn not found`: install `mlagents` and ensure CLI in PATH.
- Unity build not running: verify `UNITY_EXECUTABLE` and `UNITY_PROJECT_PATH`.
- Vertex upload failing: check `VERTEX_ENABLE`, credentials, project, region, and `VERTEX_SERVING_CONTAINER_IMAGE_URI` for ONNX compatibility.
