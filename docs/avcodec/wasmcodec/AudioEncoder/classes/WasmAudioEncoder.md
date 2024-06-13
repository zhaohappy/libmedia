[**libmedia**](../../../../README.md) • **Docs**

***

[libmedia](../../../../README.md) / [avcodec/wasmcodec/AudioEncoder](../README.md) / WasmAudioEncoder

# Class: WasmAudioEncoder

## Constructors

### new WasmAudioEncoder()

> **new WasmAudioEncoder**(`options`): [`WasmAudioEncoder`](WasmAudioEncoder.md)

#### Parameters

• **options**: [`WasmAudioEncoderOptions`](../type-aliases/WasmAudioEncoderOptions.md)

#### Returns

[`WasmAudioEncoder`](WasmAudioEncoder.md)

#### Source

[avcodec/wasmcodec/AudioEncoder.ts:57](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avcodec/wasmcodec/AudioEncoder.ts#L57)

## Methods

### close()

> **close**(): `void`

#### Returns

`void`

#### Source

[avcodec/wasmcodec/AudioEncoder.ts:144](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avcodec/wasmcodec/AudioEncoder.ts#L144)

***

### encode()

> **encode**(`frame`): `0` \| `int32`

#### Parameters

• **frame**: `pointer`\<[`AVFrame`](../../../../avutil/struct/avframe/classes/AVFrame.md)\> \| `AudioData`

#### Returns

`0` \| `int32`

#### Source

[avcodec/wasmcodec/AudioEncoder.ts:98](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avcodec/wasmcodec/AudioEncoder.ts#L98)

***

### flush()

> **flush**(): `Promise`\<`void`\>

#### Returns

`Promise`\<`void`\>

#### Source

[avcodec/wasmcodec/AudioEncoder.ts:133](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avcodec/wasmcodec/AudioEncoder.ts#L133)

***

### open()

> **open**(`parameters`): `Promise`\<`void`\>

#### Parameters

• **parameters**: `pointer`\<[`AVCodecParameters`](../../../../avutil/struct/avcodecparameters/classes/AVCodecParameters.md)\>

#### Returns

`Promise`\<`void`\>

#### Source

[avcodec/wasmcodec/AudioEncoder.ts:80](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avcodec/wasmcodec/AudioEncoder.ts#L80)
