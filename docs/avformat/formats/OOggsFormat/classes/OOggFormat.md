[**libmedia**](../../../../README.md) • **Docs**

***

[libmedia](../../../../README.md) / [avformat/formats/OOggsFormat](../README.md) / OOggFormat

# Class: OOggFormat

## Extends

- `default`

## Constructors

### new OOggFormat()

> **new OOggFormat**(): [`OOggFormat`](OOggFormat.md)

#### Returns

[`OOggFormat`](OOggFormat.md)

#### Overrides

`OFormat.constructor`

#### Source

[avformat/formats/OOggsFormat.ts:66](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avformat/formats/OOggsFormat.ts#L66)

## Properties

### headerPagesPayload

> **headerPagesPayload**: `PagePayload`[]

#### Source

[avformat/formats/OOggsFormat.ts:60](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avformat/formats/OOggsFormat.ts#L60)

***

### type

> **type**: `AVFormat` = `AVFormat.OGGS`

#### Overrides

`OFormat.type`

#### Source

[avformat/formats/OOggsFormat.ts:56](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avformat/formats/OOggsFormat.ts#L56)

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

[avformat/formats/OOggsFormat.ts:214](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avformat/formats/OOggsFormat.ts#L214)

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

[avformat/formats/OOggsFormat.ts:91](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avformat/formats/OOggsFormat.ts#L91)

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

[avformat/formats/OOggsFormat.ts:184](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avformat/formats/OOggsFormat.ts#L184)

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

[avformat/formats/OOggsFormat.ts:168](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avformat/formats/OOggsFormat.ts#L168)

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

[avformat/formats/OOggsFormat.ts:209](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avformat/formats/OOggsFormat.ts#L209)
