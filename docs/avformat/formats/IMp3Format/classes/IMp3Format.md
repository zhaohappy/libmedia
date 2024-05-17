[**libmedia**](../../../../README.md) • **Docs**

***

[libmedia](../../../../README.md) / [avformat/formats/IMp3Format](../README.md) / IMp3Format

# Class: IMp3Format

## Extends

- `default`

## Constructors

### new IMp3Format()

> **new IMp3Format**(): [`IMp3Format`](IMp3Format.md)

#### Returns

[`IMp3Format`](IMp3Format.md)

#### Overrides

`IFormat.constructor`

#### Source

[avformat/formats/IMp3Format.ts:64](https://github.com/zhaohappy/libmedia/blob/acbbf6bd75e6ee4c968b9f441fe28c40f42f350d/src/avformat/formats/IMp3Format.ts#L64)

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

[avformat/formats/IFormat.ts:35](https://github.com/zhaohappy/libmedia/blob/acbbf6bd75e6ee4c968b9f441fe28c40f42f350d/src/avformat/formats/IFormat.ts#L35)

***

### type

> **type**: `AVFormat` = `AVFormat.MP3`

#### Overrides

`IFormat.type`

#### Source

[avformat/formats/IMp3Format.ts:60](https://github.com/zhaohappy/libmedia/blob/acbbf6bd75e6ee4c968b9f441fe28c40f42f350d/src/avformat/formats/IMp3Format.ts#L60)

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

[avformat/formats/IFormat.ts:39](https://github.com/zhaohappy/libmedia/blob/acbbf6bd75e6ee4c968b9f441fe28c40f42f350d/src/avformat/formats/IFormat.ts#L39)

***

### getAnalyzeStreamsCount()

> **getAnalyzeStreamsCount**(): `number`

#### Returns

`number`

#### Overrides

`IFormat.getAnalyzeStreamsCount`

#### Source

[avformat/formats/IMp3Format.ts:470](https://github.com/zhaohappy/libmedia/blob/acbbf6bd75e6ee4c968b9f441fe28c40f42f350d/src/avformat/formats/IMp3Format.ts#L470)

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

[avformat/formats/IMp3Format.ts:68](https://github.com/zhaohappy/libmedia/blob/acbbf6bd75e6ee4c968b9f441fe28c40f42f350d/src/avformat/formats/IMp3Format.ts#L68)

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

[avformat/formats/IMp3Format.ts:303](https://github.com/zhaohappy/libmedia/blob/acbbf6bd75e6ee4c968b9f441fe28c40f42f350d/src/avformat/formats/IMp3Format.ts#L303)

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

[avformat/formats/IMp3Format.ts:85](https://github.com/zhaohappy/libmedia/blob/acbbf6bd75e6ee4c968b9f441fe28c40f42f350d/src/avformat/formats/IMp3Format.ts#L85)

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

[avformat/formats/IMp3Format.ts:407](https://github.com/zhaohappy/libmedia/blob/acbbf6bd75e6ee4c968b9f441fe28c40f42f350d/src/avformat/formats/IMp3Format.ts#L407)