# AGENT RULES — READ BEFORE MAKING CHANGES

This repository is deployed on Render and must always build successfully in production.

## Build Safety (Critical)
- Do NOT break the Render build.
- All changes must pass:
  - `npm install`
  - `npm run build`
  - `npm start`
- Do not introduce TypeScript build errors.
- Avoid unused variables/imports. Remove them before final output.
- Do not change build output paths or static serving logic.
- The server expects the frontend build output in `client/dist`.
- Do not commit build artifacts (`dist/`, `build/`) — respect `.gitignore`.

## Project Structure
- Backend: Node + Express (`server.js`)
- Frontend: Vite + React + TypeScript (`client/`)
- Deployment: Render (single service, frontend served by backend)

## Code Style & Constraints
- Make incremental, minimal changes.
- Do not rewrite unrelated parts of the app.
- Prefer small, focused commits.
- Use existing APIs where possible.
- Keep UI consistent with the existing design system.

## Squad Builder Rules
- The squad is limited to 15 players.
- Lineup consists of:
  - Starting XI (11)
  - Bench (4)
- Always enforce:
  - Exactly 1 GK in the XI
  - Formation-based DEF/MID/FWD counts
  - No duplicate players across XI/bench/unassigned

## UX Expectations
- Drag & drop must feel smooth and predictable.
- Invalid actions should fail gracefully with a clear message.
- Avoid unnecessary re-renders during hover or drag interactions.
- Cache data where reasonable to avoid repeated API calls.

## When Unsure
- Ask for clarification instead of guessing.
- If a change risks breaking the build, choose the safer option.
