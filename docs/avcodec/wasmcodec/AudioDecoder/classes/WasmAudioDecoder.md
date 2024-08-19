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

[avcodec/wasmcodec/AudioDecoder.ts:58](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avcodec/wasmcodec/AudioDecoder.ts#L58)

## Methods

### close()

> **close**(): `void`

#### Returns

`void`

#### Source

[avcodec/wasmcodec/AudioDecoder.ts:151](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avcodec/wasmcodec/AudioDecoder.ts#L151)

***

### decode()

> **decode**(`avpacket`): `0` \| `int32`

#### Parameters

• **avpacket**: `pointer`\<[`AVPacket`](../../../../avutil/struct/avpacket/classes/AVPacket.md)\>

#### Returns

`0` \| `int32`

#### Source

[avcodec/wasmcodec/AudioDecoder.ts:117](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avcodec/wasmcodec/AudioDecoder.ts#L117)

***

### flush()

> **flush**(): `Promise`\<`void`\>

#### Returns

`Promise`\<`void`\>

#### Source

[avcodec/wasmcodec/AudioDecoder.ts:140](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avcodec/wasmcodec/AudioDecoder.ts#L140)

***

### open()

> **open**(`parameters`, `opts`): `Promise`\<`void`\>

#### Parameters

• **parameters**: `pointer`\<[`AVCodecParameters`](../../../../avutil/struct/avcodecparameters/classes/AVCodecParameters.md)\>

• **opts**: `Data`= `{}`

#### Returns

`Promise`\<`void`\>

#### Source

[avcodec/wasmcodec/AudioDecoder.ts:87](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avcodec/wasmcodec/AudioDecoder.ts#L87)
