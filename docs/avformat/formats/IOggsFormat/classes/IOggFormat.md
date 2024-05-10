[**libmedia**](../../../../README.md) • **Docs**

***

[libmedia](../../../../README.md) / [avformat/formats/IOggsFormat](../README.md) / IOggFormat

# Class: IOggFormat

## Extends

- `default`

## Constructors

### new IOggFormat()

> **new IOggFormat**(): [`IOggFormat`](IOggFormat.md)

#### Returns

[`IOggFormat`](IOggFormat.md)

#### Overrides

`IFormat.constructor`

#### Source

[avformat/formats/IOggsFormat.ts:55](https://github.com/zhaohappy/libmedia/blob/b4bb608d2b1c00d036d73fc8d222b1a97be53694/src/avformat/formats/IOggsFormat.ts#L55)

## Properties

### headerPagesPayload

> **headerPagesPayload**: `PagePayload`[]

#### Source

[avformat/formats/IOggsFormat.ts:51](https://github.com/zhaohappy/libmedia/blob/b4bb608d2b1c00d036d73fc8d222b1a97be53694/src/avformat/formats/IOggsFormat.ts#L51)

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

### type

> **type**: `AVFormat` = `AVFormat.OGGS`

#### Overrides

`IFormat.type`

#### Source

[avformat/formats/IOggsFormat.ts:49](https://github.com/zhaohappy/libmedia/blob/b4bb608d2b1c00d036d73fc8d222b1a97be53694/src/avformat/formats/IOggsFormat.ts#L49)

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

[avformat/formats/IOggsFormat.ts:202](https://github.com/zhaohappy/libmedia/blob/b4bb608d2b1c00d036d73fc8d222b1a97be53694/src/avformat/formats/IOggsFormat.ts#L202)

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

[avformat/formats/IOggsFormat.ts:61](https://github.com/zhaohappy/libmedia/blob/b4bb608d2b1c00d036d73fc8d222b1a97be53694/src/avformat/formats/IOggsFormat.ts#L61)

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

[avformat/formats/IOggsFormat.ts:133](https://github.com/zhaohappy/libmedia/blob/b4bb608d2b1c00d036d73fc8d222b1a97be53694/src/avformat/formats/IOggsFormat.ts#L133)

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

[avformat/formats/IOggsFormat.ts:71](https://github.com/zhaohappy/libmedia/blob/b4bb608d2b1c00d036d73fc8d222b1a97be53694/src/avformat/formats/IOggsFormat.ts#L71)

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

[avformat/formats/IOggsFormat.ts:198](https://github.com/zhaohappy/libmedia/blob/b4bb608d2b1c00d036d73fc8d222b1a97be53694/src/avformat/formats/IOggsFormat.ts#L198)
