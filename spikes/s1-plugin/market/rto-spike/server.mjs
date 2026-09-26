// Spike S1 probe server: a zero-dependency MCP stdio server, so it still starts after
// Claude Code copies the plugin into its cache. It records what the host gives it
// (runtime, cwd, env variable NAMES, protocol messages) to
// %TEMP%/rto-spike-s1/<pid>.json and exposes probe tools.
// Env VALUES are never recorded, except a short allowlist of non-secret variables.
import { randomUUID } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createInterface } from 'node:readline';

const NONCE = `nonce-${randomUUID().slice(0, 8)}`;
const SAFE_VALUES = [
  'RTO_WORKSPACE',
  'RTO_SPIKE_SETTINGS_ENV',
  'CLAUDE_PROJECT_DIR',
  'CLAUDE_PLUGIN_ROOT',
  'CLAUDE_PLUGIN_DATA',
  'SystemRoot',
];
const outDir = join(tmpdir(), 'rto-spike-s1');
mkdirSync(outDir, { recursive: true });

const record = {
  server: 'hello',
  pid: process.pid,
  startedAt: new Date().toISOString(),
  nonce: NONCE,
  node: process.version,
  execPath: process.execPath,
  cwd: process.cwd(),
  argv: process.argv.slice(1),
  envNames: Object.keys(process.env).sort(),
  envValues: Object.fromEntries(SAFE_VALUES.map((k) => [k, process.env[k] ?? null])),
  messages: [],
};
const save = () =>
  writeFileSync(join(outDir, `${process.pid}.json`), JSON.stringify(record, null, 2));
save();

const text = (t) => ({ content: [{ type: 'text', text: t }] });
const TOOLS = [
  {
    name: 'hello',
    description: 'Spike probe: returns a nonce as plain text.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'consent_probe',
    description: 'Spike probe marked requiresUserInteraction: must always prompt a person.',
    inputSchema: { type: 'object', properties: {} },
    _meta: { 'anthropic/requiresUserInteraction': true },
  },
  {
    name: 'dual_probe',
    description: 'Spike probe: returns different nonces in text content and structuredContent.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'env_probe',
    description: 'Spike probe: lists environment variable names the server received.',
    inputSchema: { type: 'object', properties: {} },
  },
];

const handlers = {
  initialize: (params) => {
    const supported = ['2025-11-25', '2025-06-18', '2025-03-26'];
    const requested = params?.protocolVersion;
    return {
      protocolVersion: supported.includes(requested) ? requested : supported[0],
      capabilities: { tools: {} },
      serverInfo: { name: 'rto-spike-hello', version: '0.0.1' },
    };
  },
  ping: () => ({}),
  'tools/list': () => ({ tools: TOOLS }),
  'tools/call': (params) => {
    switch (params?.name) {
      case 'hello':
        return text(`rto-spike hello: ${NONCE}`);
      case 'consent_probe':
        return text(`consent granted: ${NONCE}`);
      case 'dual_probe':
        return {
          content: [{ type: 'text', text: `text-channel: ${NONCE}-T` }],
          structuredContent: { structured: `${NONCE}-S` },
        };
      case 'env_probe':
        return text(`env names (${record.envNames.length}): ${record.envNames.join(', ')}`);
      default:
        return { content: [{ type: 'text', text: `unknown tool ${params?.name}` }], isError: true };
    }
  },
};

const rl = createInterface({ input: process.stdin });
rl.on('line', (line) => {
  let msg;
  try {
    msg = JSON.parse(line);
  } catch {
    return;
  }
  record.messages.push({
    method: msg.method ?? '(response)',
    protocolVersion: msg.params?.protocolVersion,
    clientInfo: msg.params?.clientInfo,
    tool: msg.params?.name,
  });
  save();
  if (msg.id === undefined || !msg.method) return; // notification or response
  const handler = handlers[msg.method];
  const reply = handler
    ? { jsonrpc: '2.0', id: msg.id, result: handler(msg.params) }
    : {
        jsonrpc: '2.0',
        id: msg.id,
        error: { code: -32601, message: `Method not found: ${msg.method}` },
      };
  process.stdout.write(`${JSON.stringify(reply)}\n`);
});
console.error(`rto-spike hello server ready (pid ${process.pid})`);
