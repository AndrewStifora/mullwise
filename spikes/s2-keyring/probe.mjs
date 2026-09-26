// Spike S2 child: one keychain operation in its own process, the way the CLI (set)
// and the MCP server (get) will use it. Never prints the secret, only its SHA-256.
//   node probe.mjs <set|get|delete> <account>
import { createHash, randomBytes } from 'node:crypto';

const [op, account] = process.argv.slice(2);
const SERVICE = 'mullwise-spike-s2';
const sha = (s) => createHash('sha256').update(s).digest('hex').slice(0, 16);

const out = { op, pid: process.pid, envKeys: Object.keys(process.env).length };
try {
  const t0 = performance.now();
  const { Entry } = await import('@napi-rs/keyring');
  out.loadMs = Number((performance.now() - t0).toFixed(1));

  const entry = new Entry(SERVICE, account);
  const t1 = performance.now();
  if (op === 'set') {
    const secret = randomBytes(32).toString('base64');
    entry.setPassword(secret);
    out.secretSha = sha(secret);
  } else if (op === 'get') {
    const secret = entry.getPassword();
    out.found = secret != null;
    if (secret != null) out.secretSha = sha(secret);
  } else if (op === 'delete') {
    out.deleted = entry.deletePassword();
  } else {
    throw new Error(`unknown op ${op}`);
  }
  out.opMs = Number((performance.now() - t1).toFixed(2));
  out.ok = true;
} catch (error) {
  out.ok = false;
  out.error = String(error?.message ?? error).slice(0, 200);
}
console.log(JSON.stringify(out));
