[**libmedia**](../../../../README.md) • **Docs**

***

[libmedia](../../../../README.md) / [avformat/formats/OMatroskaFormat](../README.md) / OMatroskaFormat

# Class: OMatroskaFormat

## Extends

- `default`

## Constructors

### new OMatroskaFormat()

> **new OMatroskaFormat**(`options`): [`OMatroskaFormat`](OMatroskaFormat.md)

#### Parameters

• **options**: [`OMatroskaFormatOptions`](../interfaces/OMatroskaFormatOptions.md)= `{}`

#### Returns

[`OMatroskaFormat`](OMatroskaFormat.md)

#### Overrides

`OFormat.constructor`

#### Source

[avformat/formats/OMatroskaFormat.ts:89](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avformat/formats/OMatroskaFormat.ts#L89)

## Properties

### type

> **type**: `AVFormat` = `AVFormat.MATROSKA`

#### Overrides

`OFormat.type`

#### Source

[avformat/formats/OMatroskaFormat.ts:80](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avformat/formats/OMatroskaFormat.ts#L80)

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

[avformat/formats/OFormat.ts:36](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avformat/formats/OFormat.ts#L36)

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

[avformat/formats/OMatroskaFormat.ts:480](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avformat/formats/OMatroskaFormat.ts#L480)

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

[avformat/formats/OMatroskaFormat.ts:97](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avformat/formats/OMatroskaFormat.ts#L97)

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

[avformat/formats/OMatroskaFormat.ts:343](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avformat/formats/OMatroskaFormat.ts#L343)

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

[avformat/formats/OMatroskaFormat.ts:276](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avformat/formats/OMatroskaFormat.ts#L276)

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

[avformat/formats/OMatroskaFormat.ts:388](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avformat/formats/OMatroskaFormat.ts#L388)
