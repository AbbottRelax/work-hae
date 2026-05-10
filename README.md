# Password Reset Assistant — Conceptual AI Agent Demo (Mock)

This is a **static PWA** you can host as a static site (e.g., GitHub Pages) to demonstrate a future-state “AI-assisted” experience for **Password Reset**, without any real system execution.

## What this demo shows
- **Self-service reset** (concept) with **2-tier validation**:
  1) Staff ID (**5–7 digits**) + Mobile (**8 digits**) — 1st tier
  2) OTP (**6 digits**) — 2nd tier
- Deterministic flow: Staff ID → Mobile → OTP → Shift/Approval decision.
- Audit Trail panel (Explainable / Traceable / Auditable).
- Simulated ServiceNow handoff (fake ticket number).

## What this demo is NOT
- No real password reset, no real identity checks, no ServiceNow integration.
- No real SMS delivery. OTP is shown in Audit Trail for demo only.
- No approval bypass, no autonomous actions.

## GitHub Pages note
Upload the **contents** of this folder (index.html, app.js, etc.) to your repo root. GitHub Pages will not serve a ZIP.

Generated on: 2026-05-10T10:23:27.756229Z
