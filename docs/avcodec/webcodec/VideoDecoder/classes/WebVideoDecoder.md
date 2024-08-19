[**libmedia**](../../../../README.md) • **Docs**

***

[libmedia](../../../../README.md) / [avcodec/webcodec/VideoDecoder](../README.md) / WebVideoDecoder

# Class: WebVideoDecoder

## Constructors

### new WebVideoDecoder()

> **new WebVideoDecoder**(`options`): [`WebVideoDecoder`](WebVideoDecoder.md)

#### Parameters

• **options**: [`WebVideoDecoderOptions`](../type-aliases/WebVideoDecoderOptions.md)

#### Returns

[`WebVideoDecoder`](WebVideoDecoder.md)

#### Source

[avcodec/webcodec/VideoDecoder.ts:61](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avcodec/webcodec/VideoDecoder.ts#L61)

## Methods

### close()

> **close**(): `void`

#### Returns

`void`

#### Source

[avcodec/webcodec/VideoDecoder.ts:248](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avcodec/webcodec/VideoDecoder.ts#L248)

***

### decode()

> **decode**(`avpacket`): `-1` \| `0`

#### Parameters

• **avpacket**: `pointer`\<[`AVPacket`](../../../../avutil/struct/avpacket/classes/AVPacket.md)\>

#### Returns

`-1` \| `0`

#### Source

[avcodec/webcodec/VideoDecoder.ts:187](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avcodec/webcodec/VideoDecoder.ts#L187)

***

### flush()

> **flush**(): `Promise`\<`void`\>

#### Returns

`Promise`\<`void`\>

#### Source

[avcodec/webcodec/VideoDecoder.ts:232](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avcodec/webcodec/VideoDecoder.ts#L232)

***

### getQueueLength()

> **getQueueLength**(): `number`

#### Returns

`number`

#### Source

[avcodec/webcodec/VideoDecoder.ts:265](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avcodec/webcodec/VideoDecoder.ts#L265)

***

### open()

> **open**(`parameters`): `Promise`\<`void`\>

#### Parameters

• **parameters**: `pointer`\<[`AVCodecParameters`](../../../../avutil/struct/avcodecparameters/classes/AVCodecParameters.md)\>

#### Returns

`Promise`\<`void`\>

#### Source

[avcodec/webcodec/VideoDecoder.ts:138](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avcodec/webcodec/VideoDecoder.ts#L138)

***

### setSkipFrameDiscard()

> **setSkipFrameDiscard**(`discard`): `void`

#### Parameters

• **discard**: `number`

#### Returns

`void`

#### Source

[avcodec/webcodec/VideoDecoder.ts:269](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avcodec/webcodec/VideoDecoder.ts#L269)

***

### isSupported()

> `static` **isSupported**(`parameters`, `enableHardwareAcceleration`): `Promise`\<`boolean`\>

#### Parameters

• **parameters**: `pointer`\<[`AVCodecParameters`](../../../../avutil/struct/avcodecparameters/classes/AVCodecParameters.md)\>

• **enableHardwareAcceleration**: `boolean`

#### Returns

`Promise`\<`boolean`\>

#### Source

[avcodec/webcodec/VideoDecoder.ts:273](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avcodec/webcodec/VideoDecoder.ts#L273)
