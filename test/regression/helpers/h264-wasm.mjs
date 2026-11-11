import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'

// sizeof/offsetof from lib/ffmpeg/include: AVCodecParameters, AVPacket, AVFrame.
const layouts = {
  simd: { pointerSize: 4, codecpar: [160, 28], packet: [80, 24, 28], frame: [320, 0, 32, 68, 72, 80] },
  64: { pointerSize: 8, codecpar: [176, 44], packet: [104, 24, 32], frame: [440, 0, 64, 104, 108, 116] }
}

// A bounded single-thread runtime for the four-frame fixture, using the shipped decoder ABI.
// Allocations are zeroed, 64-byte aligned and retained until this instance is discarded.
export function decodeH264(wasm, data, variant) {
  const layout = layouts[variant]
  const is64 = variant === '64'
  const ptr = (value) => is64 ? BigInt(value) : Number(value)
  const address = is64 ? 'i64' : 'i32'
  const memory = new WebAssembly.Memory({ initial: ptr(512), maximum: ptr(512), address, index: address })
  const table = new WebAssembly.Table({ initial: ptr(4096), element: 'anyfunc', address, index: address })
  const view = new DataView(memory.buffer)
  const heap = new Uint8Array(memory.buffer)
  const setPtr = (p, value) => is64
    ? view.setBigUint64(Number(p), BigInt(value), true)
    : view.setUint32(Number(p), Number(value), true)
  const getPtr = (p) => Number(is64 ? view.getBigUint64(Number(p), true) : view.getUint32(Number(p), true))
  let next = 16 * 1024 * 1024
  const allocations = new Map()
  function malloc(size) {
    size = Number(size)
    assert.ok(Number.isSafeInteger(size) && size >= 0)
    const p = next
    next += Math.ceil(Math.max(size, 1) / 64) * 64
    assert.ok(next <= heap.length, 'test heap exhausted')
    allocations.set(p, size)
    return ptr(p)
  }
  function realloc(p, size) {
    const q = malloc(size)
    if (Number(p)) {
      assert.ok(allocations.has(Number(p)))
      heap.copyWithin(Number(q), Number(p), Number(p) + Math.min(allocations.get(Number(p)), Number(size)))
    }
    return q
  }
  const noop = () => 0
  const unexpected = (name) => () => {
    throw new Error(`Unexpected decoder import: ${name}`)
  }
  // These names are part of the WASM import ABI.
  /* eslint-disable camelcase */
  const env = {
    memory, __indirect_function_table: table,
    __memory_base: ptr(1024), __table_base: ptr(1),
    __stack_pointer: new WebAssembly.Global({ value: address, mutable: true }, ptr(8 * 1024 * 1024)),
    malloc, emscripten_builtin_malloc: malloc, realloc, free: noop,
    posix_memalign: (out, alignment, size) => {
      assert.ok(Number(alignment) <= 64)
      setPtr(out, malloc(size))
      return 0
    },
    wasm_pthread_support: noop,
    wasm_pthread_mutex_init: noop, wasm_pthread_mutex_lock: noop,
    wasm_pthread_mutex_unlock: noop, wasm_pthread_mutex_destroy: noop,
    wasm_pthread_cond_init: noop, wasm_pthread_cond_destroy: noop,
    wasm_pthread_cond_signal: noop, wasm_pthread_cond_broadcast: noop,
    wasm_pthread_cond_wait: unexpected('cond_wait'),
    wasm_pthread_create: unexpected('pthread_create'), wasm_pthread_join2: unexpected('pthread_join'),
    wasm_pthread_once: (p, callback) => {
      if (!view.getInt32(Number(p), true)) {
        view.setInt32(Number(p), 1, true)
        table.get(callback)()
      }
      return 0
    },
    environ_sizes_get: (count, size) => {
      setPtr(count, 0)
      setPtr(size, 0)
      return 0
    },
    environ_get: noop,
    clock_time_get: (id, precision, out) => {
      view.setBigUint64(Number(out), BigInt(Date.now()) * 1000000n, true)
      return 0
    },
    fd_write: (fd, iovs, count, written) => {
      let length = 0
      for (let i = 0; i < Number(count); i++) {
        const p = Number(iovs) + i * 2 * layout.pointerSize
        const size = getPtr(p + layout.pointerSize)
        process.stderr.write(Buffer.from(heap.subarray(getPtr(p), getPtr(p) + size)))
        length += size
      }
      setPtr(written, length)
      return 0
    },
    fd_close: noop, fd_fdstat_get: () => 8,
    fd_read: unexpected('fd_read'), fd_seek: unexpected('fd_seek')
  }
  const { exports: api } = new WebAssembly.Instance(new WebAssembly.Module(wasm), { env, wasi_snapshot_preview1: env })
  /* eslint-enable camelcase */
  api.__wasm_apply_data_relocs()
  api._initialize()
  const par = malloc(layout.codecpar[0])
  // AV_CODEC_ID_H264 and AV_PIX_FMT_NONE.
  view.setInt32(Number(par) + 4, 27, true)
  view.setInt32(Number(par) + layout.codecpar[1], -1, true)
  assert.equal(api.decoder_open(par, ptr(0), 1, ptr(0)), 0, 'decoder_open')
  const packet = malloc(layout.packet[0])
  const frame = malloc(layout.frame[0])
  const hash = createHash('sha256')
  let frames = 0
  function drain() {
    let result
    while ((result = api.decoder_receive(frame)) > 0) {
      const w = view.getInt32(Number(frame) + layout.frame[3], true)
      const h = view.getInt32(Number(frame) + layout.frame[4], true)
      const format = view.getInt32(Number(frame) + layout.frame[5], true)
      assert.deepEqual([w, h, format], [128, 128, 0], '128x128 YUV420P frame')
      for (let plane = 0; plane < 3; plane++) {
        const start = getPtr(Number(frame) + layout.frame[1] + plane * layout.pointerSize)
        const stride = view.getInt32(Number(frame) + layout.frame[2] + plane * 4, true)
        const width = plane ? w / 2 : w
        const height = plane ? h / 2 : h
        assert.ok(start > 0 && stride >= width && start + (height - 1) * stride + width <= heap.length)
        for (let y = 0; y < height; y++) {
          hash.update(heap.subarray(start + y * stride, start + y * stride + width))
        }
      }
      frames++
    }
    assert.equal(result, 0, 'decoder_receive')
  }
  // The fixture contains a four-byte Annex B start code before every AUD.
  const starts = []
  for (let i = 0; i < data.length - 4; i++) {
    if (data[i] === 0 && data[i + 1] === 0 && data[i + 2] === 0 && data[i + 3] === 1 && (data[i + 4] & 31) === 9) {
      starts.push(i)
    }
  }
  assert.equal(starts[0], 0)
  assert.equal(starts.length, 4)
  starts.push(data.length)
  try {
    for (let i = 0; i < starts.length - 1; i++) {
      const bytes = data.subarray(starts[i], starts[i + 1])
      const p = malloc(bytes.length + 64)
      heap.set(bytes, Number(p))
      setPtr(Number(packet) + layout.packet[1], p)
      view.setInt32(Number(packet) + layout.packet[2], bytes.length, true)
      assert.equal(api.decoder_decode(packet), 0, 'decoder_decode')
      drain()
    }
    assert.equal(api.decoder_flush(), 0, 'decoder_flush')
    drain()
    return { frames, sha256: hash.digest('hex') }
  }
  finally {
    api.decoder_close()
  }
}
