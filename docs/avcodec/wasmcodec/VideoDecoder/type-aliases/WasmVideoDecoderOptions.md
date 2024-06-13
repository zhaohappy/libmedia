[**libmedia**](../../../../README.md) • **Docs**

***

[libmedia](../../../../README.md) / [avcodec/wasmcodec/VideoDecoder](../README.md) / WasmVideoDecoderOptions

# Type alias: WasmVideoDecoderOptions

> **WasmVideoDecoderOptions**: `object`

## Type declaration

### avframePool?

> `optional` **avframePool**: [`AVFramePool`](../../../../avutil/struct/avframe/interfaces/AVFramePool.md)

### onError()

> **onError**: (`error`?) => `void`

#### Parameters

• **error?**: `Error`

#### Returns

`void`

### onReceiveFrame()

> **onReceiveFrame**: (`frame`) => `void`

#### Parameters

• **frame**: `pointer`\<[`AVFrame`](../../../../avutil/struct/avframe/classes/AVFrame.md)\>

#### Returns

`void`

### resource

> **resource**: `WebAssemblyResource`

## Source

[avcodec/wasmcodec/VideoDecoder.ts:34](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avcodec/wasmcodec/VideoDecoder.ts#L34)
