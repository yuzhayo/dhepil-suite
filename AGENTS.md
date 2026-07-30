# Dhepil Suite - Agent Directives

**CRITICAL INSTRUCTION FOR ALL AI AGENTS:**
You MUST read `PLAYBOOK.md` located in the root directory before modifying ANY files, planning ANY architecture, or editing this workspace. 

`PLAYBOOK.md` is the **Single Source of Truth** for the Dhepil Suite architecture, including how the Control Center Engine works and the strict CoreUI Parent-Child boundaries.

---

## TL;DR Golden Rules
1. **Never write logic in Parent Components**: Files like `src/ControlCenterScreen.tsx` and `ui/CoreLayout.tsx` are dumb orchestrators. **All visual behavior and logic must be encapsulated in the leaf Child components** (e.g., `ui/card-grid/Terminal.tsx`).
2. **Engine Flat Children**: The `src/engine/children/` folder must remain completely flat. No subfolders.
3. **No Presenters**: We do not use a presenter layer. `ControlCenterScreen.tsx` maps raw engine data to ViewModels directly.
4. **.ai Folder Tracking**: The `.ai` folder is ONLY used for transient session tracking (`implementation_plan.md` and `handoff.md`). Do NOT store long-term architecture docs here. When finishing a task, update the handoff document.
5. **Creating New Apps**: To add an app, create a folder in `apps/<id>/`, add `app.manifest.json` and a `package.json` with a `dev` script. It will be discovered automatically.

## Commands (run from root, in order)

```bash
npm run format:check     # Prettier
npm run lint             # ESLint
npm run typecheck        # TypeScript
npm run test             # Vitest
npm run build            # Vite build
npx --yes antd lint src --format json
```

*For detailed explanations of these rules, architecture, and diagrams, read `PLAYBOOK.md`.*
