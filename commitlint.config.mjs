// Conventional Commits (CONTRIBUTING §3), plus `sec` for security fixes.
export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      ['feat', 'fix', 'sec', 'test', 'docs', 'chore', 'refactor', 'perf', 'ci', 'build', 'revert'],
    ],
  },
};
