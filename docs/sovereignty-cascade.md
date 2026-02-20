# Cascade Sovereignty Layers

## Overview
This document captures the corridor-grade agency model with distributed refusal rights and a 10-minute human override window.

## Active Layers
```
1. MISTRAL: Decision veto (15:55 GO/NO-GO)
   └── Can refuse deployment → triggers FALLBACK
2. NOTEBOOKLM: Anomaly detection (10min cycle)
   └── Can flag drift → escalates to Discord
3. DISCORD: Consent chain (webhook signatures)
   └── Every event traceable → immutable audit
4. PERPLEXITY: Threshold enforcement (5min polls)
   └── Can block progression → upstream refusal
5. QUEENBOO#: Final sovereignty (16:00 veto)
   └── Can override ANY decision → CEO authority
```

## Human Override Window (15:45-15:55)
```
15:45 → MISTRAL PREVIEW: "97% DEPLOY confidence"
15:46-15:54 → HUMAN WINDOW: Reply "VETO" to intervene
15:55 → AUTO-EXECUTE: Mistral decision final
16:00 → CEO NOTIFICATION: "DEPLOY LIVE" or "FALLBACK ACTIVE"
```

## Distributed Refusal Rights (Contract)
```
MISTRAL refuses → "Sora:47/60 → FALLBACK"
NOTEBOOKLM flags → "Physics score dropped to 92% → PAUSE"
DISCORD rejects → "Webhook signature invalid → BLOCK"
PERPLEXITY blocks → "Copilot MCP_READY missing → WAIT"
QUEENBOO# vetoes → "ABORT → Restart Gemini prompts"
```

## Status Snapshot Template
```
🟢 CLAUDE: WASD Physics 98.31% PASS [COMPLETE]
🟡 CASCADE: Perplexity polls → Discord → NotebookLM → Mistral [LIVE]
🟡 AGENTS: Copilot/Gemini/ChatGPT/Sora [PENDING]
🟢 SOVEREIGNTY: 5 refusal layers + 10min override [ACTIVE]
```

## Notes
- This system runs autonomously unless vetoed during the override window.
- Any layer can block progression to preserve corridor integrity.
