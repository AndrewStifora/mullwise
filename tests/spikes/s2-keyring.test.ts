// Spike S2 (issue #7, ADR-0002) as a regression check: the OS keychain via
// @napi-rs/keyring is reachable from fresh processes, including ones started with a
// stripped or empty environment. It writes one throwaway credential and always deletes it.
// Windows only for now: Linux CI runners have no Secret Service, so CI there uses the
// env-test key path instead (ADR-0002).
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { expect, it } from 'vitest';

const runner = fileURLToPath(new URL('../../spikes/s2-keyring/run.mjs', import.meta.url));

it.runIf(process.platform === 'win32')(
  'reads the vault key from full, stripped and empty environments',
  { timeout: 60_000 },
  () => {
    const result = spawnSync(process.execPath, [runner, '--json'], { encoding: 'utf8' });
    const report = JSON.parse(result.stdout) as { pass: boolean; checks: Record<string, boolean> };
    expect(report.checks).toEqual(
      Object.fromEntries(Object.keys(report.checks).map((k) => [k, true])),
    );
    expect(report.pass).toBe(true);
  },
);
