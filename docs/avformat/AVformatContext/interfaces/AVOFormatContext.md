[**libmedia**](../../../README.md) • **Docs**

***

[libmedia](../../../README.md) / [avformat/AVFormatContext](../README.md) / AVOFormatContext

# Interface: AVOFormatContext

## Properties

### chapters

> **chapters**: [`AVChapter`](AVChapter.md)[]

#### Source

[avformat/AVFormatContext.ts:129](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avformat/AVFormatContext.ts#L129)

***

### errorFlag

> **errorFlag**: `number`

#### Source

[avformat/AVFormatContext.ts:139](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avformat/AVFormatContext.ts#L139)

***

### format

> **format**: `AVFormat`

#### Source

[avformat/AVFormatContext.ts:134](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avformat/AVFormatContext.ts#L134)

***

### interval

> **interval**: `AVFormatContextInterval`

#### Source

[avformat/AVFormatContext.ts:141](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avformat/AVFormatContext.ts#L141)

***

### ioWriter

> **ioWriter**: [`IOWriterSync`](../../../common/io/IOWriterSync/classes/IOWriterSync.md)

#### Source

[avformat/AVFormatContext.ts:137](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avformat/AVFormatContext.ts#L137)

***

### metadata

> **metadata**: `Record`\<`string`, `any`\>

#### Source

[avformat/AVFormatContext.ts:125](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avformat/AVFormatContext.ts#L125)

***

### metadataHeaderPadding

> **metadataHeaderPadding**: `int32`

#### Source

[avformat/AVFormatContext.ts:123](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avformat/AVFormatContext.ts#L123)

***

### oformat

> **oformat**: `default`

#### Source

[avformat/AVFormatContext.ts:135](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avformat/AVFormatContext.ts#L135)

***

### options

> **options**: `Record`\<`string`, `any`\>

#### Source

[avformat/AVFormatContext.ts:128](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avformat/AVFormatContext.ts#L128)

***

### privateData

> **privateData**: `Record`\<`string`, `any`\>

#### Source

[avformat/AVFormatContext.ts:131](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avformat/AVFormatContext.ts#L131)

***

### processPrivateData

> **processPrivateData**: `Record`\<`string`, `any`\>

#### Source

[avformat/AVFormatContext.ts:132](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avformat/AVFormatContext.ts#L132)

***

### streamIndex

> **streamIndex**: `number`

#### Source

[avformat/AVFormatContext.ts:143](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avformat/AVFormatContext.ts#L143)

***

### streams

> **streams**: [`AVStream`](../../AVStream/classes/AVStream.md)[]

#### Source

[avformat/AVFormatContext.ts:126](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avformat/AVFormatContext.ts#L126)

## Methods

### addStream()

> **addStream**(`stream`): `void`

#### Parameters

• **stream**: [`AVStream`](../../AVStream/classes/AVStream.md)

#### Returns

`void`

#### Source

[avformat/AVFormatContext.ts:153](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avformat/AVFormatContext.ts#L153)

***

### createStream()

> **createStream**(): [`AVStream`](../../AVStream/classes/AVStream.md)

#### Returns

[`AVStream`](../../AVStream/classes/AVStream.md)

#### Source

[avformat/AVFormatContext.ts:151](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avformat/AVFormatContext.ts#L151)

***

### destroy()

> **destroy**(): `void`

#### Returns

`void`

#### Source

[avformat/AVFormatContext.ts:161](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avformat/AVFormatContext.ts#L161)

***

### getStreamById()

> **getStreamById**(`id`): [`AVStream`](../../AVStream/classes/AVStream.md)

#### Parameters

• **id**: `number`

#### Returns

[`AVStream`](../../AVStream/classes/AVStream.md)

#### Source

[avformat/AVFormatContext.ts:145](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avformat/AVFormatContext.ts#L145)

***

### getStreamByIndex()

> **getStreamByIndex**(`index`): [`AVStream`](../../AVStream/classes/AVStream.md)

#### Parameters

• **index**: `number`

#### Returns

[`AVStream`](../../AVStream/classes/AVStream.md)

#### Source

[avformat/AVFormatContext.ts:147](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avformat/AVFormatContext.ts#L147)

***

### getStreamByMediaType()

> **getStreamByMediaType**(`mediaType`): [`AVStream`](../../AVStream/classes/AVStream.md)

#### Parameters

• **mediaType**: `AVMediaType`

#### Returns

[`AVStream`](../../AVStream/classes/AVStream.md)

#### Source

[avformat/AVFormatContext.ts:149](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avformat/AVFormatContext.ts#L149)

***

### removeStream()

> **removeStream**(`stream`): `void`

#### Parameters

• **stream**: [`AVStream`](../../AVStream/classes/AVStream.md)

#### Returns

`void`

#### Source

[avformat/AVFormatContext.ts:155](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avformat/AVFormatContext.ts#L155)

***

### removeStreamById()

> **removeStreamById**(`id`): `void`

#### Parameters

• **id**: `number`

#### Returns

`void`

#### Source

[avformat/AVFormatContext.ts:157](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avformat/AVFormatContext.ts#L157)

***

### removeStreamByIndex()

> **removeStreamByIndex**(`index`): `void`

#### Parameters

• **index**: `number`

#### Returns

`void`

#### Source

[avformat/AVFormatContext.ts:159](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avformat/AVFormatContext.ts#L159)
