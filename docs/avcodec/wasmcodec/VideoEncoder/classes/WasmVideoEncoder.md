[**libmedia**](../../../../README.md) • **Docs**

***

[libmedia](../../../../README.md) / [avcodec/wasmcodec/VideoEncoder](../README.md) / WasmVideoEncoder

# Class: WasmVideoEncoder

## Constructors

### new WasmVideoEncoder()

> **new WasmVideoEncoder**(`options`): [`WasmVideoEncoder`](WasmVideoEncoder.md)

#### Parameters

• **options**: [`WasmVideoEncoderOptions`](../type-aliases/WasmVideoEncoderOptions.md)

#### Returns

[`WasmVideoEncoder`](WasmVideoEncoder.md)

#### Source

[avcodec/wasmcodec/VideoEncoder.ts:58](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avcodec/wasmcodec/VideoEncoder.ts#L58)

## Methods

### close()

> **close**(): `void`

#### Returns

`void`

#### Source

[avcodec/wasmcodec/VideoEncoder.ts:156](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avcodec/wasmcodec/VideoEncoder.ts#L156)

***

### encode()

> **encode**(`frame`, `key`): `0` \| `int32`

#### Parameters

• **frame**: `VideoFrame` \| `pointer`\<[`AVFrame`](../../../../avutil/struct/avframe/classes/AVFrame.md)\>

• **key**: `boolean`

#### Returns

`0` \| `int32`

#### Source

[avcodec/wasmcodec/VideoEncoder.ts:106](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avcodec/wasmcodec/VideoEncoder.ts#L106)

***

### flush()

> **flush**(): `Promise`\<`void`\>

#### Returns

`Promise`\<`void`\>

#### Source

[avcodec/wasmcodec/VideoEncoder.ts:145](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avcodec/wasmcodec/VideoEncoder.ts#L145)

***

### open()

> **open**(`parameters`, `threadCount`): `Promise`\<`void`\>

#### Parameters

• **parameters**: `pointer`\<[`AVCodecParameters`](../../../../avutil/struct/avcodecparameters/classes/AVCodecParameters.md)\>

• **threadCount**: `number`= `1`

#### Returns

`Promise`\<`void`\>

#### Source

[avcodec/wasmcodec/VideoEncoder.ts:81](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avcodec/wasmcodec/VideoEncoder.ts#L81)
