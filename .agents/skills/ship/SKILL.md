---
name: ship
description: >-
  Automates checking Git status, staging changes, generating a conventional commit message,
  and pushing code to GitHub. Activate this skill whenever the user says "ship", "ship it",
  "push to github", "ship changes", or asks to sync/push their code to version control.
---

# Ship Workflow

This skill automates shipping changes to GitHub with safety checks and clean commit messages.

## Execution Steps

Whenever invoked via "ship" or related requests:

1. **Check Status**:
   Run `git status -s` to review modified, added, or untracked files.
   If working tree is already clean, notify the user that there are no new changes to ship.

2. **Security & Cleanliness Check**:
   - Ensure no secrets, `.env` files, or large generated folders (`node_modules`, `uploads/`) are being staged.
   - Verify `.gitignore` is intact.

3. **Stage Changes**:
   Run `git add .`

4. **Generate Commit Message**:
   - Formulate a clear, conventional commit message based on the recent changes (e.g., `feat: ...`, `fix: ...`, `refactor: ...`).
   - If the user specified a custom message with their request (e.g. `ship "fixed login issue"`), use that message.

5. **Commit**:
   Run:
   ```powershell
   git commit -m "<Commit Message>"
   ```

6. **Push to Remote**:
   Detect current branch (usually `main`) and push:
   ```powershell
   git push origin main
   ```

7. **Verify & Confirm**:
   Verify the push succeeded by running `git status`. Report the commit message and push status clearly to the user.
