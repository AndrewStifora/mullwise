// Spike S2 (issue #7): can every Mullwise process reach the OS keychain through
// @napi-rs/keyring, including processes started with a stripped environment (as an
// MCP host may do), and how long does it take?
//
//   node spikes/s2-keyring/run.mjs [--json]
//
// Writes one throwaway credential (service "mullwise-spike-s2", random account),
// reads it back from other processes, deletes it, and verifies it's gone.
import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const probe = fileURLToPath(new URL('probe.mjs', import.meta.url));
const account = `probe-${randomUUID()}`;
const json = process.argv.includes('--json');

const nodeDir = dirname(process.execPath);
const envs = {
  full: process.env,
  // What a host that passes only essentials would leave.
  stripped:
    process.platform === 'win32'
      ? {
          SystemRoot: process.env.SystemRoot,
          windir: process.env.windir,
          SystemDrive: process.env.SystemDrive,
          PATH: nodeDir,
        }
      : {
          PATH: nodeDir,
          HOME: process.env.HOME,
          DBUS_SESSION_BUS_ADDRESS: process.env.DBUS_SESSION_BUS_ADDRESS,
        },
  empty: {},
};

function call(op, envName) {
  const env = Object.fromEntries(Object.entries(envs[envName]).filter(([, v]) => v !== undefined));
  const r = spawnSync(process.execPath, [probe, op, account], { env, encoding: 'utf8' });
  const line = (r.stdout ?? '').trim().split('\n').pop();
  try {
    return { env: envName, ...JSON.parse(line) };
  } catch {
    return { env: envName, op, ok: false, exit: r.status, error: (r.stderr ?? '').slice(0, 200) };
  }
}

const steps = [];
try {
  steps.push(call('set', 'full'));
  steps.push(call('get', 'full'));
  steps.push(call('get', 'stripped'));
  steps.push(call('get', 'empty'));
} finally {
  steps.push(call('delete', 'full')); // always clean up
}
steps.push(call('get', 'full')); // must be gone

const written = steps[0].secretSha;
const report = {
  platform: `${process.platform}-${process.arch}`,
  node: process.version,
  steps,
  checks: {
    setWorks: steps[0].ok === true,
    readBackFromNewProcess: steps[1].ok && steps[1].secretSha === written,
    readFromStrippedEnv: steps[2].ok && steps[2].secretSha === written,
    readFromEmptyEnv: steps[3].ok && steps[3].secretSha === written,
    deleteWorks: steps[4].ok === true,
    goneAfterDelete: steps[5].ok === true && steps[5].found === false,
  },
};
report.pass = Object.values(report.checks).every(Boolean);
console.log(json ? JSON.stringify(report) : JSON.stringify(report, null, 2));
process.exit(report.pass ? 0 : 1);
