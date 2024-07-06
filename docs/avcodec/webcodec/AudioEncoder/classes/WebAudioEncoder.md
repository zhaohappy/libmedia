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

[avcodec/webcodec/AudioEncoder.ts:60](https://github.com/zhaohappy/libmedia/blob/a88305ff5d10e91621f2d71d24c72fc85681b8f7/src/avcodec/webcodec/AudioEncoder.ts#L60)

## Methods

### close()

> **close**(): `void`

#### Returns

`void`

#### Source

[avcodec/webcodec/AudioEncoder.ts:160](https://github.com/zhaohappy/libmedia/blob/a88305ff5d10e91621f2d71d24c72fc85681b8f7/src/avcodec/webcodec/AudioEncoder.ts#L160)

***

### encode()

> **encode**(`frame`): `-1` \| `0`

#### Parameters

• **frame**: `pointer`\<[`AVFrame`](../../../../avutil/struct/avframe/classes/AVFrame.md)\> \| `AudioData`

#### Returns

`-1` \| `0`

#### Source

[avcodec/webcodec/AudioEncoder.ts:139](https://github.com/zhaohappy/libmedia/blob/a88305ff5d10e91621f2d71d24c72fc85681b8f7/src/avcodec/webcodec/AudioEncoder.ts#L139)

***

### flush()

> **flush**(): `Promise`\<`void`\>

#### Returns

`Promise`\<`void`\>

#### Source

[avcodec/webcodec/AudioEncoder.ts:156](https://github.com/zhaohappy/libmedia/blob/a88305ff5d10e91621f2d71d24c72fc85681b8f7/src/avcodec/webcodec/AudioEncoder.ts#L156)

***

### getExtraData()

> **getExtraData**(): `Uint8Array`

#### Returns

`Uint8Array`

#### Source

[avcodec/webcodec/AudioEncoder.ts:169](https://github.com/zhaohappy/libmedia/blob/a88305ff5d10e91621f2d71d24c72fc85681b8f7/src/avcodec/webcodec/AudioEncoder.ts#L169)

***

### getQueueLength()

> **getQueueLength**(): `number`

#### Returns

`number`

#### Source

[avcodec/webcodec/AudioEncoder.ts:173](https://github.com/zhaohappy/libmedia/blob/a88305ff5d10e91621f2d71d24c72fc85681b8f7/src/avcodec/webcodec/AudioEncoder.ts#L173)

***

### open()

> **open**(`parameters`, `timeBase`): `Promise`\<`void`\>

#### Parameters

• **parameters**: `pointer`\<[`AVCodecParameters`](../../../../avutil/struct/avcodecparameters/classes/AVCodecParameters.md)\>

• **timeBase**: `Rational`

#### Returns

`Promise`\<`void`\>

#### Source

[avcodec/webcodec/AudioEncoder.ts:100](https://github.com/zhaohappy/libmedia/blob/a88305ff5d10e91621f2d71d24c72fc85681b8f7/src/avcodec/webcodec/AudioEncoder.ts#L100)
