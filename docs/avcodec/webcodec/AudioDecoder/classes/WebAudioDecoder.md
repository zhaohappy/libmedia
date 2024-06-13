[**libmedia**](../../../../README.md) • **Docs**

***

[libmedia](../../../../README.md) / [avcodec/webcodec/AudioDecoder](../README.md) / WebAudioDecoder

# Class: WebAudioDecoder

## Constructors

### new WebAudioDecoder()

> **new WebAudioDecoder**(`options`): [`WebAudioDecoder`](WebAudioDecoder.md)

#### Parameters

• **options**: [`WebAudioDecoderOptions`](../type-aliases/WebAudioDecoderOptions.md)

#### Returns

[`WebAudioDecoder`](WebAudioDecoder.md)

#### Source

[avcodec/webcodec/AudioDecoder.ts:49](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avcodec/webcodec/AudioDecoder.ts#L49)

## Methods

### changeExtraData()

> **changeExtraData**(`buffer`): `void`

#### Parameters

• **buffer**: `Uint8Array`

#### Returns

`void`

#### Source

[avcodec/webcodec/AudioDecoder.ts:110](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avcodec/webcodec/AudioDecoder.ts#L110)

***

### close()

> **close**(): `void`

#### Returns

`void`

#### Source

[avcodec/webcodec/AudioDecoder.ts:170](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avcodec/webcodec/AudioDecoder.ts#L170)

***

### decode()

> **decode**(`avpacket`, `pts`?): `-1` \| `0`

#### Parameters

• **avpacket**: `pointer`\<[`AVPacket`](../../../../avutil/struct/avpacket/classes/AVPacket.md)\>

• **pts?**: `int64`

#### Returns

`-1` \| `0`

#### Source

[avcodec/webcodec/AudioDecoder.ts:139](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avcodec/webcodec/AudioDecoder.ts#L139)

***

### flush()

> **flush**(): `Promise`\<`void`\>

#### Returns

`Promise`\<`void`\>

#### Source

[avcodec/webcodec/AudioDecoder.ts:166](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avcodec/webcodec/AudioDecoder.ts#L166)

***

### getQueueLength()

> **getQueueLength**(): `number`

#### Returns

`number`

#### Source

[avcodec/webcodec/AudioDecoder.ts:177](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avcodec/webcodec/AudioDecoder.ts#L177)

***

### open()

> **open**(`parameters`): `Promise`\<`void`\>

#### Parameters

• **parameters**: `pointer`\<[`AVCodecParameters`](../../../../avutil/struct/avcodecparameters/classes/AVCodecParameters.md)\>

#### Returns

`Promise`\<`void`\>

#### Source

[avcodec/webcodec/AudioDecoder.ts:67](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avcodec/webcodec/AudioDecoder.ts#L67)
