# P00 Probe Measurement

Fixture: 20 valid direct-child apps (`fixture-01` through `fixture-20`). No production app or source changed. Ports are allocated by the existing `ProjectManager` and temporary fixture state is removed after the test.

Measurement command:

```text
npx vitest run test/evidence/p00-probe-measurement.test.ts --reporter=verbose
```

Observed baseline (2026-07-23): `P00 probe fixture: 20 apps, list 20.23 ms`. The test asserts exactly 20 returned projects and 20 unique ports. No cache or behavior change is introduced.

Interpretation: this is a characterization measurement only. No performance threshold was specified in P00; probe caching remains deferred.
