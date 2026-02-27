#!/usr/bin/env python3
import argparse
import json
import math
from dataclasses import dataclass
from typing import Any, Dict, Tuple, List


def _load_json(path: str) -> Dict[str, Any]:
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def _write_json(path: str, obj: Dict[str, Any]) -> None:
    # Deterministic JSON output: sorted keys, stable separators
    with open(path, "w", encoding="utf-8") as f:
        json.dump(obj, f, sort_keys=True, ensure_ascii=False, separators=(",", ":"))
        f.write("\n")


def _fmt(x: float) -> str:
    # stable formatting for markdown
    if x is None:
        return "null"
    if isinstance(x, bool):
        return "true" if x else "false"
    if isinstance(x, (int, float)):
        # avoid scientific notation noise for typical ranges
        return f"{float(x):.6f}".rstrip("0").rstrip(".")
    return str(x)


@dataclass(frozen=True)
class Delta:
    name: str
    before: float
    after: float
    delta: float
    abs_delta: float
    drift_threshold: float
    bounds_min: float
    bounds_max: float
    drifted: bool
    in_bounds: bool


def compute_deltas(
    model: Dict[str, Any],
    current_state: Dict[str, Any],
    drift_event: Dict[str, Any],
) -> List[Delta]:
    model_vars = model.get("variables", {})
    cur_vars = (current_state.get("variables") or {})
    drift_vars = (drift_event.get("variables") or {})

    deltas: List[Delta] = []
    for name, spec in sorted(model_vars.items(), key=lambda kv: kv[0]):
        before = float(cur_vars.get(name, model["baseline_state"].get(name, 0.0)))
        after = float(drift_vars.get(name, before))

        bounds = spec.get("bounds") or {}
        bmin = float(bounds.get("min", -math.inf))
        bmax = float(bounds.get("max", math.inf))
        thr = float(spec.get("drift_threshold", 0.0))

        d = after - before
        ad = abs(d)
        in_bounds = (after >= bmin) and (after <= bmax)
        drifted = ad > thr

        deltas.append(
            Delta(
                name=name,
                before=before,
                after=after,
                delta=d,
                abs_delta=ad,
                drift_threshold=thr,
                bounds_min=bmin,
                bounds_max=bmax,
                drifted=drifted,
                in_bounds=in_bounds,
            )
        )

    return deltas


def build_pr_body(deltas: List[Delta]) -> str:
    lines: List[str] = []
    lines.append("## Physics drift update")
    lines.append("")
    lines.append("This PR was auto-generated from `agent_physics/drift_event.json`.")
    lines.append("")
    lines.append("### Semantic deltas")
    lines.append("")
    lines.append("| variable | before | after | Δ | |Δ| | threshold | in bounds | drifted |")
    lines.append("|---|---:|---:|---:|---:|---:|:---:|:---:|")

    drifted_any = False
    oob_any = False

    for d in deltas:
        drifted_any = drifted_any or d.drifted
        oob_any = oob_any or (not d.in_bounds)
        lines.append(
            f"| `{d.name}` | {_fmt(d.before)} | {_fmt(d.after)} | {_fmt(d.delta)} | {_fmt(d.abs_delta)} | {_fmt(d.drift_threshold)} | {'✅' if d.in_bounds else '❌'} | {'✅' if d.drifted else '❌'} |"
        )

    lines.append("")
    lines.append("### Summary")
    lines.append("")
    lines.append(f"- Any drift beyond threshold: {'YES' if drifted_any else 'NO'}")
    lines.append(f"- Any out-of-bounds values: {'YES' if oob_any else 'NO'}")
    lines.append("")
    lines.append("### Review gates")
    lines.append("")
    lines.append("- Physics reviewer: validate deltas and thresholds")
    lines.append("- Compiler reviewer: verify generated workflows on merge")
    lines.append("- Security reviewer: confirm no privilege drift in workflows")
    lines.append("")
    return "\n".join(lines)


def apply_updates(
    model: Dict[str, Any],
    current_state: Dict[str, Any],
    drift_event: Dict[str, Any],
    deltas: List[Delta],
) -> Tuple[Dict[str, Any], Dict[str, Any], Dict[str, Any]]:
    # Update baseline_state to the drift "after" values
    baseline = dict(model.get("baseline_state") or {})
    for d in deltas:
        baseline[d.name] = d.after
    model["baseline_state"] = baseline

    # Append a deterministic history entry (no timestamps; hashable if desired)
    hist = list(model.get("history") or [])
    hist.append(
        {
            "event_version": drift_event.get("event_version"),
            "source": drift_event.get("source"),
            "applied": {d.name: d.after for d in deltas},
            "drifted": {d.name: d.drifted for d in deltas},
            "out_of_bounds": {d.name: (not d.in_bounds) for d in deltas},
        }
    )
    model["history"] = hist

    # Sync current_state to drift_event
    current_state["variables"] = dict(drift_event.get("variables") or {})

    return model, current_state, drift_event


def check_only(
    model: Dict[str, Any],
    current_state: Dict[str, Any],
) -> Tuple[bool, str]:
    # Compare current_state to model baseline_state, enforce:
    # - in-bounds for all vars
    # - abs(current - baseline) <= drift_threshold
    model_vars = model.get("variables") or {}
    baseline = model.get("baseline_state") or {}
    cur_vars = current_state.get("variables") or {}

    violations: List[str] = []
    for name, spec in sorted(model_vars.items(), key=lambda kv: kv[0]):
        cur = float(cur_vars.get(name, baseline.get(name, 0.0)))
        base = float(baseline.get(name, cur))

        bounds = spec.get("bounds") or {}
        bmin = float(bounds.get("min", -math.inf))
        bmax = float(bounds.get("max", math.inf))
        thr = float(spec.get("drift_threshold", 0.0))

        if not (bmin <= cur <= bmax):
            violations.append(f"{name}: out_of_bounds cur={_fmt(cur)} bounds=[{_fmt(bmin)},{_fmt(bmax)}]")

        if abs(cur - base) > thr:
            violations.append(f"{name}: drift cur={_fmt(cur)} base={_fmt(base)} |Δ|={_fmt(abs(cur-base))} thr={_fmt(thr)}")

    if violations:
        msg = "PHYSICS_ENFORCEMENT_FAILED\n" + "\n".join(violations)
        return False, msg
    return True, "PHYSICS_ENFORCEMENT_OK"


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--current", required=True, help="Path to current_state.json")
    ap.add_argument("--drift", required=False, help="Path to drift_event.json (for PR generation)")
    ap.add_argument("--model", required=True, help="Path to physics_model.json")
    ap.add_argument("--write-updates", action="store_true", help="Write updated model/current_state (PR path)")
    ap.add_argument("--emit-pr-body", default=None, help="Write markdown PR body to this path")
    ap.add_argument("--check-only", action="store_true", help="Enforcement mode: validate current_state vs model baseline/thresholds")
    args = ap.parse_args()

    model = _load_json(args.model)
    current_state = _load_json(args.current)

    if args.check_only:
        ok, msg = check_only(model, current_state)
        print(msg)
        raise SystemExit(0 if ok else 2)

    if not args.drift:
        raise SystemExit("ERR: --drift is required unless --check-only is set")

    drift_event = _load_json(args.drift)

    deltas = compute_deltas(model, current_state, drift_event)
    pr_body = build_pr_body(deltas)

    if args.emit_pr_body:
        with open(args.emit_pr_body, "w", encoding="utf-8") as f:
            f.write(pr_body)
            f.write("\n")

    if args.write_updates:
        model2, current2, drift2 = apply_updates(model, current_state, drift_event, deltas)
        _write_json(args.model, model2)
        _write_json(args.current, current2)
        _write_json(args.drift, drift2)

    # Also print the body for logs
    print(pr_body)


if __name__ == "__main__":
    main()
