[**libmedia**](../../../../README.md) • **Docs**

***

[libmedia](../../../../README.md) / [avformat/formats/IFlvFormat](../README.md) / IFlvFormat

# Class: IFlvFormat

## Extends

- `default`

## Constructors

### new IFlvFormat()

> **new IFlvFormat**(`options`): [`IFlvFormat`](IFlvFormat.md)

#### Parameters

• **options**: [`FlvFormatOptions`](../interfaces/FlvFormatOptions.md)= `{}`

#### Returns

[`IFlvFormat`](IFlvFormat.md)

#### Overrides

`IFormat.constructor`

#### Source

[avformat/formats/IFlvFormat.ts:78](https://github.com/zhaohappy/libmedia/blob/b4bb608d2b1c00d036d73fc8d222b1a97be53694/src/avformat/formats/IFlvFormat.ts#L78)

## Properties

### header

> **header**: `default`

#### Source

[avformat/formats/IFlvFormat.ts:70](https://github.com/zhaohappy/libmedia/blob/b4bb608d2b1c00d036d73fc8d222b1a97be53694/src/avformat/formats/IFlvFormat.ts#L70)

***

### onStreamAdd()

> **onStreamAdd**: (`stream`) => `void`

#### Parameters

• **stream**: [`AVStream`](../../../AVStream/classes/AVStream.md)

#### Returns

`void`

#### Inherited from

`IFormat.onStreamAdd`

#### Source

[avformat/formats/IFormat.ts:35](https://github.com/zhaohappy/libmedia/blob/b4bb608d2b1c00d036d73fc8d222b1a97be53694/src/avformat/formats/IFormat.ts#L35)

***

### options

> **options**: [`FlvFormatOptions`](../interfaces/FlvFormatOptions.md)

#### Source

[avformat/formats/IFlvFormat.ts:74](https://github.com/zhaohappy/libmedia/blob/b4bb608d2b1c00d036d73fc8d222b1a97be53694/src/avformat/formats/IFlvFormat.ts#L74)

***

### script

> **script**: `default`

#### Source

[avformat/formats/IFlvFormat.ts:72](https://github.com/zhaohappy/libmedia/blob/b4bb608d2b1c00d036d73fc8d222b1a97be53694/src/avformat/formats/IFlvFormat.ts#L72)

***

### type

> **type**: `AVFormat` = `AVFormat.FLV`

#### Overrides

`IFormat.type`

#### Source

[avformat/formats/IFlvFormat.ts:68](https://github.com/zhaohappy/libmedia/blob/b4bb608d2b1c00d036d73fc8d222b1a97be53694/src/avformat/formats/IFlvFormat.ts#L68)

## Methods

### destroy()

> **destroy**(`formatContext`): `void`

#### Parameters

• **formatContext**: [`AVIFormatContext`](../../../AVformatContext/interfaces/AVIFormatContext.md)

#### Returns

`void`

#### Inherited from

`IFormat.destroy`

#### Source

[avformat/formats/IFormat.ts:39](https://github.com/zhaohappy/libmedia/blob/b4bb608d2b1c00d036d73fc8d222b1a97be53694/src/avformat/formats/IFormat.ts#L39)

***

### getAnalyzeStreamsCount()

> **getAnalyzeStreamsCount**(): `number`

#### Returns

`number`

#### Overrides

`IFormat.getAnalyzeStreamsCount`

#### Source

[avformat/formats/IFlvFormat.ts:575](https://github.com/zhaohappy/libmedia/blob/b4bb608d2b1c00d036d73fc8d222b1a97be53694/src/avformat/formats/IFlvFormat.ts#L575)

***

### init()

> **init**(`formatContext`): `void`

#### Parameters

• **formatContext**: [`AVIFormatContext`](../../../AVformatContext/interfaces/AVIFormatContext.md)

#### Returns

`void`

#### Overrides

`IFormat.init`

#### Source

[avformat/formats/IFlvFormat.ts:87](https://github.com/zhaohappy/libmedia/blob/b4bb608d2b1c00d036d73fc8d222b1a97be53694/src/avformat/formats/IFlvFormat.ts#L87)

***

### readAVPacket()

> **readAVPacket**(`formatContext`, `avpacket`): `Promise`\<`number`\>

#### Parameters

• **formatContext**: [`AVIFormatContext`](../../../AVformatContext/interfaces/AVIFormatContext.md)

• **avpacket**: `pointer`\<[`AVPacket`](../../../../avutil/struct/avpacket/classes/AVPacket.md)\>

#### Returns

`Promise`\<`number`\>

#### Overrides

`IFormat.readAVPacket`

#### Source

[avformat/formats/IFlvFormat.ts:443](https://github.com/zhaohappy/libmedia/blob/b4bb608d2b1c00d036d73fc8d222b1a97be53694/src/avformat/formats/IFlvFormat.ts#L443)

***

### readHeader()

> **readHeader**(`formatContext`): `Promise`\<`number`\>

#### Parameters

• **formatContext**: [`AVIFormatContext`](../../../AVformatContext/interfaces/AVIFormatContext.md)

#### Returns

`Promise`\<`number`\>

#### Overrides

`IFormat.readHeader`

#### Source

[avformat/formats/IFlvFormat.ts:93](https://github.com/zhaohappy/libmedia/blob/b4bb608d2b1c00d036d73fc8d222b1a97be53694/src/avformat/formats/IFlvFormat.ts#L93)

***

### seek()

> **seek**(`formatContext`, `stream`, `timestamp`, `flags`): `Promise`\<`int64`\>

#### Parameters

• **formatContext**: [`AVIFormatContext`](../../../AVformatContext/interfaces/AVIFormatContext.md)

• **stream**: [`AVStream`](../../../AVStream/classes/AVStream.md)

• **timestamp**: `int64`

• **flags**: `int32`

#### Returns

`Promise`\<`int64`\>

#### Overrides

`IFormat.seek`

#### Source

[avformat/formats/IFlvFormat.ts:526](https://github.com/zhaohappy/libmedia/blob/b4bb608d2b1c00d036d73fc8d222b1a97be53694/src/avformat/formats/IFlvFormat.ts#L526)

***

### syncTag()

> **syncTag**(`formatContext`): `Promise`\<`void`\>

#### Parameters

• **formatContext**: [`AVIFormatContext`](../../../AVformatContext/interfaces/AVIFormatContext.md)

#### Returns

`Promise`\<`void`\>

#### Source

[avformat/formats/IFlvFormat.ts:458](https://github.com/zhaohappy/libmedia/blob/b4bb608d2b1c00d036d73fc8d222b1a97be53694/src/avformat/formats/IFlvFormat.ts#L458)
