[**libmedia**](../../../../README.md) • **Docs**

***

[libmedia](../../../../README.md) / [avcodec/wasmcodec/VideoDecoder](../README.md) / WasmVideoDecoder

# Class: WasmVideoDecoder

## Constructors

### new WasmVideoDecoder()

> **new WasmVideoDecoder**(`options`): [`WasmVideoDecoder`](WasmVideoDecoder.md)

#### Parameters

• **options**: [`WasmVideoDecoderOptions`](../type-aliases/WasmVideoDecoderOptions.md)

#### Returns

[`WasmVideoDecoder`](WasmVideoDecoder.md)

#### Source

[avcodec/wasmcodec/VideoDecoder.ts:95](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avcodec/wasmcodec/VideoDecoder.ts#L95)

## Methods

### close()

> **close**(): `void`

#### Returns

`void`

#### Source

[avcodec/wasmcodec/VideoDecoder.ts:190](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avcodec/wasmcodec/VideoDecoder.ts#L190)

***

### decode()

> **decode**(`avpacket`): `0` \| `int32`

#### Parameters

• **avpacket**: `pointer`\<[`AVPacket`](../../../../avutil/struct/avpacket/classes/AVPacket.md)\>

#### Returns

`0` \| `int32`

#### Source

[avcodec/wasmcodec/VideoDecoder.ts:157](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avcodec/wasmcodec/VideoDecoder.ts#L157)

***

### flush()

> **flush**(): `Promise`\<`void`\>

#### Returns

`Promise`\<`void`\>

#### Source

[avcodec/wasmcodec/VideoDecoder.ts:179](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avcodec/wasmcodec/VideoDecoder.ts#L179)

***

### open()

> **open**(`parameters`, `threadCount`, `opts`): `Promise`\<`void`\>

#### Parameters

• **parameters**: `pointer`\<[`AVCodecParameters`](../../../../avutil/struct/avcodecparameters/classes/AVCodecParameters.md)\>

• **threadCount**: `number`= `1`

• **opts**: `Data`= `{}`

#### Returns

`Promise`\<`void`\>

#### Source

[avcodec/wasmcodec/VideoDecoder.ts:124](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avcodec/wasmcodec/VideoDecoder.ts#L124)

***

### setSkipFrameDiscard()

> **setSkipFrameDiscard**(`discard`): `void`

#### Parameters

• **discard**: [`AVDiscard`](../enumerations/AVDiscard.md)

#### Returns

`void`

#### Source

[avcodec/wasmcodec/VideoDecoder.ts:209](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avcodec/wasmcodec/VideoDecoder.ts#L209)
