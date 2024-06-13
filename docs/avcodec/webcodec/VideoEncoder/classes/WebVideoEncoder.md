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

[avcodec/webcodec/VideoEncoder.ts:64](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avcodec/webcodec/VideoEncoder.ts#L64)

## Methods

### close()

> **close**(): `void`

#### Returns

`void`

#### Source

[avcodec/webcodec/VideoEncoder.ts:211](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avcodec/webcodec/VideoEncoder.ts#L211)

***

### encode()

> **encode**(`frame`, `key`): `-1` \| `0`

#### Parameters

• **frame**: `VideoFrame` \| `pointer`\<[`AVFrame`](../../../../avutil/struct/avframe/classes/AVFrame.md)\>

• **key**: `boolean`

#### Returns

`-1` \| `0`

#### Source

[avcodec/webcodec/VideoEncoder.ts:184](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avcodec/webcodec/VideoEncoder.ts#L184)

***

### flush()

> **flush**(): `Promise`\<`void`\>

#### Returns

`Promise`\<`void`\>

#### Source

[avcodec/webcodec/VideoEncoder.ts:207](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avcodec/webcodec/VideoEncoder.ts#L207)

***

### getQueueLength()

> **getQueueLength**(): `number`

#### Returns

`number`

#### Source

[avcodec/webcodec/VideoEncoder.ts:216](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avcodec/webcodec/VideoEncoder.ts#L216)

***

### open()

> **open**(`parameters`): `Promise`\<`void`\>

#### Parameters

• **parameters**: `pointer`\<[`AVCodecParameters`](../../../../avutil/struct/avcodecparameters/classes/AVCodecParameters.md)\>

#### Returns

`Promise`\<`void`\>

#### Source

[avcodec/webcodec/VideoEncoder.ts:133](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avcodec/webcodec/VideoEncoder.ts#L133)
