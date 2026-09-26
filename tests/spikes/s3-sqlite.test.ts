// Spike S3 (issue #7, ADR-0001) as a regression check on every CI OS: several
// processes append to one WAL database while a maintainer bumps the epoch, and a
// writer is killed while holding the write lock.
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { expect, it } from 'vitest';

const runner = fileURLToPath(new URL('../../spikes/s3-sqlite/run.mjs', import.meta.url));

it('keeps multi-process appends lossless, contiguous and crash-safe', { timeout: 120_000 }, () => {
  const result = spawnSync(
    process.execPath,
    [runner, '--writers', '2', '--events', '400', '--rounds', '15', '--crash', '--json'],
    { encoding: 'utf8' },
  );
  const report = JSON.parse(result.stdout) as {
    pass: boolean;
    busyErrorsSurfaced: number;
    checks: Record<string, boolean>;
  };
  expect(report.checks).toEqual(
    Object.fromEntries(Object.keys(report.checks).map((k) => [k, true])),
  );
  expect(report.busyErrorsSurfaced).toBe(0);
  expect(report.pass).toBe(true);
});
