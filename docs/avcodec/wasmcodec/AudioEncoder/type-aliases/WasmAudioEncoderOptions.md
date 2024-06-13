[**libmedia**](../../../../README.md) • **Docs**

***

[libmedia](../../../../README.md) / [avcodec/wasmcodec/AudioEncoder](../README.md) / WasmAudioEncoderOptions

# Type alias: WasmAudioEncoderOptions

> **WasmAudioEncoderOptions**: `object`

## Type declaration

### avpacketPool?

> `optional` **avpacketPool**: [`AVPacketPool`](../../../../avutil/struct/avpacket/interfaces/AVPacketPool.md)

### onError()

> **onError**: (`error`?) => `void`

#### Parameters

• **error?**: `Error`

#### Returns

`void`

### onReceiveAVPacket()

> **onReceiveAVPacket**: (`avpacket`) => `void`

#### Parameters

• **avpacket**: `pointer`\<[`AVPacket`](../../../../avutil/struct/avpacket/classes/AVPacket.md)\>

#### Returns

`void`

### resource

> **resource**: `WebAssemblyResource`

## Source

[avcodec/wasmcodec/AudioEncoder.ts:40](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avcodec/wasmcodec/AudioEncoder.ts#L40)
