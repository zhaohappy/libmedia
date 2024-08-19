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

[avformat/formats/OFlvFormat.ts:73](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avformat/formats/OFlvFormat.ts#L73)

## Properties

### header

> **header**: `default`

#### Source

[avformat/formats/OFlvFormat.ts:65](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avformat/formats/OFlvFormat.ts#L65)

***

### options

> **options**: [`FlvFormatOptions`](../interfaces/FlvFormatOptions.md)

#### Source

[avformat/formats/OFlvFormat.ts:69](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avformat/formats/OFlvFormat.ts#L69)

***

### script

> **script**: `default`

#### Source

[avformat/formats/OFlvFormat.ts:67](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avformat/formats/OFlvFormat.ts#L67)

***

### type

> **type**: `AVFormat` = `AVFormat.FLV`

#### Overrides

`OFormat.type`

#### Source

[avformat/formats/OFlvFormat.ts:61](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avformat/formats/OFlvFormat.ts#L61)

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

[avformat/formats/OFlvFormat.ts:150](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avformat/formats/OFlvFormat.ts#L150)

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

[avformat/formats/OFlvFormat.ts:509](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avformat/formats/OFlvFormat.ts#L509)

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

[avformat/formats/OFlvFormat.ts:100](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avformat/formats/OFlvFormat.ts#L100)

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

[avformat/formats/OFlvFormat.ts:230](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avformat/formats/OFlvFormat.ts#L230)

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

[avformat/formats/OFlvFormat.ts:158](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avformat/formats/OFlvFormat.ts#L158)

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

[avformat/formats/OFlvFormat.ts:402](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avformat/formats/OFlvFormat.ts#L402)
