import { execFileSync } from 'node:child_process'

// Each file runs in one child process. The parent can kill it even if its event loop blocks.
export function runRegression(file, { cwd, timeout = 30000, stdio = 'inherit' } = {}) {
  const args = [
    ...(file.endsWith('.ts') ? ['--import', 'tsx'] : []),
    '--test', '--test-isolation=none', '--test-concurrency=1', '--test-timeout=10000', file
  ]
  const env = { ...process.env }
  // Do not inherit the caller's test-child mode when checking the runner itself.
  delete env.NODE_TEST_CONTEXT
  return execFileSync(process.execPath, args, {
    cwd, stdio, env, timeout, killSignal: 'SIGKILL'
  })
}
