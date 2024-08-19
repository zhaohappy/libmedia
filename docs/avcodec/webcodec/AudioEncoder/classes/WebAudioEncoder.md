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

[avcodec/webcodec/AudioEncoder.ts:62](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avcodec/webcodec/AudioEncoder.ts#L62)

## Methods

### close()

> **close**(): `void`

#### Returns

`void`

#### Source

[avcodec/webcodec/AudioEncoder.ts:170](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avcodec/webcodec/AudioEncoder.ts#L170)

***

### encode()

> **encode**(`frame`): `-1` \| `0`

#### Parameters

• **frame**: `pointer`\<[`AVFrame`](../../../../avutil/struct/avframe/classes/AVFrame.md)\> \| `AudioData`

#### Returns

`-1` \| `0`

#### Source

[avcodec/webcodec/AudioEncoder.ts:149](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avcodec/webcodec/AudioEncoder.ts#L149)

***

### flush()

> **flush**(): `Promise`\<`void`\>

#### Returns

`Promise`\<`void`\>

#### Source

[avcodec/webcodec/AudioEncoder.ts:166](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avcodec/webcodec/AudioEncoder.ts#L166)

***

### getExtraData()

> **getExtraData**(): `Uint8Array`

#### Returns

`Uint8Array`

#### Source

[avcodec/webcodec/AudioEncoder.ts:186](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avcodec/webcodec/AudioEncoder.ts#L186)

***

### getQueueLength()

> **getQueueLength**(): `number`

#### Returns

`number`

#### Source

[avcodec/webcodec/AudioEncoder.ts:190](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avcodec/webcodec/AudioEncoder.ts#L190)

***

### open()

> **open**(`parameters`, `timeBase`): `Promise`\<`void`\>

#### Parameters

• **parameters**: `pointer`\<[`AVCodecParameters`](../../../../avutil/struct/avcodecparameters/classes/AVCodecParameters.md)\>

• **timeBase**: `Rational`

#### Returns

`Promise`\<`void`\>

#### Source

[avcodec/webcodec/AudioEncoder.ts:110](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avcodec/webcodec/AudioEncoder.ts#L110)

***

### isSupported()

> `static` **isSupported**(`parameters`): `Promise`\<`boolean`\>

#### Parameters

• **parameters**: `pointer`\<[`AVCodecParameters`](../../../../avutil/struct/avcodecparameters/classes/AVCodecParameters.md)\>

#### Returns

`Promise`\<`boolean`\>

#### Source

[avcodec/webcodec/AudioEncoder.ts:194](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avcodec/webcodec/AudioEncoder.ts#L194)
