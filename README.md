# Password Reset Assistant — Conceptual AI Agent Demo (Mock)

This is a **static PWA** you can run from a laptop or host as a static site to demonstrate a future-state “AI-assisted” experience for **Password Reset**, without any real system execution.

## What this demo is
- A **decision-aware assistant** that guides users through an existing password reset workflow.
- Simulates **2-tier validation** for self-service: 
  1) Staff ID (5–8 digits) + Mobile (8 digits) 
  2) OTP (6 digits)
- Includes an **Audit Trail panel** to demonstrate **Explainable / Traceable / Auditable** behaviour.
- Provides a **simulated ServiceNow handoff** (generates a fake ticket number).

## What this demo is NOT
- No real password reset, no real identity checks, no ServiceNow integration.
- No real SMS delivery. The OTP is shown in the **Audit Trail** for demo only.
- No approval bypass, no autonomous actions.

## How to run (offline / on laptop)
1. Unzip the folder.
2. Start a simple local web server in the folder, e.g.
   `python -m http.server 8000`
3. Open `http://localhost:8000` in a browser.

## Presenter tips
- Keep “Show AI Agent language” OFF for cautious stakeholders.
- Turn it ON only when explaining the conceptual future-state.
- Use **Export Transcript** to show governance / audit outputs.

Generated on: 2026-05-10T10:11:18.269095Z
