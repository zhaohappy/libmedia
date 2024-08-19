[**libmedia**](../../../../README.md) • **Docs**

***

[libmedia](../../../../README.md) / [avcodec/wasmcodec/VideoEncoder](../README.md) / WasmVideoEncoderOptions

# Type alias: WasmVideoEncoderOptions

> **WasmVideoEncoderOptions**: `object`

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

[avcodec/wasmcodec/VideoEncoder.ts:55](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avcodec/wasmcodec/VideoEncoder.ts#L55)
