import { RELEASE_USAGE, parseReleaseCliArgs } from './appReleaseCli.ts';
import {
  createWorkspaceReleasePlans,
  executeWorkspaceReleases,
  type PlannedWorkspaceRelease,
} from './appReleaseService.ts';
import { resolveRepositoryRoot } from './appReleaseGit.ts';

function describePlan(release: PlannedWorkspaceRelease): string {
  const { app, plan } = release;

  if (plan.kind === 'skip') {
    return `${app.id}: skip (tidak ada commit yang membutuhkan release)`;
  }

  if (plan.kind === 'bootstrap') {
    return `${app.id}: bootstrap v${plan.nextVersion} -> ${plan.tagName}`;
  }

  return `${app.id}: ${plan.currentVersion} -> ${plan.nextVersion} (${plan.bump}) -> ${plan.tagName}`;
}

async function main(): Promise<void> {
  const options = parseReleaseCliArgs(process.argv.slice(2));

  if (options.help) {
    console.log(RELEASE_USAGE);
    return;
  }

  const repoRoot = await resolveRepositoryRoot(process.cwd());
  const plans = await createWorkspaceReleasePlans(repoRoot, {
    mode: options.mode,
    appId: options.appId,
    includeElectron: options.includeElectron,
  });

  console.log(options.dryRun ? 'Automatic release plan (dry-run):' : 'Automatic release plan:');
  for (const plan of plans) {
    console.log(`- ${describePlan(plan)}`);
  }

  if (options.dryRun) {
    console.log('Dry-run selesai; tidak ada file, commit, atau tag yang diubah.');
    return;
  }

  const result = await executeWorkspaceReleases(repoRoot, plans);
  if (result.tags.length === 0) {
    console.log('Tidak ada app yang perlu dirilis.');
    return;
  }

  console.log(`Release lokal selesai: ${result.tags.join(', ')}.`);
  console.log(
    result.committed
      ? 'Release commit dibuat.'
      : 'Tidak perlu release commit (bootstrap tag saja).',
  );
  console.log('Tidak ada push atau build Electron yang dijalankan.');
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
