// pre-push policy (CONTRIBUTING §2): no direct pushes to main, and pushed branches
// follow <type>/<issue-number>-<slug>. Git passes one line per ref on stdin:
// "<local ref> <local sha> <remote ref> <remote sha>".
import { readFileSync } from 'node:fs';

const BRANCH_PATTERN =
  /^(feat|fix|sec|test|docs|chore|refactor|perf|ci|build)\/\d+-[a-z0-9][a-z0-9-]*$/;

let input = '';
try {
  input = readFileSync(0, 'utf8');
} catch {
  // No stdin (e.g. run by hand): nothing to check.
}

const problems = [];
for (const line of input.split(/\r?\n/)) {
  const [localRef, , remoteRef] = line.trim().split(/\s+/);
  if (!localRef || !remoteRef) continue;

  if (remoteRef === 'refs/heads/main' && localRef !== '(delete)') {
    problems.push('Direct pushes to main are not allowed. Open a pull request (CONTRIBUTING §4).');
  }
  if (localRef.startsWith('refs/heads/')) {
    const branch = localRef.slice('refs/heads/'.length);
    if (branch !== 'main' && !BRANCH_PATTERN.test(branch)) {
      problems.push(
        `Branch "${branch}" must be <type>/<issue-number>-<slug>, e.g. feat/12-capture-tool (CONTRIBUTING §2).`,
      );
    }
  }
}

if (problems.length > 0) {
  for (const problem of new Set(problems)) console.error(`✖ ${problem}`);
  process.exit(1);
}
