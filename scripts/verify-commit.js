const fs = require('fs');
const path = require('path');
const pico = require('picocolors');

const msgPath = path.resolve('.git/COMMIT_EDITMSG');
const msg = fs.readFileSync(msgPath, 'utf-8').trim();

const commitRE =
  /^(Release v)|(Merge.*branch)|((revert: )?(feat|fix|docs|dx|style|refactor|perf|test|workflow|build|ci|chore|types|wip|release|version)(\(.+\))?: .+)/;

if (!commitRE.test(msg)) {
  console.error(
    `\n  ${pico.white(pico.bgRed(' ERROR '))} ${pico.red(
      `invalid commit message format.`
    )}\n\n` +
      pico.red(
        `  Proper commit message format is required for automated changelog generation. Examples:\n\n`
      ) +
      `    ${pico.green(`feat(avformat): add 'IMp4Format' feature`)}\n` +
      `    ${pico.green(
        `fix(avcodec): when stop reset subTaskId and subtitleTaskId (close #00)`
      )}\n\n` +
      pico.red(`  See .github/commit-convention.md for more details.\n`)
  );
  process.exit(1);
}
