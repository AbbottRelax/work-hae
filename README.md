# AD Login Assistant — Conceptual AI Agent Demo (Mock)

This is a **static PWA** you can host on GitHub Pages to demonstrate a future-state guided experience for **AD-related access recovery**.

## What this demo covers (scope)
- Password reset (requires OTP validation) — then simulates reset completion.
- Account unlock (requires OTP validation) — then either:
  - Self-unlock (simulated), OR
  - Creates a ticket for approval (simulated).
- Triage entry: user says “I can’t login” → agent scopes to AD password/unlock → validates identity → *pretends to check* and identifies **account locked**.

## Key behaviour
- Two-tier validation (concept): Staff ID (5–7 digits) + Mobile (8 digits) → OTP (6 digits).
- Deterministic unlock branching:
  - Staff ID ending with an **even digit** → self-unlock eligible
  - Ending with an **odd digit** → approval required (ticket)

## What this demo is NOT
- No real AD checks, no real password changes, no real SMS.
- No ServiceNow integration.

Generated on: 2026-05-10T10:40:33.823512Z
