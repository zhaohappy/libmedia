[**libmedia**](../../../../README.md) • **Docs**

***

[libmedia](../../../../README.md) / [avcodec/webcodec/VideoEncoder](../README.md) / WebVideoEncoder

# Class: WebVideoEncoder

## Constructors

### new WebVideoEncoder()

> **new WebVideoEncoder**(`options`): [`WebVideoEncoder`](WebVideoEncoder.md)

#### Parameters

• **options**: [`WebVideoEncoderOptions`](../type-aliases/WebVideoEncoderOptions.md)

#### Returns

[`WebVideoEncoder`](WebVideoEncoder.md)

#### Source

[avcodec/webcodec/VideoEncoder.ts:70](https://github.com/zhaohappy/libmedia/blob/a88305ff5d10e91621f2d71d24c72fc85681b8f7/src/avcodec/webcodec/VideoEncoder.ts#L70)

## Methods

### close()

> **close**(): `void`

#### Returns

`void`

#### Source

[avcodec/webcodec/VideoEncoder.ts:214](https://github.com/zhaohappy/libmedia/blob/a88305ff5d10e91621f2d71d24c72fc85681b8f7/src/avcodec/webcodec/VideoEncoder.ts#L214)

***

### encode()

> **encode**(`frame`, `key`): `-1` \| `0`

#### Parameters

• **frame**: `VideoFrame` \| `pointer`\<[`AVFrame`](../../../../avutil/struct/avframe/classes/AVFrame.md)\>

• **key**: `boolean`

#### Returns

`-1` \| `0`

#### Source

[avcodec/webcodec/VideoEncoder.ts:181](https://github.com/zhaohappy/libmedia/blob/a88305ff5d10e91621f2d71d24c72fc85681b8f7/src/avcodec/webcodec/VideoEncoder.ts#L181)

***

### flush()

> **flush**(): `Promise`\<`void`\>

#### Returns

`Promise`\<`void`\>

#### Source

[avcodec/webcodec/VideoEncoder.ts:210](https://github.com/zhaohappy/libmedia/blob/a88305ff5d10e91621f2d71d24c72fc85681b8f7/src/avcodec/webcodec/VideoEncoder.ts#L210)

***

### getExtraData()

> **getExtraData**(): `Uint8Array`

#### Returns

`Uint8Array`

#### Source

[avcodec/webcodec/VideoEncoder.ts:223](https://github.com/zhaohappy/libmedia/blob/a88305ff5d10e91621f2d71d24c72fc85681b8f7/src/avcodec/webcodec/VideoEncoder.ts#L223)

***

### getQueueLength()

> **getQueueLength**(): `number`

#### Returns

`number`

#### Source

[avcodec/webcodec/VideoEncoder.ts:227](https://github.com/zhaohappy/libmedia/blob/a88305ff5d10e91621f2d71d24c72fc85681b8f7/src/avcodec/webcodec/VideoEncoder.ts#L227)

***

### open()

> **open**(`parameters`, `timeBase`): `Promise`\<`void`\>

#### Parameters

• **parameters**: `pointer`\<[`AVCodecParameters`](../../../../avutil/struct/avcodecparameters/classes/AVCodecParameters.md)\>

• **timeBase**: `Rational`

#### Returns

`Promise`\<`void`\>

#### Source

[avcodec/webcodec/VideoEncoder.ts:127](https://github.com/zhaohappy/libmedia/blob/a88305ff5d10e91621f2d71d24c72fc85681b8f7/src/avcodec/webcodec/VideoEncoder.ts#L127)
