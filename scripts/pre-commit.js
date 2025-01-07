const { execSync, spawnSync } = require('child_process');

const modifiedList = execSync('git diff --cached --name-only --diff-filter=ACMR')
  .toString()
  .trim()
  .split('\n')
  .filter(file => {
    return /^src\/\S*\.[j|t]s$/.test(file)
  })

const result = spawnSync(
  'node',
  [
    './node_modules/eslint/bin/eslint.js',
    ...modifiedList,
    '-c=./eslint/typescript.js',
    '--rulesdir=./eslint/rules',
    '--ignore-path=./.eslintignore'
  ],
  {
    stdio: 'inherit'
  }
)

process.exit(result.status)