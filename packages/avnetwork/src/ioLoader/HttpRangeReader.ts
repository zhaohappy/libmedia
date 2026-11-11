import { IOError } from '@libmedia/common/io'
import { logger } from '@libmedia/common'

const WINDOW_SIZE = 5 * 1024 * 1024
const CACHE_SIZE = 8 * 1024 * 1024
const PREFETCH_DISTANCE = 1024 * 1024
const IDLE_TIMEOUT = 10000

interface CachedRange { start: number, data: Uint8Array, length: number }
interface PendingRange {
  start: number
  end: number
  limit: number
  received: number
  done: boolean
  error: number
  controller: AbortController
}

/** Bounded streaming side channel; returned buffers never alias its seek cache. */
export default class HttpRangeReader {
  private cache: CachedRange[] = []
  private cachedBytes = 0
  private pending: PendingRange | undefined
  private generation = 0
  private busy = false
  private next: number | undefined
  private wake: (() => void) | undefined

  constructor(private size: number, private fetchRange: (start: number, end: number, signal: AbortSignal) => Promise<Response>) {}

  private signal() {
    this.wake?.()
    this.wake = undefined
  }

  private cancelRequest() {
    this.pending?.controller.abort()
    this.pending = undefined
    this.signal()
  }

  public abort() {
    this.generation++
    this.next = undefined
    this.cancelRequest()
  }

  public clear() {
    this.abort()
    this.cache = []
    this.cachedBytes = 0
  }

  private copy(start: number, length: number): Uint8Array | number {
    const pieces: { data: Uint8Array, offset: number, length: number }[] = []
    let pos = start
    while (pos < start + length) {
      const piece = this.cache.find((item) => item.start <= pos && item.start + item.length > pos)
      if (!piece) {
        return pos
      }
      const count = Math.min(start + length - pos, piece.start + piece.length - pos)
      pieces.push({ data: piece.data, offset: pos - piece.start, length: count })
      pos += count
    }
    const result = new Uint8Array(length)
    let offset = 0
    for (const piece of pieces) {
      result.set(piece.data.subarray(piece.offset, piece.offset + piece.length), offset)
      offset += piece.length
    }
    return result
  }

  private prefetch() {
    const pending = this.pending
    if (pending?.done && !pending.error && this.next !== undefined
      && this.next >= pending.end - PREFETCH_DISTANCE && this.next <= pending.end
      && pending.end < pending.limit
    ) {
      this.start(pending.end, pending.limit)
    }
  }

  private start(start: number, limit: number) {
    this.cancelRequest()
    const pending: PendingRange = {
      start, end: Math.min(start + WINDOW_SIZE, limit), limit, received: 0,
      done: false, error: 0, controller: new AbortController()
    }
    this.pending = pending
    // pump handles all failures, including background prefetch failures.
    void this.pump(pending)
  }

  private async pump(pending: PendingRange) {
    const started = performance.now()
    let reader: ReadableStreamDefaultReader<Uint8Array> | undefined
    let timeout: ReturnType<typeof setTimeout>
    const armTimeout = () => {
      clearTimeout(timeout)
      timeout = setTimeout(() => pending.controller.abort(), IDLE_TIMEOUT)
    }
    try {
      armTimeout()
      const response = await this.fetchRange(pending.start, pending.end - 1, pending.controller.signal)
      if (this.pending !== pending) {
        return
      }
      const range = /^bytes (\d+)-(\d+)\/(\d+)$/i.exec(response.headers.get('Content-Range') || '')
      const encoding = response.headers.get('Content-Encoding')
      if (response.status !== 206 || !response.body || !range
        || Number(range[1]) !== pending.start || Number(range[2]) !== pending.end - 1
        || Number(range[3]) !== this.size || encoding && encoding.toLowerCase() !== 'identity'
      ) {
        pending.error = IOError.INVALID_OPERATION
        return
      }
      logger.debug(`seek-stage http headers offset=${pending.start} elapsedMs=${(performance.now() - started).toFixed(1)}`)
      reader = response.body.getReader()
      while (this.pending === pending) {
        armTimeout()
        const { done, value } = await reader.read()
        if (this.pending !== pending || pending.controller.signal.aborted) {
          return
        }
        if (done) {
          if (pending.received !== pending.end - pending.start) {
            pending.error = IOError.INVALID_OPERATION
          }
          break
        }
        if (value.length > pending.end - pending.start - pending.received) {
          pending.error = IOError.INVALID_OPERATION
          break
        }
        if (!pending.received && value.length) {
          logger.debug(`seek-stage http first-byte offset=${pending.start} elapsedMs=${(performance.now() - started).toFixed(1)}`)
        }
        // Coalesce even tiny network chunks into bounded owned blocks.
        for (let offset = 0; offset < value.length;) {
          const pos = pending.start + pending.received
          let block = this.cache[this.cache.length - 1]
          if (!block || block.start < pending.start || block.start + block.length !== pos || block.length === block.data.length) {
            block = { start: pos, data: new Uint8Array(Math.min(65536, pending.end - pos)), length: 0 }
            this.cache.push(block)
            this.cachedBytes += block.data.length
          }
          const count = Math.min(value.length - offset, block.data.length - block.length)
          block.data.set(value.subarray(offset, offset + count), block.length)
          block.length += count
          offset += count
          pending.received += count
          while (this.cachedBytes > CACHE_SIZE) {
            this.cachedBytes -= this.cache.shift()!.data.length
          }
        }
        this.signal()
      }
    }
    catch (error) {
      pending.error = pending.controller.signal.aborted ? IOError.ABORT : IOError.NETWORK_ERROR
    }
    finally {
      clearTimeout(timeout)
      pending.controller.abort()
      reader?.releaseLock()
      pending.done = true
      if (this.pending === pending) {
        if (pending.error) {
          this.cache = this.cache.filter((item) => item.start < pending.start || item.start >= pending.end)
          this.cachedBytes = this.cache.reduce((sum, item) => sum + item.data.length, 0)
        }
        this.signal()
        this.prefetch()
      }
    }
  }

  /** limit is the exclusive physical extent/clip boundary, not a requested byte count. */
  public async read(start: number, length: number, limit: number): Promise<Uint8Array | number> {
    if (this.busy) {
      return IOError.AGAIN
    }
    this.busy = true
    const generation = this.generation
    try {
      if (this.next !== start || this.pending?.limit !== limit) {
        this.cancelRequest()
      }
      this.next = start + length
      while (generation === this.generation) {
        const pending = this.pending
        if (pending?.error && start < pending.end && start + length > pending.start) {
          return pending.error
        }
        const data = this.copy(start, length)
        // At the response boundary also verify EOF, detecting oversized bodies.
        if (typeof data !== 'number' && !(pending && !pending.done && start + length === pending.end)) {
          this.prefetch()
          return data
        }
        const missing = typeof data === 'number' ? data : start
        if (!pending || missing < pending.start || missing > pending.end
          || missing === pending.end && pending.done
        ) {
          this.start(missing, limit)
          continue
        }
        await new Promise<void>((resolve) => {
          this.wake = resolve
        })
      }
      return IOError.ABORT
    }
    finally {
      this.busy = false
    }
  }
}
