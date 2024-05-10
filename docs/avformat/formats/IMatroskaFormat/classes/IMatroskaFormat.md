[**libmedia**](../../../../README.md) • **Docs**

***

[libmedia](../../../../README.md) / [avformat/formats/IMatroskaFormat](../README.md) / IMatroskaFormat

# Class: IMatroskaFormat

## Extends

- `default`

## Constructors

### new IMatroskaFormat()

> **new IMatroskaFormat**(): [`IMatroskaFormat`](IMatroskaFormat.md)

#### Returns

[`IMatroskaFormat`](IMatroskaFormat.md)

#### Overrides

`IFormat.constructor`

#### Source

[avformat/formats/IMatroskaFormat.ts:68](https://github.com/zhaohappy/libmedia/blob/b4bb608d2b1c00d036d73fc8d222b1a97be53694/src/avformat/formats/IMatroskaFormat.ts#L68)

## Properties

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

### type

> **type**: `AVFormat` = `AVFormat.MATROSKA`

#### Overrides

`IFormat.type`

#### Source

[avformat/formats/IMatroskaFormat.ts:62](https://github.com/zhaohappy/libmedia/blob/b4bb608d2b1c00d036d73fc8d222b1a97be53694/src/avformat/formats/IMatroskaFormat.ts#L62)

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

[avformat/formats/IMatroskaFormat.ts:740](https://github.com/zhaohappy/libmedia/blob/b4bb608d2b1c00d036d73fc8d222b1a97be53694/src/avformat/formats/IMatroskaFormat.ts#L740)

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

[avformat/formats/IMatroskaFormat.ts:72](https://github.com/zhaohappy/libmedia/blob/b4bb608d2b1c00d036d73fc8d222b1a97be53694/src/avformat/formats/IMatroskaFormat.ts#L72)

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

[avformat/formats/IMatroskaFormat.ts:613](https://github.com/zhaohappy/libmedia/blob/b4bb608d2b1c00d036d73fc8d222b1a97be53694/src/avformat/formats/IMatroskaFormat.ts#L613)

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

[avformat/formats/IMatroskaFormat.ts:289](https://github.com/zhaohappy/libmedia/blob/b4bb608d2b1c00d036d73fc8d222b1a97be53694/src/avformat/formats/IMatroskaFormat.ts#L289)

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

[avformat/formats/IMatroskaFormat.ts:691](https://github.com/zhaohappy/libmedia/blob/b4bb608d2b1c00d036d73fc8d222b1a97be53694/src/avformat/formats/IMatroskaFormat.ts#L691)
