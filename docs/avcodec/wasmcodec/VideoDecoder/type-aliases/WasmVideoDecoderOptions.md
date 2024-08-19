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

[avcodec/wasmcodec/VideoDecoder.ts:41](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avcodec/wasmcodec/VideoDecoder.ts#L41)
