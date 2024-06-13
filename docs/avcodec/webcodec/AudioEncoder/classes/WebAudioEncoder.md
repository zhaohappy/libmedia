[**libmedia**](../../../../README.md) • **Docs**

***

[libmedia](../../../../README.md) / [avcodec/webcodec/AudioEncoder](../README.md) / WebAudioEncoder

# Class: WebAudioEncoder

## Constructors

### new WebAudioEncoder()

> **new WebAudioEncoder**(`options`): [`WebAudioEncoder`](WebAudioEncoder.md)

#### Parameters

• **options**: [`WebAudioEncoderOptions`](../type-aliases/WebAudioEncoderOptions.md)

#### Returns

[`WebAudioEncoder`](WebAudioEncoder.md)

#### Source

[avcodec/webcodec/AudioEncoder.ts:56](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avcodec/webcodec/AudioEncoder.ts#L56)

## Methods

### close()

> **close**(): `void`

#### Returns

`void`

#### Source

[avcodec/webcodec/AudioEncoder.ts:159](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avcodec/webcodec/AudioEncoder.ts#L159)

***

### encode()

> **encode**(`frame`): `-1` \| `0`

#### Parameters

• **frame**: `pointer`\<[`AVFrame`](../../../../avutil/struct/avframe/classes/AVFrame.md)\> \| `AudioData`

#### Returns

`-1` \| `0`

#### Source

[avcodec/webcodec/AudioEncoder.ts:141](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avcodec/webcodec/AudioEncoder.ts#L141)

***

### flush()

> **flush**(): `Promise`\<`void`\>

#### Returns

`Promise`\<`void`\>

#### Source

[avcodec/webcodec/AudioEncoder.ts:155](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avcodec/webcodec/AudioEncoder.ts#L155)

***

### getQueueLength()

> **getQueueLength**(): `number`

#### Returns

`number`

#### Source

[avcodec/webcodec/AudioEncoder.ts:164](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avcodec/webcodec/AudioEncoder.ts#L164)

***

### open()

> **open**(`parameters`): `Promise`\<`void`\>

#### Parameters

• **parameters**: `pointer`\<[`AVCodecParameters`](../../../../avutil/struct/avcodecparameters/classes/AVCodecParameters.md)\>

#### Returns

`Promise`\<`void`\>

#### Source

[avcodec/webcodec/AudioEncoder.ts:105](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avcodec/webcodec/AudioEncoder.ts#L105)
