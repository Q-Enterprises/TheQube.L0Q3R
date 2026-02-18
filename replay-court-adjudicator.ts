import Ajv, { DefinedError } from "ajv";
import crypto from "crypto";

// ---------- Types (wire-level) ----------

export type VerdictOutcome = "PASS" | "FAIL" | "INCONCLUSIVE";

export interface ReplayCourtInputV1 {
  schema_version: "ReplayCourtInput.v1";
  run_id: string;
  kernel_version: string;
  tick_hz: number;
  tick_count: number;
  seed: number;
  spec_refs: {
    vehicle_spec: string; // sha256:<64hex>
    avatar_spec: string; // sha256:<64hex>
    scenario_spec: string; // sha256:<64hex>
  };
  action_stream: ActionProposalV1[];
}

export interface ActionProposalV1 {
  schema_version: "ActionProposal.v1";
  tick: number;
  avatar_id: string;
  throttle_q: number;
  brake_q?: number;
  steer_q: number;
}

export interface ReplayVerdictV1 {
  schema_version: "ReplayVerdict.v1";
  run_id: string;
  verdict: VerdictOutcome;
  merkle_root: string; // sha256:<64hex>
  failure_tick?: number;
  timestamp_utc: string; // ISO8601
  error_code?: AdjudicatorErrorCode;
  error_detail?: string;
}

// ---------- Error taxonomy ----------

export type AdjudicatorErrorCode =
  | "SCHEMA_INVALID"
  | "SPEC_MISSING"
  | "KERNEL_ERROR"
  | "DIVERGENCE"
  | "INCONCLUSIVE";

// ---------- Ajv setup (pinned schemas injected from outside) ----------

export interface AdjudicatorDeps {
  ajv: Ajv; // preconfigured with ReplayCourtInput.v1 + ActionProposal.v1 schemas
  loadSpecByHash: (hash: string) => Promise<unknown>; // sha256:<64hex> → spec JSON
  selectKernel: (kernelVersion: string) => ReplayKernel;
  recomputePspMerkleRoot: (frames: WorldStateFrame[]) => string;
}

export interface WorldStateFrame {
  tick: number;
  // minimal surface; real schema lives elsewhere
  state_hash: string;
}

export interface ReplayKernel {
  runDeterministic: (input: {
    tick_hz: number;
    tick_count: number;
    seed: number;
    specs: {
      vehicle_spec: unknown;
      avatar_spec: unknown;
      scenario_spec: unknown;
    };
    action_stream: ActionProposalV1[];
  }) => Promise<WorldStateFrame[]>;
}

// ---------- Entry point ----------

export async function adjudicate(
  input: ReplayCourtInputV1,
  deps: AdjudicatorDeps
): Promise<ReplayVerdictV1> {
  const startedAt = new Date().toISOString();

  try {
    // 1) Schema validation
    validateSchemaOrThrow(input, deps.ajv);

    // 2) Spec resolution (sha256 refs)
    const specs = await resolveSpecsOrThrow(input.spec_refs, deps.loadSpecByHash);

    // 3) Kernel selection
    const kernel = deps.selectKernel(input.kernel_version);
    if (!kernel) {
      return failVerdict(input.run_id, startedAt, "KERNEL_ERROR", "Kernel not found");
    }

    // 4) Deterministic replay loop
    const frames = await kernel.runDeterministic({
      tick_hz: input.tick_hz,
      tick_count: input.tick_count,
      seed: input.seed,
      specs,
      action_stream: input.action_stream
    });

    // 5) PSP Merkle recompute
    const recomputedRoot = deps.recomputePspMerkleRoot(frames);

    // 6) Compare against declared root (from external anchor / input binding)
    // For v0.1, assume declared root is carried in specs.scenario_spec["psp_merkle_root"] or similar.
    const declaredRoot = extractDeclaredRoot(specs);
    if (!declaredRoot) {
      return failVerdict(
        input.run_id,
        startedAt,
        "INCONCLUSIVE",
        "No declared Merkle root"
      );
    }

    if (recomputedRoot === declaredRoot) {
      return {
        schema_version: "ReplayVerdict.v1",
        run_id: input.run_id,
        verdict: "PASS",
        merkle_root: recomputedRoot,
        timestamp_utc: startedAt
      };
    }

    const failureTick = detectDivergenceTick(
      frames,
      declaredRoot,
      deps.recomputePspMerkleRoot
    );

    return {
      schema_version: "ReplayVerdict.v1",
      run_id: input.run_id,
      verdict: "FAIL",
      merkle_root: recomputedRoot,
      failure_tick: failureTick ?? undefined,
      timestamp_utc: startedAt,
      error_code: "DIVERGENCE",
      error_detail: "Recomputed Merkle root does not match declared root"
    };
  } catch (e: any) {
    const code: AdjudicatorErrorCode =
      e?.code && typeof e.code === "string"
        ? (e.code as AdjudicatorErrorCode)
        : "KERNEL_ERROR";

    return {
      schema_version: "ReplayVerdict.v1",
      run_id: input.run_id,
      verdict: code === "SCHEMA_INVALID" ? "INCONCLUSIVE" : "FAIL",
      merkle_root: "sha256:" + "0".repeat(64),
      timestamp_utc: startedAt,
      error_code: code,
      error_detail: String(e?.message ?? e)
    };
  }
}

// ---------- Phase helpers ----------

function validateSchemaOrThrow(input: ReplayCourtInputV1, ajv: Ajv) {
  const validate = ajv.getSchema("ReplayCourtInput.v1");
  if (!validate) {
    const err = new Error("ReplayCourtInput.v1 schema not registered");
    (err as any).code = "SCHEMA_INVALID";
    throw err;
  }
  const ok = validate(input);
  if (!ok) {
    const msg = (validate.errors as DefinedError[] | null | undefined ?? [])
      .map((error) => `${error.instancePath} ${error.message}`)
      .join("; ");
    const err = new Error(`Schema validation failed: ${msg}`);
    (err as any).code = "SCHEMA_INVALID";
    throw err;
  }
}

async function resolveSpecsOrThrow(
  refs: ReplayCourtInputV1["spec_refs"],
  loader: (hash: string) => Promise<unknown>
) {
  const [vehicle_spec, avatar_spec, scenario_spec] = await Promise.all([
    loader(refs.vehicle_spec),
    loader(refs.avatar_spec),
    loader(refs.scenario_spec)
  ]);

  if (!vehicle_spec || !avatar_spec || !scenario_spec) {
    const err = new Error("One or more spec_refs could not be resolved");
    (err as any).code = "SPEC_MISSING";
    throw err;
  }

  return { vehicle_spec, avatar_spec, scenario_spec };
}

function extractDeclaredRoot(specs: {
  vehicle_spec: unknown;
  avatar_spec: unknown;
  scenario_spec: unknown;
}): string | null {
  // v0.1: placeholder — caller decides where the canonical PSP Merkle root lives.
  const scenarioSpec = specs.scenario_spec as { psp_merkle_root?: unknown } | null;
  const root = scenarioSpec?.psp_merkle_root;
  if (typeof root === "string" && /^sha256:[a-f0-9]{64}$/.test(root)) return root;
  return null;
}

function detectDivergenceTick(
  frames: WorldStateFrame[],
  declaredRoot: string,
  recompute: (subset: WorldStateFrame[]) => string
): number | null {
  // v0.1: linear search; later can be optimized with Merkle segment proofs.
  for (let i = 1; i <= frames.length; i += 1) {
    const partialRoot = recompute(frames.slice(0, i));
    if (partialRoot === declaredRoot) {
      // divergence occurs after this tick; for now, report i as boundary
      return i;
    }
  }
  return null;
}

function failVerdict(
  runId: string,
  timestamp: string,
  code: AdjudicatorErrorCode,
  detail: string
): ReplayVerdictV1 {
  return {
    schema_version: "ReplayVerdict.v1",
    run_id: runId,
    verdict: code === "INCONCLUSIVE" ? "INCONCLUSIVE" : "FAIL",
    merkle_root: "sha256:" + "0".repeat(64),
    timestamp_utc: timestamp,
    error_code: code,
    error_detail: detail
  };
}

// ---------- Utility (canonical hash helper example) ----------

export function sha256Hex(buf: Buffer | string): string {
  const payload = typeof buf === "string" ? Buffer.from(buf, "utf8") : buf;
  return crypto.createHash("sha256").update(payload).digest("hex");
}
