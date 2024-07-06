[**libmedia**](../../../../README.md) • **Docs**

***

[libmedia](../../../../README.md) / [avcodec/wasmcodec/VideoEncoder](../README.md) / WasmVideoEncoder

# Class: WasmVideoEncoder

## Constructors

### new WasmVideoEncoder()

> **new WasmVideoEncoder**(`options`): [`WasmVideoEncoder`](WasmVideoEncoder.md)

#### Parameters

• **options**: [`WasmVideoEncoderOptions`](../type-aliases/WasmVideoEncoderOptions.md)

#### Returns

[`WasmVideoEncoder`](WasmVideoEncoder.md)

#### Source

[avcodec/wasmcodec/VideoEncoder.ts:62](https://github.com/zhaohappy/libmedia/blob/a88305ff5d10e91621f2d71d24c72fc85681b8f7/src/avcodec/wasmcodec/VideoEncoder.ts#L62)

## Methods

### close()

> **close**(): `void`

#### Returns

`void`

#### Source

[avcodec/wasmcodec/VideoEncoder.ts:177](https://github.com/zhaohappy/libmedia/blob/a88305ff5d10e91621f2d71d24c72fc85681b8f7/src/avcodec/wasmcodec/VideoEncoder.ts#L177)

***

### encode()

> **encode**(`frame`, `key`): `0` \| `int32`

#### Parameters

• **frame**: `VideoFrame` \| `pointer`\<[`AVFrame`](../../../../avutil/struct/avframe/classes/AVFrame.md)\>

• **key**: `boolean`

#### Returns

`0` \| `int32`

#### Source

[avcodec/wasmcodec/VideoEncoder.ts:119](https://github.com/zhaohappy/libmedia/blob/a88305ff5d10e91621f2d71d24c72fc85681b8f7/src/avcodec/wasmcodec/VideoEncoder.ts#L119)

***

### flush()

> **flush**(): `Promise`\<`void`\>

#### Returns

`Promise`\<`void`\>

#### Source

[avcodec/wasmcodec/VideoEncoder.ts:156](https://github.com/zhaohappy/libmedia/blob/a88305ff5d10e91621f2d71d24c72fc85681b8f7/src/avcodec/wasmcodec/VideoEncoder.ts#L156)

***

### getExtraData()

> **getExtraData**(): `Uint8Array`

#### Returns

`Uint8Array`

#### Source

[avcodec/wasmcodec/VideoEncoder.ts:167](https://github.com/zhaohappy/libmedia/blob/a88305ff5d10e91621f2d71d24c72fc85681b8f7/src/avcodec/wasmcodec/VideoEncoder.ts#L167)

***

### open()

> **open**(`parameters`, `timeBase`, `threadCount`): `Promise`\<`void`\>

#### Parameters

• **parameters**: `pointer`\<[`AVCodecParameters`](../../../../avutil/struct/avcodecparameters/classes/AVCodecParameters.md)\>

• **timeBase**: `Rational`

• **threadCount**: `number`= `1`

#### Returns

`Promise`\<`void`\>

#### Source

[avcodec/wasmcodec/VideoEncoder.ts:91](https://github.com/zhaohappy/libmedia/blob/a88305ff5d10e91621f2d71d24c72fc85681b8f7/src/avcodec/wasmcodec/VideoEncoder.ts#L91)
