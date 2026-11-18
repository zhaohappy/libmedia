import type { IPCPort } from '@libmedia/common/network'

/** Applies a diagnostic deadline without leaving a timed-out IPC request pending. */
export default function queryRuntimeThread<T>(
  thread: { $ipc?: IPCPort },
  method: 'getTaskRuntimeInfo' | 'invoke',
  args: unknown[],
  timeoutMs: number,
  invoke: () => Promise<T>
): Promise<T> {
  if (thread?.$ipc) {
    return thread.$ipc.request<T>(method, { params: args }, [], { timeoutMs })
  }
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('runtime info timed out')), timeoutMs)
    Promise.resolve().then(() => {
      if (!thread) {
        throw new Error('runtime pipeline unavailable')
      }
      return invoke()
    }).then((value) => {
      clearTimeout(timer)
      resolve(value)
    }, (error) => {
      clearTimeout(timer)
      reject(error)
    })
  })
}
