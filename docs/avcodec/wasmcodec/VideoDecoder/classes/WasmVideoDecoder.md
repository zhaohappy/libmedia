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

[avcodec/wasmcodec/VideoDecoder.ts:86](https://github.com/zhaohappy/libmedia/blob/acbbf6bd75e6ee4c968b9f441fe28c40f42f350d/src/avcodec/wasmcodec/VideoDecoder.ts#L86)

## Methods

### close()

> **close**(): `void`

#### Returns

`void`

#### Source

[avcodec/wasmcodec/VideoDecoder.ts:158](https://github.com/zhaohappy/libmedia/blob/acbbf6bd75e6ee4c968b9f441fe28c40f42f350d/src/avcodec/wasmcodec/VideoDecoder.ts#L158)

***

### decode()

> **decode**(`avpacket`): `0` \| `int32`

#### Parameters

• **avpacket**: `pointer`\<[`AVPacket`](../../../../avutil/struct/avpacket/classes/AVPacket.md)\>

#### Returns

`0` \| `int32`

#### Source

[avcodec/wasmcodec/VideoDecoder.ts:125](https://github.com/zhaohappy/libmedia/blob/acbbf6bd75e6ee4c968b9f441fe28c40f42f350d/src/avcodec/wasmcodec/VideoDecoder.ts#L125)

***

### flush()

> **flush**(): `Promise`\<`void`\>

#### Returns

`Promise`\<`void`\>

#### Source

[avcodec/wasmcodec/VideoDecoder.ts:147](https://github.com/zhaohappy/libmedia/blob/acbbf6bd75e6ee4c968b9f441fe28c40f42f350d/src/avcodec/wasmcodec/VideoDecoder.ts#L147)

***

### open()

> **open**(`parameters`, `threadCount`): `Promise`\<`void`\>

#### Parameters

• **parameters**: `pointer`\<[`AVCodecParameters`](../../../../avutil/struct/avcodecparameters/classes/AVCodecParameters.md)\>

• **threadCount**: `number`= `1`

#### Returns

`Promise`\<`void`\>

#### Source

[avcodec/wasmcodec/VideoDecoder.ts:115](https://github.com/zhaohappy/libmedia/blob/acbbf6bd75e6ee4c968b9f441fe28c40f42f350d/src/avcodec/wasmcodec/VideoDecoder.ts#L115)

***

### setSkipFrameDiscard()

> **setSkipFrameDiscard**(`discard`): `void`

#### Parameters

• **discard**: [`AVDiscard`](../enumerations/AVDiscard.md)

#### Returns

`void`

#### Source

[avcodec/wasmcodec/VideoDecoder.ts:171](https://github.com/zhaohappy/libmedia/blob/acbbf6bd75e6ee4c968b9f441fe28c40f42f350d/src/avcodec/wasmcodec/VideoDecoder.ts#L171)
