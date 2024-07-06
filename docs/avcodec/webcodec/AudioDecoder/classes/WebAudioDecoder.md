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

[avcodec/webcodec/AudioDecoder.ts:50](https://github.com/zhaohappy/libmedia/blob/a88305ff5d10e91621f2d71d24c72fc85681b8f7/src/avcodec/webcodec/AudioDecoder.ts#L50)

## Methods

### changeExtraData()

> **changeExtraData**(`buffer`): `void`

#### Parameters

• **buffer**: `Uint8Array`

#### Returns

`void`

#### Source

[avcodec/webcodec/AudioDecoder.ts:111](https://github.com/zhaohappy/libmedia/blob/a88305ff5d10e91621f2d71d24c72fc85681b8f7/src/avcodec/webcodec/AudioDecoder.ts#L111)

***

### close()

> **close**(): `void`

#### Returns

`void`

#### Source

[avcodec/webcodec/AudioDecoder.ts:164](https://github.com/zhaohappy/libmedia/blob/a88305ff5d10e91621f2d71d24c72fc85681b8f7/src/avcodec/webcodec/AudioDecoder.ts#L164)

***

### decode()

> **decode**(`avpacket`, `pts`?): `-1` \| `0`

#### Parameters

• **avpacket**: `pointer`\<[`AVPacket`](../../../../avutil/struct/avpacket/classes/AVPacket.md)\>

• **pts?**: `int64`

#### Returns

`-1` \| `0`

#### Source

[avcodec/webcodec/AudioDecoder.ts:140](https://github.com/zhaohappy/libmedia/blob/a88305ff5d10e91621f2d71d24c72fc85681b8f7/src/avcodec/webcodec/AudioDecoder.ts#L140)

***

### flush()

> **flush**(): `Promise`\<`void`\>

#### Returns

`Promise`\<`void`\>

#### Source

[avcodec/webcodec/AudioDecoder.ts:160](https://github.com/zhaohappy/libmedia/blob/a88305ff5d10e91621f2d71d24c72fc85681b8f7/src/avcodec/webcodec/AudioDecoder.ts#L160)

***

### getQueueLength()

> **getQueueLength**(): `number`

#### Returns

`number`

#### Source

[avcodec/webcodec/AudioDecoder.ts:171](https://github.com/zhaohappy/libmedia/blob/a88305ff5d10e91621f2d71d24c72fc85681b8f7/src/avcodec/webcodec/AudioDecoder.ts#L171)

***

### open()

> **open**(`parameters`): `Promise`\<`void`\>

#### Parameters

• **parameters**: `pointer`\<[`AVCodecParameters`](../../../../avutil/struct/avcodecparameters/classes/AVCodecParameters.md)\>

#### Returns

`Promise`\<`void`\>

#### Source

[avcodec/webcodec/AudioDecoder.ts:68](https://github.com/zhaohappy/libmedia/blob/a88305ff5d10e91621f2d71d24c72fc85681b8f7/src/avcodec/webcodec/AudioDecoder.ts#L68)
