[**libmedia**](../../../../README.md) • **Docs**

***

[libmedia](../../../../README.md) / [avformat/formats/OMovFormat](../README.md) / OMovFormat

# Class: OMovFormat

## Extends

- `default`

## Constructors

### new OMovFormat()

> **new OMovFormat**(`options`): [`OMovFormat`](OMovFormat.md)

#### Parameters

• **options**: `MovFormatOptions`= `{}`

#### Returns

[`OMovFormat`](OMovFormat.md)

#### Overrides

`OFormat.constructor`

#### Source

[avformat/formats/OMovFormat.ts:78](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avformat/formats/OMovFormat.ts#L78)

## Properties

### options

> **options**: `MovFormatOptions`

#### Source

[avformat/formats/OMovFormat.ts:74](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avformat/formats/OMovFormat.ts#L74)

***

### type

> **type**: `AVFormat` = `AVFormat.MOV`

#### Overrides

`OFormat.type`

#### Source

[avformat/formats/OMovFormat.ts:70](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avformat/formats/OMovFormat.ts#L70)

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

[avformat/formats/OMovFormat.ts:97](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avformat/formats/OMovFormat.ts#L97)

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

[avformat/formats/OMovFormat.ts:827](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avformat/formats/OMovFormat.ts#L827)

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

[avformat/formats/OMovFormat.ts:86](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avformat/formats/OMovFormat.ts#L86)

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

[avformat/formats/OMovFormat.ts:539](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avformat/formats/OMovFormat.ts#L539)

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

[avformat/formats/OMovFormat.ts:157](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avformat/formats/OMovFormat.ts#L157)

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

[avformat/formats/OMovFormat.ts:720](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avformat/formats/OMovFormat.ts#L720)
