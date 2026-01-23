# BAEK-CHEON-2026 — Static Topology Contract (v0.1-cob)

**Focus:** Architectural hygiene • Mutate permissions • Loop 0 determinism
**Plane:** Sovereign Runtime (Genesis VI)

---

## 0. Definitions

### 0.1 Modules

* **EngineCore**: Scheduler / orchestrator; sole driver of Loop 0.
* **AgentRuntime**: Cognition surface; generates intent proposals.
* **SovereignKernel**: Guardian / validator; authorizes or vetoes intent.
* **PhysicsManifold**: Kinetic reality; sole mutator of world state.
* **StableStringify**: Scribe; sole fossilizer of world state.

### 0.2 Terms

* **Read**: Observe state or inputs without altering canonical state.
* **Mutate**: Change canonical state.
* **Veto**: Reject or halt an intent or transition.
* **Fossilize**: Persist canonical state to an append-only audit surface.
* **Loop 0**: Primary runtime tick pathway; no side-channels permitted.

---

## 1. Constitutional Hierarchy (Mutate Permissions)

This table is the immutability contract of Loop 0.

| Module          | Role                     | Read Access                         | Mutate Access                     | Authority        |
| --------------- | ------------------------ | ----------------------------------- | --------------------------------- | ---------------- |
| EngineCore      | Scheduler / Orchestrator | Manifest, Kernel                    | Tick counter; orchestration state | Orchestration    |
| AgentRuntime    | Cognition Surface        | Embeddings, tensors, vetted context | Internal worker memory only       | Inference        |
| PhysicsManifold | Kinetic Reality          | Vetted intent                       | **World state** (exclusive)       | Physical law     |
| SovereignKernel | Guardian / Validator     | Physics state; intent proposals     | None                              | Integrity / veto |
| StableStringify | Scribe                   | Total manifold (read-only)          | Fossil ledger (append-only)       | Finality         |

### 1.1 Interpretation

* **EngineCore** is the *only* module that advances the loop.
* **AgentRuntime** may *propose* intent; it may not commit.
* **SovereignKernel** may *veto* intent; it may not mutate state.
* **PhysicsManifold** is the *only* module that mutates world state.
* **StableStringify** is the *only* module that fossilizes canonical state.

This is a one-way authority chain.

---

## 2. One-Way Door Policy (Anti-Cycle Law)

### 2.1 Sense Logic

**EngineCore → AgentRuntime**

* Data: `embedding.xml → tensor`
* Meaning: Observe the world.

### 2.2 Cognition Path

**AgentRuntime → EngineCore**

* Data: `inference → action_proposal`
* Meaning: Propose intent.

### 2.3 Vetting Gate (MANDATORY)

**EngineCore → SovereignKernel**

* Data: `action_proposal → validated_intent | veto`
* Meaning: Determine admissibility.

### 2.4 Kinetic Commit

**EngineCore → PhysicsManifold**

* Data: `validated_intent → state_transition`
* Meaning: Make it real.

### 2.5 Audit Exit

**PhysicsManifold → StableStringify**

* Data: `state → JCS_SHA256 (+ optional signature)`
* Meaning: Record the truth.

### 2.6 Prohibitions

* No module calls backward.
* No module bypasses its successor.
* No module mutates outside its domain.

This is the corridor invariant.

---

## 3. Explicit Call Sites (Loop 0 Runtime Edges)

These are the canonical, permitted edges.

| Source          | Target          |                   Method | Frequency | Type            |
| --------------- | --------------- | -----------------------: | --------: | --------------- |
| EngineCore      | AgentRuntime    |     `RequestInference()` |    240 Hz | Functional      |
| EngineCore      | SovereignKernel | `ExecuteSovereignTick()` |    240 Hz | Integrity-check |
| EngineCore      | PhysicsManifold |                 `Step()` |    240 Hz | Mutate-state    |
| PhysicsManifold | Shader          |      `SetStressAmount()` | On change | Visual          |
| EngineCore      | StableStringify |      `stableStringify()` |    240 Hz | Persistence     |

### 3.1 Scheduling Rule

If a refusal oracle exists (Stage 5), **Stage 5 must run before Stage 4 sealing** in the same tick chain.

---

## 4. Structural Diagram (Textual)

```
[embedding.xml] → AgentRuntime → intent
        ↑                 ↓
EngineCore → SovereignKernel → PhysicsManifold → StableStringify → fossil
```

All arrows point forward. All mutations occur in one place. All truth is written once.

---

## 5. Operational Acceptance Criteria

A runtime build satisfies this contract iff:

1. Every mutation of canonical world state occurs exclusively in PhysicsManifold.
2. Every fossilized state is emitted exclusively by StableStringify.
3. EngineCore is the only driver of Loop 0.
4. SovereignKernel is the only veto authority.
5. No observed call graph contains backward edges or successor bypass.

---

## 6. Change Control

Any modification that:

* adds a new module,
* adds a new edge,
* changes mutate permissions,
* introduces a side-channel write,

must increment the contract version and include a drift rationale.
