# Tampermonyet

Clean Dhepil Suite app for hosting local Tampermonkey `@require` modules.

Current scope is intentionally small:

- Vite/React/Ant Design scaffold.
- Stable Dhepil Suite port.
- `public/health.json` host check.
- Empty `public/require/` migration boundary.

Legacy source is retained under `tampermonkey/` inside this app as a reference-only archive. The
archive is not imported or served by the app and is excluded from root lint, test, and format
validation. Modules will move into `public/require/` through explicit follow-up slices.

## Commands

```powershell
npm run typecheck --workspace @dhepil-suite/tampermonyet
npm run test --workspace @dhepil-suite/tampermonyet
npm run build --workspace @dhepil-suite/tampermonyet
```
