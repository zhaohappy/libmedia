import fs from 'fs'
import { execFileSync } from 'child_process'
import pico from 'picocolors'

const msgPath = process.argv[2] || execFileSync('git', ['rev-parse', '--git-path', 'COMMIT_EDITMSG'], { encoding: 'utf8' }).trim()
const msg = fs.readFileSync(msgPath, 'utf-8').trim()

const commitRE =
  /^(Release v)|(Merge.*branch)|((revert: )?(feat|fix|docs|dx|style|refactor|perf|test|workflow|build|ci|chore|types|wip|release|version)(\(.+\))?: .+)/

if (!commitRE.test(msg)) {
  console.error(`\n  ${pico.white(pico.bgRed(' ERROR '))} ${pico.red('invalid commit message format.')}\n\n` +
      pico.red('  Proper commit message format is required for automated changelog generation. Examples:\n\n') +
      `    ${pico.green('feat(avformat): add \'IMp4Format\' feature')}\n` +
      `    ${pico.green('fix(avcodec): when stop reset subTaskId and subtitleTaskId (close #00)')}\n\n` +
      pico.red('  See .github/commit-convention.md for more details.\n'))
  process.exit(1)
}
