# World Engine — Web Game Kernel Blueprint (v0.1)

**Purpose**
Define a *single, reproducible gameplay kernel* that unifies **physics**, **vehicle**, and **avatar** models into a version-controlled simulation product. The system is designed to operate as a **Game-as-OS runtime** for agent-driven enterprises, while remaining compatible with **web Canvas runtimes** and high-fidelity **Unity / Unreal Engine** builds.

This blueprint is explicitly aligned with the **BAEK-CHEON-2026 Static Topology Contract (v0.1-cob)** and is written to be audit-safe, deterministic at its core, and extensible without sovereignty loss.

---

## 0) Executive Definition

### 0.1 What is being built

A **World Engine Kernel** that:

1. Executes **deterministic simulations** (Loop 0) and produces verifiable **audit artifacts** (hashes, receipts, merkle surfaces).
2. Exposes **bounded tool sockets** that allow Agents to:

   * construct and modify world models,
   * run simulations and scenario replays,
   * validate outcomes deterministically,
   * ship versioned, replayable game builds.
3. Maintains a unified **object library**—vehicles, avatars, environments, sensors—usable across:

   * a web-based Canvas runtime for rapid iteration, and
   * Unity or Unreal Engine for high-fidelity execution.

The kernel itself functions as the **operating substrate** for agent-managed simulation products.

### 0.2 Primary artifacts

* **Kernel Runtime** — deterministic loop, physics integration, state fossilization
* **Object Library** — vehicles, avatars, sensors, environments, incidents
* **Contracts** — schemas, invariants, and hash rules
* **Tool Sockets** — containerized services with explicit IO boundaries

---

## 1) Architectural Alignment (Topology-Correct)

All runtime behavior must preserve the forward-only authority chain:

**EngineCore → AgentRuntime → SovereignKernel → PhysicsManifold → StableStringify**

No backward calls. No bypasses. No shared mutation.

### 1.1 Module responsibilities

**EngineCore**

* Owns the fixed timestep
* Orchestrates update ordering
* Enforces the no-bypass policy

**AgentRuntime**

* Proposes actions (steer, throttle, brake, intent vectors)
* In Loop 0, may be deterministic policies or replayed inputs

**SovereignKernel**

* Validates proposals against contracts and bounds
* May veto, clamp, or halt execution

**PhysicsManifold**

* The *only* mutator of world state
* Integrates rigid bodies, tires, contacts, and constraints

**StableStringify**

* Canonicalizes state
* Emits hashable receipts and merkle roots
* Establishes finality

---

## 2) Runtime Layers

### 2.1 Loop 0 — Deterministic Core

* Fixed timestep (e.g., 1/60 s)
* No network IO
* Content is read-only
* Produces deterministic state frames and periodic seals

This layer is the **audit-grade truth surface**.

### 2.2 Loop 1+ — Instrumented Extension

* External inputs only through **socket contracts**
* All IO logged as receipts
* Network access permitted only as a gated, replay-provable surface

---

## 3) Unified Simulation Model

### 3.1 Authoritative world state

A single canonical structure (conceptual):

* `world.time`
* `world.entities[]`
* `world.physics` (velocities, contacts, constraints)
* `world.sensors` (optional)
* `world.audits` (hash surfaces)

### 3.2 Entity model

**Entity = Avatar | Vehicle | Prop | Sensor | IncidentEmitter**

Each entity is a struct-like record:

* `entity_id`
* `type`
* `pose` (position, rotation)
* `kinematics` (velocity, acceleration)
* `health / state`
* `components[]`

### 3.3 Vehicle model (core components)

* **Chassis** — mass, inertia tensor, center of gravity
* **Powertrain** — torque curve, gearing, drivetrain layout
* **Tires** — slip angle/ratio, friction curve, temperature (optional)
* **Aero** — downforce vs speed, drag
* **Differential** — open / LSD / electronic
* **Active Dynamics** — stability and control parameters

### 3.4 Avatar model (core components)

* **Controller** — deterministic input generator or replay stream
* **Perception** — sensor feeds (if enabled)
* **Intent** — structured action proposals

### 3.5 “Composed Slip” as a validation artifact

“Composed slip” is treated as a **spec-to-behavior proof** rather than a cinematic effect.

**Specification example:**

* Controlled yaw allowed within a bounded envelope
* Lateral acceleration remains trackable
* Recovery occurs within *N* ticks after corrective input

**Outputs:**

* Numeric envelopes (slip angle, yaw rate, recovery time)
* Canonical visual anchor

This converts driving behavior into a **verifiable design artifact**.

---

## 4) Engine Targets

### 4.1 Web / Canvas runtime

* Fast iteration and tooling
* Deterministic simplified physics or WASM physics core
* Minimal dependencies

### 4.2 Unity target

* C# implementations of EngineCore, SovereignKernel, StableStringify
* Physics options:

  * Unity Physics / Havok (non-deterministic across platforms), or
  * Custom deterministic physics for audit mode

### 4.3 Unreal target

* C++ implementations of the same module boundaries
* Chaos Physics is not platform-deterministic
* Determinism guaranteed only in controlled audit environments

**Recommendation:**
Maintain an **engine-agnostic deterministic audit mode (Loop 0)**, and use Unity/Unreal primarily for rendering and Loop 1+ interaction.

---

## 5) Containerized Tool Sockets

### 5.1 Socket classes

1. **Asset Compiler Socket**
   Input: object specifications
   Output: engine-ready assets + hashes

2. **Simulation Runner Socket**
   Input: seed, scenario, control script
   Output: state timeline + receipts + verdict

3. **Verifier Socket**
   Input: replay capsules
   Output: fail-closed verdict + evidence hashes

4. **Exporter Socket**
   Input: verified build + manifest
   Output: tagged release bundle

### 5.2 Socket invariants

All socket IO is:

* schema-validated
* canonicalized
* hashed
* optionally signed

---

## 6) Contracts and Schemas

### 6.1 Object library

* `VehicleSpec.v1`
* `AvatarSpec.v1`
* `EnvironmentSpec.v1`
* `ScenarioSpec.v1`

### 6.2 Runtime and audit

* `WorldStateFrame.v1`
* `ActionProposal.v1`
* `ValidatedIntent.v1`
* `ReplayCourtInput.v1`
* `ReplayVerdict.v1`

### 6.3 Deterministic hashing rules

* JCS / key-sorted canonical JSON
* Explicit hash surfaces
* Stable numeric policy (no NaN/Inf; fixed precision if floats are used)

---

## 7) CI and Release Model

### 7.1 Repository layout

* `/kernel/` — EngineCore, SovereignKernel, StableStringify
* `/physics/` — PhysicsManifold implementations
* `/objects/` — canonical object specifications
* `/scenarios/` — reproducible scenarios and seeds
* `/sockets/` — containerized services
* `/builds/` — build scripts and release manifests

### 7.2 CI gates

* schema validation
* deterministic regression traces
* verifier receipts
* artifact hashing and signing

---

## 8) Practical Build Order

### Step 1 — Minimal playable slice

* Single vehicle and avatar
* Single track scenario
* Deterministic physics step
* Stable stringify with periodic seals

### Step 2 — Kernel object library

* VehicleSpec with powertrain, tires, and dynamics flags
* AvatarSpec with controller modes

### Step 3 — Tool sockets

* Headless simulation runner
* Fail-closed verifier

### Step 4 — Engine bridge

* Import specs into Unity or Unreal
* Execute Loop 0 headless for audit
* Render Loop 1+ visually

---

## 9) Open defaults (unless overridden)

1. **Determinism scope**
   Deterministic in audit mode; envelope-verified in presentation mode.

2. **Physics engine**
   Custom deterministic core for audit; engine physics for presentation.

3. **Seal cadence**
   Fixed cadence plus finality trigger.

---

## 10) Next artifacts available for generation

* Minimal JSON Schemas for VehicleSpec, AvatarSpec, ScenarioSpec
* A Loop 0 web prototype with deterministic physics and receipts
* Unity or Unreal project scaffolding aligned to the kernel boundaries
* Tool socket API contracts for containerized integration
