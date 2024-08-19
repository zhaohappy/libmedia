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

[avcodec/webcodec/VideoEncoder.ts:91](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avcodec/webcodec/VideoEncoder.ts#L91)

## Methods

### close()

> **close**(): `void`

#### Returns

`void`

#### Source

[avcodec/webcodec/VideoEncoder.ts:276](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avcodec/webcodec/VideoEncoder.ts#L276)

***

### encode()

> **encode**(`frame`, `key`): `-1` \| `0`

#### Parameters

• **frame**: `VideoFrame` \| `pointer`\<[`AVFrame`](../../../../avutil/struct/avframe/classes/AVFrame.md)\>

• **key**: `boolean`

#### Returns

`-1` \| `0`

#### Source

[avcodec/webcodec/VideoEncoder.ts:238](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avcodec/webcodec/VideoEncoder.ts#L238)

***

### flush()

> **flush**(): `Promise`\<`void`\>

#### Returns

`Promise`\<`void`\>

#### Source

[avcodec/webcodec/VideoEncoder.ts:272](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avcodec/webcodec/VideoEncoder.ts#L272)

***

### getColorSpace()

> **getColorSpace**(): `object`

#### Returns

`object`

##### colorPrimaries

> **colorPrimaries**: `AVColorPrimaries`

##### colorSpace

> **colorSpace**: `AVColorSpace`

##### colorTrc

> **colorTrc**: `AVColorTransferCharacteristic`

#### Source

[avcodec/webcodec/VideoEncoder.ts:296](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avcodec/webcodec/VideoEncoder.ts#L296)

***

### getExtraData()

> **getExtraData**(): `Uint8Array`

#### Returns

`Uint8Array`

#### Source

[avcodec/webcodec/VideoEncoder.ts:292](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avcodec/webcodec/VideoEncoder.ts#L292)

***

### getQueueLength()

> **getQueueLength**(): `number`

#### Returns

`number`

#### Source

[avcodec/webcodec/VideoEncoder.ts:304](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avcodec/webcodec/VideoEncoder.ts#L304)

***

### open()

> **open**(`parameters`, `timeBase`): `Promise`\<`void`\>

#### Parameters

• **parameters**: `pointer`\<[`AVCodecParameters`](../../../../avutil/struct/avcodecparameters/classes/AVCodecParameters.md)\>

• **timeBase**: `Rational`

#### Returns

`Promise`\<`void`\>

#### Source

[avcodec/webcodec/VideoEncoder.ts:179](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avcodec/webcodec/VideoEncoder.ts#L179)

***

### isSupported()

> `static` **isSupported**(`parameters`, `enableHardwareAcceleration`): `Promise`\<`boolean`\>

#### Parameters

• **parameters**: `pointer`\<[`AVCodecParameters`](../../../../avutil/struct/avcodecparameters/classes/AVCodecParameters.md)\>

• **enableHardwareAcceleration**: `boolean`

#### Returns

`Promise`\<`boolean`\>

#### Source

[avcodec/webcodec/VideoEncoder.ts:308](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avcodec/webcodec/VideoEncoder.ts#L308)
