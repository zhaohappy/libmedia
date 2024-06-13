[**libmedia**](../../../../README.md) • **Docs**

***

[libmedia](../../../../README.md) / [avformat/formats/OFlvFormat](../README.md) / OFlvFormat

# Class: OFlvFormat

## Extends

- `default`

## Constructors

### new OFlvFormat()

> **new OFlvFormat**(`options`): [`OFlvFormat`](OFlvFormat.md)

#### Parameters

• **options**: [`FlvFormatOptions`](../interfaces/FlvFormatOptions.md)= `{}`

#### Returns

[`OFlvFormat`](OFlvFormat.md)

#### Overrides

`OFormat.constructor`

#### Source

[avformat/formats/OFlvFormat.ts:72](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avformat/formats/OFlvFormat.ts#L72)

## Properties

### header

> **header**: `default`

#### Source

[avformat/formats/OFlvFormat.ts:64](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avformat/formats/OFlvFormat.ts#L64)

***

### options

> **options**: [`FlvFormatOptions`](../interfaces/FlvFormatOptions.md)

#### Source

[avformat/formats/OFlvFormat.ts:68](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avformat/formats/OFlvFormat.ts#L68)

***

### script

> **script**: `default`

#### Source

[avformat/formats/OFlvFormat.ts:66](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avformat/formats/OFlvFormat.ts#L66)

***

### type

> **type**: `AVFormat` = `AVFormat.FLV`

#### Overrides

`OFormat.type`

#### Source

[avformat/formats/OFlvFormat.ts:60](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avformat/formats/OFlvFormat.ts#L60)

## Methods

### destroy()

> **destroy**(`formatContext`): `void`

#### Parameters

• **formatContext**: [`AVOFormatContext`](../../../AVFormatContext/interfaces/AVOFormatContext.md)

#### Returns

`void`

#### Overrides

`OFormat.destroy`

#### Source

[avformat/formats/OFlvFormat.ts:149](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avformat/formats/OFlvFormat.ts#L149)

***

### flush()

> **flush**(`context`): `number`

#### Parameters

• **context**: [`AVOFormatContext`](../../../AVFormatContext/interfaces/AVOFormatContext.md)

#### Returns

`number`

#### Overrides

`OFormat.flush`

#### Source

[avformat/formats/OFlvFormat.ts:439](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avformat/formats/OFlvFormat.ts#L439)

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

[avformat/formats/OFlvFormat.ts:99](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avformat/formats/OFlvFormat.ts#L99)

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

[avformat/formats/OFlvFormat.ts:214](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avformat/formats/OFlvFormat.ts#L214)

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

[avformat/formats/OFlvFormat.ts:157](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avformat/formats/OFlvFormat.ts#L157)

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

[avformat/formats/OFlvFormat.ts:345](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avformat/formats/OFlvFormat.ts#L345)
