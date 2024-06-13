[**libmedia**](../../../../README.md) • **Docs**

***

[libmedia](../../../../README.md) / [avcodec/wasmcodec/AudioDecoder](../README.md) / WasmAudioDecoder

# Class: WasmAudioDecoder

## Constructors

### new WasmAudioDecoder()

> **new WasmAudioDecoder**(`options`): [`WasmAudioDecoder`](WasmAudioDecoder.md)

#### Parameters

• **options**: [`WasmAudioDecoderOptions`](../type-aliases/WasmAudioDecoderOptions.md)

#### Returns

[`WasmAudioDecoder`](WasmAudioDecoder.md)

#### Source

[avcodec/wasmcodec/AudioDecoder.ts:49](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avcodec/wasmcodec/AudioDecoder.ts#L49)

## Methods

### close()

> **close**(): `void`

#### Returns

`void`

#### Source

[avcodec/wasmcodec/AudioDecoder.ts:120](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avcodec/wasmcodec/AudioDecoder.ts#L120)

***

### decode()

> **decode**(`avpacket`): `0` \| `int32`

#### Parameters

• **avpacket**: `pointer`\<[`AVPacket`](../../../../avutil/struct/avpacket/classes/AVPacket.md)\>

#### Returns

`0` \| `int32`

#### Source

[avcodec/wasmcodec/AudioDecoder.ts:86](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avcodec/wasmcodec/AudioDecoder.ts#L86)

***

### flush()

> **flush**(): `Promise`\<`void`\>

#### Returns

`Promise`\<`void`\>

#### Source

[avcodec/wasmcodec/AudioDecoder.ts:109](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avcodec/wasmcodec/AudioDecoder.ts#L109)

***

### open()

> **open**(`parameters`): `Promise`\<`void`\>

#### Parameters

• **parameters**: `pointer`\<[`AVCodecParameters`](../../../../avutil/struct/avcodecparameters/classes/AVCodecParameters.md)\>

#### Returns

`Promise`\<`void`\>

#### Source

[avcodec/wasmcodec/AudioDecoder.ts:78](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avcodec/wasmcodec/AudioDecoder.ts#L78)
