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

[avcodec/webcodec/VideoDecoder.ts:60](https://github.com/zhaohappy/libmedia/blob/b4bb608d2b1c00d036d73fc8d222b1a97be53694/src/avcodec/webcodec/VideoDecoder.ts#L60)

## Methods

### close()

> **close**(): `void`

#### Returns

`void`

#### Source

[avcodec/webcodec/VideoDecoder.ts:250](https://github.com/zhaohappy/libmedia/blob/b4bb608d2b1c00d036d73fc8d222b1a97be53694/src/avcodec/webcodec/VideoDecoder.ts#L250)

***

### decode()

> **decode**(`avpacket`): `-1` \| `0`

#### Parameters

• **avpacket**: `pointer`\<[`AVPacket`](../../../../avutil/struct/avpacket/classes/AVPacket.md)\>

#### Returns

`-1` \| `0`

#### Source

[avcodec/webcodec/VideoDecoder.ts:186](https://github.com/zhaohappy/libmedia/blob/b4bb608d2b1c00d036d73fc8d222b1a97be53694/src/avcodec/webcodec/VideoDecoder.ts#L186)

***

### flush()

> **flush**(): `Promise`\<`void`\>

#### Returns

`Promise`\<`void`\>

#### Source

[avcodec/webcodec/VideoDecoder.ts:234](https://github.com/zhaohappy/libmedia/blob/b4bb608d2b1c00d036d73fc8d222b1a97be53694/src/avcodec/webcodec/VideoDecoder.ts#L234)

***

### getQueueLength()

> **getQueueLength**(): `number`

#### Returns

`number`

#### Source

[avcodec/webcodec/VideoDecoder.ts:267](https://github.com/zhaohappy/libmedia/blob/b4bb608d2b1c00d036d73fc8d222b1a97be53694/src/avcodec/webcodec/VideoDecoder.ts#L267)

***

### open()

> **open**(`parameters`): `Promise`\<`void`\>

#### Parameters

• **parameters**: `pointer`\<[`AVCodecParameters`](../../../../avutil/struct/avcodecparameters/classes/AVCodecParameters.md)\>

#### Returns

`Promise`\<`void`\>

#### Source

[avcodec/webcodec/VideoDecoder.ts:137](https://github.com/zhaohappy/libmedia/blob/b4bb608d2b1c00d036d73fc8d222b1a97be53694/src/avcodec/webcodec/VideoDecoder.ts#L137)

***

### setSkipFrameDiscard()

> **setSkipFrameDiscard**(`discard`): `void`

#### Parameters

• **discard**: `number`

#### Returns

`void`

#### Source

[avcodec/webcodec/VideoDecoder.ts:271](https://github.com/zhaohappy/libmedia/blob/b4bb608d2b1c00d036d73fc8d222b1a97be53694/src/avcodec/webcodec/VideoDecoder.ts#L271)
