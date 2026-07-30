# Dhepil Suite - Agent Directives

**CRITICAL INSTRUCTION FOR ALL AI AGENTS (ONBOARDING):**
To understand the project context quickly **without scanning the entire project**, you MUST read these files in order:
1. `PLAYBOOK.md`: The **Single Source of Truth** for architecture, strict CoreUI boundaries, and app development rules.
2. `.ai/handoff.md`: Contains the latest status, recent changes, and current focus of the project.
3. The specific plan document for the app you are working on (if any).

Do NOT modify ANY files or plan ANY architecture before reading these documents.

---

## TL;DR Golden Rules

1. **Never write logic in Parent Components**: Files like `src/ControlCenterScreen.tsx` and `ui/CoreLayout.tsx` are dumb orchestrators. **All visual behavior and logic must be encapsulated in the leaf Child components** (e.g., `ui/card-grid/Terminal.tsx`).
2. **Engine Flat Children**: The `src/engine/children/` folder must remain completely flat. No subfolders.
3. **No Presenters**: We do not use a presenter layer. `ControlCenterScreen.tsx` maps raw engine data to generic CoreUI slots and props directly.
4. **.ai Folder Tracking**: The `.ai` folder is ONLY used for transient session tracking (`implementation_plan.md` and `handoff.md`). Do NOT store long-term architecture docs here. When finishing a task, update the handoff document.
5. **Creating New Apps**: To add an app, create a folder in `apps/<id>/`, add `app.manifest.json` and a `package.json` with a `dev` script. It will be discovered automatically.
6. **Ant Design (AntD) Required**: Any agent creating a new app or modifying UI components MUST actively use Ant Design 6 (AntD). Do not invent custom UI components from scratch if AntD already provides a suitable base component.

## Commands (run from root, in order)

```bash
npm run format:check     # Prettier
npm run lint             # ESLint
npm run typecheck        # TypeScript
npm run test             # Vitest
npm run build            # Vite build
npx --yes antd lint src --format json
```

_For detailed explanations of these rules, architecture, and diagrams, read `PLAYBOOK.md`._
