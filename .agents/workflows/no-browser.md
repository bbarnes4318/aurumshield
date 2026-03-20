---
description: NEVER open the browser. This is a deployed server application, not a local app.
---

# ABSOLUTE RULE: NO BROWSER

**NEVER use the browser_subagent tool on this project. EVER.**

- This application is deployed on a remote server (AWS ECS).
- It is NOT a local development app you can test in a browser.
- Do NOT open localhost URLs.
- Do NOT take screenshots.
- Do NOT attempt to verify UI changes via the browser.

Just read the code, fix the code, and verify via code review and build checks.
