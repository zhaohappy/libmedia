[**libmedia**](../../../../README.md) • **Docs**

***

[libmedia](../../../../README.md) / [avcodec/wasmcodec/AudioEncoder](../README.md) / WasmAudioEncoder

# Class: WasmAudioEncoder

## Constructors

### new WasmAudioEncoder()

> **new WasmAudioEncoder**(`options`): [`WasmAudioEncoder`](WasmAudioEncoder.md)

#### Parameters

• **options**: [`WasmAudioEncoderOptions`](../type-aliases/WasmAudioEncoderOptions.md)

#### Returns

[`WasmAudioEncoder`](WasmAudioEncoder.md)

#### Source

[avcodec/wasmcodec/AudioEncoder.ts:182](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avcodec/wasmcodec/AudioEncoder.ts#L182)

## Methods

### close()

> **close**(): `void`

#### Returns

`void`

#### Source

[avcodec/wasmcodec/AudioEncoder.ts:342](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avcodec/wasmcodec/AudioEncoder.ts#L342)

***

### encode()

> **encode**(`avframe`): `0` \| `int32`

#### Parameters

• **avframe**: `pointer`\<[`AVFrame`](../../../../avutil/struct/avframe/classes/AVFrame.md)\> \| `AudioData`

#### Returns

`0` \| `int32`

#### Source

[avcodec/wasmcodec/AudioEncoder.ts:279](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avcodec/wasmcodec/AudioEncoder.ts#L279)

***

### flush()

> **flush**(): `Promise`\<`void`\>

#### Returns

`Promise`\<`void`\>

#### Source

[avcodec/wasmcodec/AudioEncoder.ts:313](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avcodec/wasmcodec/AudioEncoder.ts#L313)

***

### getExtraData()

> **getExtraData**(): `Uint8Array`

#### Returns

`Uint8Array`

#### Source

[avcodec/wasmcodec/AudioEncoder.ts:332](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avcodec/wasmcodec/AudioEncoder.ts#L332)

***

### open()

> **open**(`parameters`, `timeBase`, `opts`): `Promise`\<`void`\>

#### Parameters

• **parameters**: `pointer`\<[`AVCodecParameters`](../../../../avutil/struct/avcodecparameters/classes/AVCodecParameters.md)\>

• **timeBase**: `Rational`

• **opts**: `Data`= `{}`

#### Returns

`Promise`\<`void`\>

#### Source

[avcodec/wasmcodec/AudioEncoder.ts:210](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avcodec/wasmcodec/AudioEncoder.ts#L210)
