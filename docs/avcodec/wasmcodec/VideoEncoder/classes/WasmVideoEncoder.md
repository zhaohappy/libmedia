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

[avcodec/wasmcodec/VideoEncoder.ts:84](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avcodec/wasmcodec/VideoEncoder.ts#L84)

## Methods

### close()

> **close**(): `void`

#### Returns

`void`

#### Source

[avcodec/wasmcodec/VideoEncoder.ts:293](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avcodec/wasmcodec/VideoEncoder.ts#L293)

***

### encode()

> **encode**(`frame`, `key`): `0` \| `int32`

#### Parameters

• **frame**: `VideoFrame` \| `pointer`\<[`AVFrame`](../../../../avutil/struct/avframe/classes/AVFrame.md)\>

• **key**: `boolean`

#### Returns

`0` \| `int32`

#### Source

[avcodec/wasmcodec/VideoEncoder.ts:250](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avcodec/wasmcodec/VideoEncoder.ts#L250)

***

### encodeAsync()

> **encodeAsync**(`frame`, `key`): `Promise`\<`0` \| `int32`\>

#### Parameters

• **frame**: `VideoFrame` \| `pointer`\<[`AVFrame`](../../../../avutil/struct/avframe/classes/AVFrame.md)\>

• **key**: `boolean`

#### Returns

`Promise`\<`0` \| `int32`\>

#### Source

[avcodec/wasmcodec/VideoEncoder.ts:240](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avcodec/wasmcodec/VideoEncoder.ts#L240)

***

### flush()

> **flush**(): `Promise`\<`void`\>

#### Returns

`Promise`\<`void`\>

#### Source

[avcodec/wasmcodec/VideoEncoder.ts:261](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avcodec/wasmcodec/VideoEncoder.ts#L261)

***

### getColorSpace()

> **getColorSpace**(): `object`

#### Returns

`object`

##### colorPrimaries

> **colorPrimaries**: `int32`

##### colorSpace

> **colorSpace**: `int32`

##### colorTrc

> **colorTrc**: `int32`

#### Source

[avcodec/wasmcodec/VideoEncoder.ts:285](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avcodec/wasmcodec/VideoEncoder.ts#L285)

***

### getExtraData()

> **getExtraData**(): `Uint8Array`

#### Returns

`Uint8Array`

#### Source

[avcodec/wasmcodec/VideoEncoder.ts:272](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avcodec/wasmcodec/VideoEncoder.ts#L272)

***

### getQueueLength()

> **getQueueLength**(): `number`

#### Returns

`number`

#### Source

[avcodec/wasmcodec/VideoEncoder.ts:320](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avcodec/wasmcodec/VideoEncoder.ts#L320)

***

### open()

> **open**(`parameters`, `timeBase`, `threadCount`, `opts`): `Promise`\<`void`\>

#### Parameters

• **parameters**: `pointer`\<[`AVCodecParameters`](../../../../avutil/struct/avcodecparameters/classes/AVCodecParameters.md)\>

• **timeBase**: `Rational`

• **threadCount**: `number`= `1`

• **opts**: `Data`= `{}`

#### Returns

`Promise`\<`void`\>

#### Source

[avcodec/wasmcodec/VideoEncoder.ts:148](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avcodec/wasmcodec/VideoEncoder.ts#L148)
