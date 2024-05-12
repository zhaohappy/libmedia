[**libmedia**](../../../../README.md) • **Docs**

***

[libmedia](../../../../README.md) / [avformat/formats/OIvfFormat](../README.md) / OIVFFormat

# Class: OIVFFormat

## Extends

- `default`

## Constructors

### new OIVFFormat()

> **new OIVFFormat**(): [`OIVFFormat`](OIVFFormat.md)

#### Returns

[`OIVFFormat`](OIVFFormat.md)

#### Overrides

`OFormat.constructor`

#### Source

[avformat/formats/OIvfFormat.ts:76](https://github.com/zhaohappy/libmedia/blob/acbbf6bd75e6ee4c968b9f441fe28c40f42f350d/src/avformat/formats/OIvfFormat.ts#L76)

## Properties

### header

> **header**: [`IVFHeader`](IVFHeader.md)

#### Source

[avformat/formats/OIvfFormat.ts:74](https://github.com/zhaohappy/libmedia/blob/acbbf6bd75e6ee4c968b9f441fe28c40f42f350d/src/avformat/formats/OIvfFormat.ts#L74)

***

### type

> **type**: `AVFormat` = `AVFormat.IVF`

#### Overrides

`OFormat.type`

#### Source

[avformat/formats/OIvfFormat.ts:72](https://github.com/zhaohappy/libmedia/blob/acbbf6bd75e6ee4c968b9f441fe28c40f42f350d/src/avformat/formats/OIvfFormat.ts#L72)

## Methods

### destroy()

> **destroy**(`formatContext`): `void`

#### Parameters

• **formatContext**: [`AVOFormatContext`](../../../AVFormatContext/interfaces/AVOFormatContext.md)

#### Returns

`void`

#### Inherited from

`OFormat.destroy`

#### Source

[avformat/formats/OFormat.ts:36](https://github.com/zhaohappy/libmedia/blob/acbbf6bd75e6ee4c968b9f441fe28c40f42f350d/src/avformat/formats/OFormat.ts#L36)

***

### flush()

> **flush**(`formatContext`): `number`

#### Parameters

• **formatContext**: [`AVOFormatContext`](../../../AVFormatContext/interfaces/AVOFormatContext.md)

#### Returns

`number`

#### Overrides

`OFormat.flush`

#### Source

[avformat/formats/OIvfFormat.ts:154](https://github.com/zhaohappy/libmedia/blob/acbbf6bd75e6ee4c968b9f441fe28c40f42f350d/src/avformat/formats/OIvfFormat.ts#L154)

***

### init()

> **init**(`formatContext`): `number`

#### Parameters

• **formatContext**: [`AVOFormatContext`](../../../AVFormatContext/interfaces/AVOFormatContext.md)

#### Returns

`number`

#### Overrides

`OFormat.init`

#### Source

[avformat/formats/OIvfFormat.ts:82](https://github.com/zhaohappy/libmedia/blob/acbbf6bd75e6ee4c968b9f441fe28c40f42f350d/src/avformat/formats/OIvfFormat.ts#L82)

***

### writeAVPacket()

> **writeAVPacket**(`formatContext`, `avpacket`): `number`

#### Parameters

• **formatContext**: [`AVOFormatContext`](../../../AVFormatContext/interfaces/AVOFormatContext.md)

• **avpacket**: `pointer`\<[`AVPacket`](../../../../avutil/struct/avpacket/classes/AVPacket.md)\>

#### Returns

`number`

#### Overrides

`OFormat.writeAVPacket`

#### Source

[avformat/formats/OIvfFormat.ts:118](https://github.com/zhaohappy/libmedia/blob/acbbf6bd75e6ee4c968b9f441fe28c40f42f350d/src/avformat/formats/OIvfFormat.ts#L118)

***

### writeHeader()

> **writeHeader**(`formatContext`): `number`

#### Parameters

• **formatContext**: [`AVOFormatContext`](../../../AVFormatContext/interfaces/AVOFormatContext.md)

#### Returns

`number`

#### Overrides

`OFormat.writeHeader`

#### Source

[avformat/formats/OIvfFormat.ts:94](https://github.com/zhaohappy/libmedia/blob/acbbf6bd75e6ee4c968b9f441fe28c40f42f350d/src/avformat/formats/OIvfFormat.ts#L94)

***

### writeTrailer()

> **writeTrailer**(`formatContext`): `number`

#### Parameters

• **formatContext**: [`AVOFormatContext`](../../../AVFormatContext/interfaces/AVOFormatContext.md)

#### Returns

`number`

#### Overrides

`OFormat.writeTrailer`

#### Source

[avformat/formats/OIvfFormat.ts:144](https://github.com/zhaohappy/libmedia/blob/acbbf6bd75e6ee4c968b9f441fe28c40f42f350d/src/avformat/formats/OIvfFormat.ts#L144)
