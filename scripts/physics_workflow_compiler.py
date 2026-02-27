#!/usr/bin/env python3
import argparse
import json
from pathlib import Path
from typing import Any, Dict


def _load_json(path: str) -> Dict[str, Any]:
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def _write_text(path: Path, text: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    # Deterministic newline
    path.write_text(text.rstrip("\n") + "\n", encoding="utf-8")


def generate_enforcement_workflow(model: Dict[str, Any], out_dir: Path, spec: Dict[str, Any]) -> None:
    file_name = spec["file"]
    wf_name = spec["name"]
    on_obj = spec["on"]

    # Deterministic YAML output: explicitly order fields in the string.
    # Keep this simple and stable (no timestamps, no random ids).
    on_yaml_lines = []
    # expected shape: {"pull_request": {"types": [...]}}
    if "pull_request" in on_obj:
        types = on_obj["pull_request"].get("types", ["opened", "synchronize", "reopened"])
        types_yaml = ", ".join([f"'{t}'" for t in types])
        on_yaml_lines.append("on:")
        on_yaml_lines.append("  pull_request:")
        on_yaml_lines.append(f"    types: [{types_yaml}]")
    else:
        # fallback: run on PR always
        on_yaml_lines.append("on:")
        on_yaml_lines.append("  pull_request: {}")

    workflow = f"""name: {wf_name}

{chr(10).join(on_yaml_lines)}

permissions:
  contents: read

jobs:
  enforce:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: \"3.11\"

      - name: Physics enforcement (bounds + drift thresholds vs baseline)
        run: |
          python scripts/physics_semantic_diff.py \\
            --current agent_physics/current_state.json \\
            --model agent_physics/physics_model.json \\
            --check-only
"""
    _write_text(out_dir / file_name, workflow)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--model", required=True, help="Path to agent_physics/physics_model.json")
    ap.add_argument("--out", required=True, help="Output directory for generated workflows")
    args = ap.parse_args()

    model = _load_json(args.model)
    out_dir = Path(args.out)

    compiler = model.get("compiler") or {}
    specs = compiler.get("generated_workflows") or []
    if not specs:
        raise SystemExit("ERR: model.compiler.generated_workflows is empty")

    for spec in specs:
        generate_enforcement_workflow(model, out_dir, spec)


if __name__ == "__main__":
    main()
