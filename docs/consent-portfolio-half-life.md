# Consent Portfolio Theory: Half-Lives and Phase Transitions

## Plain-Language Math (Minimal)

### 1) Consent fuel that decays
Let each consent shard have a fuel level that decays over time:

```
C_i(t) = C_i(0) * 2^(-t / T_half_i)
```

- `C_i(t)` is the remaining consent fuel for shard *i* at time `t`.
- `T_half_i` is the shard’s half-life (how quickly that consent fades).

### 2) Phase alignment (context fit)
When the system wants to act, it must be in-phase with the intent context:

```
Phi_i = cos(Δθ_i)
```

- `Δθ_i` is the mismatch between the current context and the consent’s intended context.
- `Phi_i` ranges from `-1` to `1`, where `1` means perfect alignment.

### 3) Action viability
An action is allowed only if the *effective* consent fuel is high enough:

```
C_eff = Σ (C_i(t) * max(Phi_i, 0))
```

```
Allow action if C_eff >= Threshold_action
```

- Only positive alignment counts (negative alignment zeroes out that shard).
- The threshold is task-specific and can scale with sensitivity.

### 4) Revocation as phase transition
Revocation is not a simple flip; it changes the state space:

```
If revoke(i): C_i(t) -> 0 and T_half_i -> 0
```

This makes the shard non-revivable without fresh consent.

### 5) Metabolic accountability
The system burns consent fuel proportional to its computational cost:

```
C_burn = k * Cost_action
```

If `C_eff - C_burn < 0`, the system must pause, seek renewal, or degrade.

---

## Why This Helps
- **No hoarding:** consent fuel decays automatically.
- **Contextual integrity:** phase alignment blocks cross-context reuse.
- **Soft boundaries:** half-life models “maybe/sometimes” instead of binary gates.
- **Hard revocation:** phase transition makes certain actions impossible without re-consent.
