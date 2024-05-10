[**libmedia**](../../../../README.md) • **Docs**

***

[libmedia](../../../../README.md) / [avcodec/wasmcodec/AudioDecoder](../README.md) / WasmAudioDecoderOptions

# Type alias: WasmAudioDecoderOptions

> **WasmAudioDecoderOptions**: `object`

## Type declaration

### avframePool?

> `optional` **avframePool**: [`AVFramePool`](../../../../avutil/struct/avframe/interfaces/AVFramePool.md)

### onError()?

> `optional` **onError**: (`error`?) => `void`

#### Parameters

• **error?**: `Error`

#### Returns

`void`

### onReceiveFrame()?

> `optional` **onReceiveFrame**: (`frame`) => `void`

#### Parameters

• **frame**: `pointer`\<[`AVFrame`](../../../../avutil/struct/avframe/classes/AVFrame.md)\>

#### Returns

`void`

### resource

> **resource**: `WebAssemblyResource`

## Source

[avcodec/wasmcodec/AudioDecoder.ts:34](https://github.com/zhaohappy/libmedia/blob/b4bb608d2b1c00d036d73fc8d222b1a97be53694/src/avcodec/wasmcodec/AudioDecoder.ts#L34)
