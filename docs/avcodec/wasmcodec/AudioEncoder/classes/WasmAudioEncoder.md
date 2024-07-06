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

[avcodec/wasmcodec/AudioEncoder.ts:60](https://github.com/zhaohappy/libmedia/blob/a88305ff5d10e91621f2d71d24c72fc85681b8f7/src/avcodec/wasmcodec/AudioEncoder.ts#L60)

## Methods

### close()

> **close**(): `void`

#### Returns

`void`

#### Source

[avcodec/wasmcodec/AudioEncoder.ts:158](https://github.com/zhaohappy/libmedia/blob/a88305ff5d10e91621f2d71d24c72fc85681b8f7/src/avcodec/wasmcodec/AudioEncoder.ts#L158)

***

### encode()

> **encode**(`frame`): `0` \| `int32`

#### Parameters

• **frame**: `pointer`\<[`AVFrame`](../../../../avutil/struct/avframe/classes/AVFrame.md)\> \| `AudioData`

#### Returns

`0` \| `int32`

#### Source

[avcodec/wasmcodec/AudioEncoder.ts:104](https://github.com/zhaohappy/libmedia/blob/a88305ff5d10e91621f2d71d24c72fc85681b8f7/src/avcodec/wasmcodec/AudioEncoder.ts#L104)

***

### flush()

> **flush**(): `Promise`\<`void`\>

#### Returns

`Promise`\<`void`\>

#### Source

[avcodec/wasmcodec/AudioEncoder.ts:137](https://github.com/zhaohappy/libmedia/blob/a88305ff5d10e91621f2d71d24c72fc85681b8f7/src/avcodec/wasmcodec/AudioEncoder.ts#L137)

***

### getExtraData()

> **getExtraData**(): `Uint8Array`

#### Returns

`Uint8Array`

#### Source

[avcodec/wasmcodec/AudioEncoder.ts:148](https://github.com/zhaohappy/libmedia/blob/a88305ff5d10e91621f2d71d24c72fc85681b8f7/src/avcodec/wasmcodec/AudioEncoder.ts#L148)

***

### open()

> **open**(`parameters`, `timeBase`): `Promise`\<`void`\>

#### Parameters

• **parameters**: `pointer`\<[`AVCodecParameters`](../../../../avutil/struct/avcodecparameters/classes/AVCodecParameters.md)\>

• **timeBase**: `Rational`

#### Returns

`Promise`\<`void`\>

#### Source

[avcodec/wasmcodec/AudioEncoder.ts:83](https://github.com/zhaohappy/libmedia/blob/a88305ff5d10e91621f2d71d24c72fc85681b8f7/src/avcodec/wasmcodec/AudioEncoder.ts#L83)
