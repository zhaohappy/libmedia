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

[avformat/formats/IOggsFormat.ts:74](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avformat/formats/IOggsFormat.ts#L74)

## Properties

### headerPagesPayload

> **headerPagesPayload**: `PagePayload`[]

#### Source

[avformat/formats/IOggsFormat.ts:59](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avformat/formats/IOggsFormat.ts#L59)

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

[avformat/formats/IFormat.ts:35](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avformat/formats/IFormat.ts#L35)

***

### type

> **type**: `AVFormat` = `AVFormat.OGGS`

#### Overrides

`IFormat.type`

#### Source

[avformat/formats/IOggsFormat.ts:57](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avformat/formats/IOggsFormat.ts#L57)

## Methods

### destroy()

> **destroy**(`formatContext`): `void`

#### Parameters

• **formatContext**: [`AVIFormatContext`](../../../AVFormatContext/interfaces/AVIFormatContext.md)

#### Returns

`void`

#### Inherited from

`IFormat.destroy`

#### Source

[avformat/formats/IFormat.ts:39](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avformat/formats/IFormat.ts#L39)

***

### getAnalyzeStreamsCount()

> **getAnalyzeStreamsCount**(): `number`

#### Returns

`number`

#### Overrides

`IFormat.getAnalyzeStreamsCount`

#### Source

[avformat/formats/IOggsFormat.ts:452](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avformat/formats/IOggsFormat.ts#L452)

***

### init()

> **init**(`formatContext`): `void`

#### Parameters

• **formatContext**: [`AVIFormatContext`](../../../AVFormatContext/interfaces/AVIFormatContext.md)

#### Returns

`void`

#### Overrides

`IFormat.init`

#### Source

[avformat/formats/IOggsFormat.ts:80](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avformat/formats/IOggsFormat.ts#L80)

***

### readAVPacket()

> **readAVPacket**(`formatContext`, `avpacket`): `Promise`\<`number`\>

#### Parameters

• **formatContext**: [`AVIFormatContext`](../../../AVFormatContext/interfaces/AVIFormatContext.md)

• **avpacket**: `pointer`\<[`AVPacket`](../../../../avutil/struct/avpacket/classes/AVPacket.md)\>

#### Returns

`Promise`\<`number`\>

#### Overrides

`IFormat.readAVPacket`

#### Source

[avformat/formats/IOggsFormat.ts:288](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avformat/formats/IOggsFormat.ts#L288)

***

### readHeader()

> **readHeader**(`formatContext`): `Promise`\<`number`\>

#### Parameters

• **formatContext**: [`AVIFormatContext`](../../../AVFormatContext/interfaces/AVIFormatContext.md)

#### Returns

`Promise`\<`number`\>

#### Overrides

`IFormat.readHeader`

#### Source

[avformat/formats/IOggsFormat.ts:162](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avformat/formats/IOggsFormat.ts#L162)

***

### seek()

> **seek**(`formatContext`, `stream`, `timestamp`, `flags`): `Promise`\<`int64`\>

#### Parameters

• **formatContext**: [`AVIFormatContext`](../../../AVFormatContext/interfaces/AVIFormatContext.md)

• **stream**: [`AVStream`](../../../AVStream/classes/AVStream.md)

• **timestamp**: `int64`

• **flags**: `int32`

#### Returns

`Promise`\<`int64`\>

#### Overrides

`IFormat.seek`

#### Source

[avformat/formats/IOggsFormat.ts:415](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avformat/formats/IOggsFormat.ts#L415)
