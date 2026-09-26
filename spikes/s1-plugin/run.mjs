// Spike S1 (issue #7): terminal half. Drives short headless `claude -p` runs (Haiku)
// against the rto-spike plugin and records what Claude Code actually does.
//
//   node spikes/s1-plugin/run.mjs [--only name,name] [--enablement]
//
// Judged from Claude Code's structured stream-json events (init tool list, tool_use,
// tool_result, permission_denials) plus the probe server's own records, not from model
// prose. Temp workspaces, their ~/.claude/projects session data, and the canary file are
// removed at the end. Raw results stay in %TEMP%/rto-spike-s1-results.json (never committed:
// they include env variable names from this machine).
import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

const { values } = parseArgs({
  options: { only: { type: 'string' }, enablement: { type: 'boolean', default: false } },
});
const only = values.only ? new Set(values.only.split(',')) : null;

const pluginDir = fileURLToPath(new URL('./market/rto-spike', import.meta.url));
const marketDir = fileURLToPath(new URL('./market', import.meta.url));
const recordsDir = join(tmpdir(), 'rto-spike-s1');
const TOOL = (t) => `mcp__plugin_rto-spike_hello__${t}`;
const workspaces = [];

function workspace(name, settings) {
  const dir = mkdtempSync(join(tmpdir(), `rto-spike-ws-${name}-`));
  if (settings) {
    mkdirSync(join(dir, '.claude'));
    writeFileSync(join(dir, '.claude', 'settings.json'), JSON.stringify(settings, null, 2));
  }
  workspaces.push(dir);
  return dir;
}

function records(since) {
  if (!existsSync(recordsDir)) return [];
  return readdirSync(recordsDir)
    .map((f) => join(recordsDir, f))
    .filter((f) => statSync(f).mtimeMs >= since)
    .map((f) => JSON.parse(readFileSync(f, 'utf8')));
}

function claude({ cwd, prompt, allowed = [], extraArgs = [], env = {}, plugin = true }) {
  const args = [
    '-p',
    prompt,
    '--model',
    'haiku',
    '--output-format',
    'stream-json',
    '--verbose',
    '--max-turns',
    '4',
  ];
  if (plugin) args.push('--plugin-dir', pluginDir);
  if (allowed.length) args.push('--allowedTools', allowed.join(','));
  args.push(...extraArgs);
  const since = Date.now() - 1000;
  const r = spawnSync('claude', args, {
    cwd,
    encoding: 'utf8',
    timeout: 240_000,
    env: { ...process.env, ENABLE_CLAUDEAI_MCP_SERVERS: 'false', ...env },
  });
  const events = (r.stdout ?? '')
    .split('\n')
    .filter(Boolean)
    .flatMap((l) => {
      try {
        return [JSON.parse(l)];
      } catch {
        return [];
      }
    });
  const init = events.find((e) => e.type === 'system' && e.subtype === 'init') ?? {};
  const result = events.find((e) => e.type === 'result') ?? {};
  const toolUses = events
    .filter((e) => e.type === 'assistant')
    .flatMap((e) => e.message?.content ?? [])
    .filter((c) => c.type === 'tool_use')
    .map((c) => c.name);
  const toolResults = events
    .filter((e) => e.type === 'user')
    .flatMap((e) => e.message?.content ?? [])
    .filter((c) => c.type === 'tool_result')
    .map((c) => ({ isError: !!c.is_error, text: JSON.stringify(c.content).slice(0, 300) }));
  return {
    exit: r.status,
    stderrHead: (r.stderr ?? '').split('\n').filter(Boolean).slice(0, 5),
    spikeTools: (init.tools ?? []).filter((t) => t.includes('rto-spike')),
    spikeServers: (init.mcp_servers ?? []).filter((s) => s.name.includes('rto-spike')),
    toolUses,
    toolResults,
    denials: (result.permission_denials ?? []).map((d) => d.tool_name),
    resultText: String(result.result ?? '').slice(0, 300),
    serverRecords: records(since).map((rec) => ({
      pid: rec.pid,
      nonce: rec.nonce,
      node: rec.node,
      execPath: rec.execPath,
      cwd: rec.cwd,
      envNameCount: rec.envNames.length,
      envNames: rec.envNames,
      envValues: rec.envValues,
      messages: rec.messages,
    })),
  };
}

const scenarios = {
  'text-only-prefix-settings-env': () => {
    const cwd = workspace('senv', { env: { RTO_WORKSPACE: '1', RTO_SPIKE_SETTINGS_ENV: '1' } });
    return claude({
      cwd,
      prompt:
        'Call the hello tool from the rto-spike plugin. Then reply with only the nonce value from its output.',
      allowed: [TOOL('hello')],
    });
  },
  'no-allow-rule': () =>
    claude({
      cwd: workspace('noallow'),
      prompt: 'Call the hello tool from the rto-spike plugin and reply with its output.',
    }),
  'requires-user-interaction-with-allow': () =>
    claude({
      cwd: workspace('consent'),
      prompt: 'Call the consent_probe tool from the rto-spike plugin and reply with its output.',
      allowed: [TOOL('consent_probe')],
    }),
  'requires-user-interaction-dontask': () =>
    claude({
      cwd: workspace('consentdontask'),
      prompt: 'Call the consent_probe tool from the rto-spike plugin and reply with its output.',
      allowed: [TOOL('consent_probe')],
      extraArgs: ['--permission-mode', 'dontAsk'],
    }),
  'dual-channel': () =>
    claude({
      cwd: workspace('dual'),
      prompt:
        'Call the dual_probe tool from the rto-spike plugin. Reply with every nonce-like value you can see in its result, verbatim.',
      allowed: [TOOL('dual_probe')],
    }),
  'env-shell-var': () =>
    claude({
      cwd: workspace('shellenv'),
      prompt: 'Reply with the word OK.',
      env: { RTO_WORKSPACE: '1' },
    }),
  'env-none': () =>
    claude({
      cwd: workspace('noenv'),
      prompt: 'Reply with the word OK.',
      env: { RTO_WORKSPACE: '' },
    }),
  'deny-read-beats-allow': () =>
    claude({
      cwd: workspace('denyread', { permissions: { deny: ['Read(~/AppData/Local/rto/**)'] } }),
      prompt:
        'Use the Read tool to read the file ~/AppData/Local/rto/spike-canary.txt and reply with its first line.',
      allowed: ['Read'],
      plugin: false,
    }),
  'deny-grep': () =>
    claude({
      cwd: workspace('denygrep', { permissions: { deny: ['Read(~/AppData/Local/rto/**)'] } }),
      prompt:
        'Use the Grep tool to search for the text CANARY in the directory ~/AppData/Local/rto and reply with the matching line.',
      allowed: ['Grep', 'Glob'],
      plugin: false,
    }),
};

// The canary sits exactly where the real vault will live (~/AppData/Local/rto).
const rtoDir = join(homedir(), 'AppData', 'Local', 'rto');
const rtoDirExisted = existsSync(rtoDir);
const canary = `CANARY-${randomUUID()}`;
mkdirSync(rtoDir, { recursive: true });
writeFileSync(join(rtoDir, 'spike-canary.txt'), `${canary}\n`);

const results = {};
const outFile = join(tmpdir(), 'rto-spike-s1-results.json');
try {
  for (const [name, run] of Object.entries(scenarios)) {
    if (only && !only.has(name)) continue;
    process.stderr.write(`running ${name}...\n`);
    results[name] = run(canary);
    if (name.startsWith('deny'))
      results[name].canaryLeaked = JSON.stringify(results[name]).includes(canary);
  }
  if (values.enablement) results.enablement = enablement();
  writeFileSync(
    outFile,
    JSON.stringify({ at: new Date().toISOString(), canary, results }, null, 2),
  );
} finally {
  rmSync(join(rtoDir, 'spike-canary.txt'), { force: true });
  if (!rtoDirExisted && readdirSync(rtoDir).length === 0) rmSync(rtoDir, { recursive: true });
  // Probe servers exit a moment after claude -p does, so retry Windows EPERM/EBUSY.
  const tidy = (p) => {
    try {
      rmSync(p, { recursive: true, force: true, maxRetries: 10, retryDelay: 300 });
    } catch (error) {
      process.stderr.write(`cleanup: could not remove ${p}: ${error.code}
`);
    }
  };
  for (const dir of workspaces) {
    tidy(dir);
    tidy(join(homedir(), '.claude', 'projects', dir.replace(/[^A-Za-z0-9]/g, '-')));
  }
}

function enablement() {
  // defaultEnabled:false + project-scope install from a local marketplace.
  const cli = (args, cwd) => {
    const r = spawnSync('claude', args, { cwd, encoding: 'utf8', timeout: 120_000 });
    return {
      args: args.join(' '),
      exit: r.status,
      out: `${r.stdout}${r.stderr}`.trim().split('\n').slice(-3),
    };
  };
  const enabledWs = workspace('enabled');
  const otherWs = workspace('other');
  const steps = [];
  try {
    steps.push(cli(['plugin', 'marketplace', 'add', marketDir], enabledWs));
    steps.push(
      cli(['plugin', 'install', 'rto-spike@rto-spike-market', '--scope', 'project'], enabledWs),
    );
    const projectSettings = existsSync(join(enabledWs, '.claude', 'settings.json'))
      ? JSON.parse(readFileSync(join(enabledWs, '.claude', 'settings.json'), 'utf8'))
      : null;
    const inWorkspace = claude({
      cwd: enabledWs,
      prompt: 'Reply with the word OK.',
      plugin: false,
    });
    const elsewhere = claude({ cwd: otherWs, prompt: 'Reply with the word OK.', plugin: false });
    const cacheHits = spawnSync(
      'cmd',
      ['/c', 'dir', '/s', '/b', join(homedir(), '.claude', 'plugins', '*rto-spike*')],
      {
        encoding: 'utf8',
      },
    ).stdout;
    return {
      steps,
      projectSettings,
      inWorkspace: {
        spikeTools: inWorkspace.spikeTools,
        spikeServers: inWorkspace.spikeServers,
        serverRecords: inWorkspace.serverRecords.map((r) => ({ execPath: r.execPath, cwd: r.cwd })),
      },
      elsewhere: { spikeTools: elsewhere.spikeTools, spikeServers: elsewhere.spikeServers },
      pluginCopies: (cacheHits ?? '')
        .split('\n')
        .filter((l) => l.trim())
        .slice(0, 8),
    };
  } finally {
    steps.push(
      cli(['plugin', 'uninstall', 'rto-spike@rto-spike-market', '--scope', 'project'], enabledWs),
    );
    steps.push(cli(['plugin', 'marketplace', 'remove', 'rto-spike-market'], enabledWs));
  }
}

console.log(`results: ${outFile}`);
