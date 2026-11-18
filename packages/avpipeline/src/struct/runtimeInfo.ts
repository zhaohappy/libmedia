import type { WebAssemblyRuntimeInfo } from '@libmedia/cheap'

export type AVDecoderRuntimeInfo = {
  backend: 'wasm'
  wasm: WebAssemblyRuntimeInfo
} | {
  backend: 'webcodecs' | 'browser' | 'unknown'
  wasm?: never
}

export type AVVideoDecoderRuntimeInfo = {
  backend: 'wasm'
  wasm: WebAssemblyRuntimeInfo
  hardwareAcceleration?: never
} | {
  backend: 'webcodecs'
  wasm?: never
  /** The configured WebCodecs hint, not evidence of the hardware actually used. */
  hardwareAcceleration: 'prefer-hardware' | 'prefer-software' | 'no-preference'
} | {
  backend: 'browser' | 'unknown'
  wasm?: never
  hardwareAcceleration?: never
}

export type VideoRendererBackend = 'webgpu' | 'webgl' | 'canvas2d' | 'browser' | 'writable-stream' | 'unknown'
