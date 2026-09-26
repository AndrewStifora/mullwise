// pre-commit: scan staged changes for secrets with gitleaks when it is installed.
// CI always runs gitleaks, so a missing local binary only warns.
import { spawnSync } from 'node:child_process';

const probe = spawnSync('gitleaks', ['version'], { encoding: 'utf8' });
if (probe.error) {
  console.warn(
    '⚠ gitleaks is not installed, so the local secret scan was skipped (CI still runs it).\n' +
      '  Install it with: winget install Gitleaks.Gitleaks',
  );
  process.exit(0);
}

const scan = spawnSync('gitleaks', ['git', '--pre-commit', '--staged', '--redact', '--no-banner'], {
  stdio: 'inherit',
});
process.exit(scan.status ?? 1);
