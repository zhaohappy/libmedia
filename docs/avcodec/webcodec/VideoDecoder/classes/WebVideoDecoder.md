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

[avcodec/webcodec/VideoDecoder.ts:61](https://github.com/zhaohappy/libmedia/blob/a88305ff5d10e91621f2d71d24c72fc85681b8f7/src/avcodec/webcodec/VideoDecoder.ts#L61)

## Methods

### close()

> **close**(): `void`

#### Returns

`void`

#### Source

[avcodec/webcodec/VideoDecoder.ts:248](https://github.com/zhaohappy/libmedia/blob/a88305ff5d10e91621f2d71d24c72fc85681b8f7/src/avcodec/webcodec/VideoDecoder.ts#L248)

***

### decode()

> **decode**(`avpacket`): `-1` \| `0`

#### Parameters

• **avpacket**: `pointer`\<[`AVPacket`](../../../../avutil/struct/avpacket/classes/AVPacket.md)\>

#### Returns

`-1` \| `0`

#### Source

[avcodec/webcodec/VideoDecoder.ts:187](https://github.com/zhaohappy/libmedia/blob/a88305ff5d10e91621f2d71d24c72fc85681b8f7/src/avcodec/webcodec/VideoDecoder.ts#L187)

***

### flush()

> **flush**(): `Promise`\<`void`\>

#### Returns

`Promise`\<`void`\>

#### Source

[avcodec/webcodec/VideoDecoder.ts:232](https://github.com/zhaohappy/libmedia/blob/a88305ff5d10e91621f2d71d24c72fc85681b8f7/src/avcodec/webcodec/VideoDecoder.ts#L232)

***

### getQueueLength()

> **getQueueLength**(): `number`

#### Returns

`number`

#### Source

[avcodec/webcodec/VideoDecoder.ts:265](https://github.com/zhaohappy/libmedia/blob/a88305ff5d10e91621f2d71d24c72fc85681b8f7/src/avcodec/webcodec/VideoDecoder.ts#L265)

***

### open()

> **open**(`parameters`): `Promise`\<`void`\>

#### Parameters

• **parameters**: `pointer`\<[`AVCodecParameters`](../../../../avutil/struct/avcodecparameters/classes/AVCodecParameters.md)\>

#### Returns

`Promise`\<`void`\>

#### Source

[avcodec/webcodec/VideoDecoder.ts:138](https://github.com/zhaohappy/libmedia/blob/a88305ff5d10e91621f2d71d24c72fc85681b8f7/src/avcodec/webcodec/VideoDecoder.ts#L138)

***

### setSkipFrameDiscard()

> **setSkipFrameDiscard**(`discard`): `void`

#### Parameters

• **discard**: `number`

#### Returns

`void`

#### Source

[avcodec/webcodec/VideoDecoder.ts:269](https://github.com/zhaohappy/libmedia/blob/a88305ff5d10e91621f2d71d24c72fc85681b8f7/src/avcodec/webcodec/VideoDecoder.ts#L269)
