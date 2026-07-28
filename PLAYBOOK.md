# Dhepil Suite — Playbook

Self-contained reference for adding a new app or new root feature without breaking the existing system.

---

## Adding a New App

### 1. Create the folder

```
apps/<your-app-id>/
├── app.manifest.json
└── package.json
```

Rules:
- `<your-app-id>` must match `[a-z0-9-]` exactly
- No symlinks, no nested folders — direct child of `apps/` only

### 2. Write `app.manifest.json`

```json
{
  "schemaVersion": 1,
  "id": "your-app-id",
  "name": "Human Readable Name",
  "runtime": "vite"
}
```

Optional fields: `description`, `desktop.enabled`, `desktop.script`.

### 3. Write `package.json`

Must have a `dev` script that accepts Vite flags:

```json
{
  "scripts": {
    "dev": "vite"
  }
}
```

The root always spawns:
```
npm run dev -- --host 127.0.0.1 --port <locked-port> --strictPort
```

### 4. That's it

On the next poll the card appears automatically. The root assigns a port from `2000–2999` and writes it to `config/app-ports.lock.json`. That port is permanent — never edit the lock file manually.

**Never:** import from the root or another app. Each app is fully isolated.

---

## Adding a New Extension (plug-and-play logic)

Extensions add actions to the control center without touching any existing file.

### 1. Create the module folder

```
src/features/control-center/application/extensions/modules/<name>/
└── index.ts
```

### 2. Write `index.ts`

```ts
import type { ControlCenterExtension } from '../../contracts';

const myExtension: ControlCenterExtension = {
  schemaVersion: 1,
  id: 'my-extension',
  actions: {
    async 'project.my-action'(context, payload) {
      // context gives you: quickKill, refresh, startAndOpen, stop
    },
  },
};

export default myExtension;
```

The loader (`loadExtensions.ts`) picks it up via `import.meta.glob` — no registration needed.

### 3. Expose the action ID in a definition file if it needs a UI button

Add the action to the relevant definition file in `ui/<area>/<area>Definition.ts`. The dispatcher reconciles against `availableActionIds` — a missing handler produces a disabled state, not a crash.

---

## Adding a New UI Area

Follow the layer contract strictly — the ESLint boundary rules will reject violations at lint time.

| Layer | Owns | Must not |
|---|---|---|
| `ui/<area>/` | Markup, local CSS, definition files | fetch, window.open, poll, filter, sort |
| `application/commands/` | One user action per file | touch React or antd |
| `application/presenters/` | Domain state → view model | call HTTP or spawn |
| `application/ports/` | Adapter interfaces | contain implementations |
| `data/` | HTTP + browser adapters | import from `ui/` |
| `domain/` | Pure policy, no React | import anything from above |
| `screens/ControlCenterScreen.tsx` | Controller output → layout | import anything except `controller/` and `ui/layout/` |

When adding a real import edge:
1. Add the rule to `tooling/eslint/controlCenterBoundaryConfigs.ts`
2. Add a fixture case to `test/architecture/import-boundary.test.ts`
3. Never relax an existing rule — move the code to the correct layer instead

---

## Adding a New Script Module

Module dependency order is one-way and must be preserved:

```
project-contracts  (types only)
       ↓
project-discovery / project-port-registry / project-process
       ↓
project-manager  (orchestrator + Vite middleware)
```

- Discovery must not spawn processes
- Port registry must not know about React or HTTP middleware
- Process module must not choose ports
- Nothing in `scripts/` may import from `src/`

---

## Build Gate

Run these in order before committing — all must be green:

```bash
npm run format:check
npm run lint
npm run typecheck
npm run test
npm run build
npx --yes antd lint src --format json
```

Single test:
```bash
npx vitest run src/path/to/file.test.ts
npx vitest run -t 'test name'
```

Note: the architecture boundary test (`test/architecture/import-boundary.test.ts`) is slow on WSL `/mnt/c` — it passes but may time out at the default 5s. Run with `--testTimeout=60000` if it fails on time.

---

## Layout Tokens

All layout values live in one place:

```
src/features/control-center/ui/layout/layoutTokens.css
```

Key tokens:
- `--layout-grid-card-min-width` — minimum card width before the grid reflows (default `320px`)
- `--layout-inline-gutter` — horizontal padding on both sides of the workspace
- `--layout-max-width` — workspace max width (currently `100%` — full window)

One breakpoint remains at `900px` for toolbar reflow. No mobile/tablet breakpoints — the layout is PC-first and fluid.

---

## Port Rules

- Root is always `1999` — never allocate this to an app
- App range: `2000–2999`
- Ports are locked once in `config/app-ports.lock.json` and never auto-reassigned
- If a port is in use by something else: card shows `port-conflict`, Start is disabled
- Deleting an app folder does not remove its port assignment (intentional — restore the folder and the same port comes back)
