# Consent Boundaries: Permission vs Agreement

## Core Distinction
- **Permission** is a technical grant: an explicit capability to access or act on data.
- **Agreement** is a contextual commitment: an expectation about *why*, *when*, and *under what conditions* that access is used.

## Why Systems Fail at Consent
- **Delegation gaps:** scope tends to be broad (“manage email”), while user intent is narrow (“handle newsletters, not medical updates”).
- **Contextual integrity breaks:** data reuse across contexts violates expectations even when the permission was technically granted.
- **Rigid policy vs fluid boundaries:** binary permissions cannot express degrees of comfort or shifting norms.

## Where the Gap Lives
It sits at the **intersection** of technical architecture and philosophy:
- **Architecture** is responsible for encoding boundaries (purpose binding, scope narrowing, sensitivity tiers, and policy-aware agents).
- **Philosophy** defines what those boundaries *should* be (norms, ethics, and power dynamics).

In practice, the architecture can only be as respectful as the philosophy is precise.

## Practical Design Implications
- **Purpose binding:** require every action to declare a purpose and enforce purpose-compatible data access.
- **Delegation contracts:** attach explicit constraints and exception lists to any delegated capability.
- **Context tags:** encode provenance and intended use so policy engines can block cross-context reuse.
- **Progressive consent:** allow dynamic escalation when sensitive contexts are detected.
- **Overstep detection:** measure policy drift and surface it before harm occurs.
