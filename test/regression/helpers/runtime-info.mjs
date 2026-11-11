import { evaluate, functionSource, readSource } from './source.mjs'

export const queryRuntimeThread = evaluate(`
  ${functionSource(readSource('avplayer/src/function/queryRuntimeThread.ts'), ['queryRuntimeThread']).replace(/^default /, '')}
  return queryRuntimeThread
`)
