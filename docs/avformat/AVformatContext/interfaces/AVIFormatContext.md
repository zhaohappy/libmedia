[**libmedia**](../../../README.md) • **Docs**

***

[libmedia](../../../README.md) / [avformat/AVFormatContext](../README.md) / AVIFormatContext

# Interface: AVIFormatContext

## Properties

### chapters

> **chapters**: [`AVChapter`](AVChapter.md)[]

#### Source

[avformat/AVFormatContext.ts:85](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avformat/AVFormatContext.ts#L85)

***

### errorFlag

> **errorFlag**: `number`

#### Source

[avformat/AVFormatContext.ts:94](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avformat/AVFormatContext.ts#L94)

***

### format

> **format**: `AVFormat`

#### Source

[avformat/AVFormatContext.ts:89](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avformat/AVFormatContext.ts#L89)

***

### getDecoderResource()

> **getDecoderResource**: (`mediaType`, `codecId`) => `WebAssemblyResource` \| `Promise`\<`WebAssemblyResource`\>

#### Parameters

• **mediaType**: `AVMediaType`

• **codecId**: `AVCodecID`

#### Returns

`WebAssemblyResource` \| `Promise`\<`WebAssemblyResource`\>

#### Source

[avformat/AVFormatContext.ts:118](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avformat/AVFormatContext.ts#L118)

***

### iformat

> **iformat**: `default`

#### Source

[avformat/AVFormatContext.ts:90](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avformat/AVFormatContext.ts#L90)

***

### interval

> **interval**: `AVFormatContextInterval`

#### Source

[avformat/AVFormatContext.ts:96](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avformat/AVFormatContext.ts#L96)

***

### ioReader

> **ioReader**: [`IOReader`](../../../common/io/IOReader/classes/IOReader.md)

#### Source

[avformat/AVFormatContext.ts:92](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avformat/AVFormatContext.ts#L92)

***

### metadata

> **metadata**: `Record`\<`string`, `any`\>

#### Source

[avformat/AVFormatContext.ts:81](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avformat/AVFormatContext.ts#L81)

***

### options

> **options**: `Record`\<`string`, `any`\>

#### Source

[avformat/AVFormatContext.ts:84](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avformat/AVFormatContext.ts#L84)

***

### privateData

> **privateData**: `Record`\<`string`, `any`\>

#### Source

[avformat/AVFormatContext.ts:87](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avformat/AVFormatContext.ts#L87)

***

### streamIndex

> **streamIndex**: `number`

#### Source

[avformat/AVFormatContext.ts:98](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avformat/AVFormatContext.ts#L98)

***

### streams

> **streams**: [`AVStream`](../../AVStream/classes/AVStream.md)[]

#### Source

[avformat/AVFormatContext.ts:82](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avformat/AVFormatContext.ts#L82)

## Methods

### addStream()

> **addStream**(`stream`): `void`

#### Parameters

• **stream**: [`AVStream`](../../AVStream/classes/AVStream.md)

#### Returns

`void`

#### Source

[avformat/AVFormatContext.ts:108](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avformat/AVFormatContext.ts#L108)

***

### createStream()

> **createStream**(): [`AVStream`](../../AVStream/classes/AVStream.md)

#### Returns

[`AVStream`](../../AVStream/classes/AVStream.md)

#### Source

[avformat/AVFormatContext.ts:106](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avformat/AVFormatContext.ts#L106)

***

### destroy()

> **destroy**(): `void`

#### Returns

`void`

#### Source

[avformat/AVFormatContext.ts:116](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avformat/AVFormatContext.ts#L116)

***

### getStreamById()

> **getStreamById**(`id`): [`AVStream`](../../AVStream/classes/AVStream.md)

#### Parameters

• **id**: `number`

#### Returns

[`AVStream`](../../AVStream/classes/AVStream.md)

#### Source

[avformat/AVFormatContext.ts:100](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avformat/AVFormatContext.ts#L100)

***

### getStreamByIndex()

> **getStreamByIndex**(`index`): [`AVStream`](../../AVStream/classes/AVStream.md)

#### Parameters

• **index**: `number`

#### Returns

[`AVStream`](../../AVStream/classes/AVStream.md)

#### Source

[avformat/AVFormatContext.ts:102](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avformat/AVFormatContext.ts#L102)

***

### getStreamByMediaType()

> **getStreamByMediaType**(`mediaType`): [`AVStream`](../../AVStream/classes/AVStream.md)

#### Parameters

• **mediaType**: `AVMediaType`

#### Returns

[`AVStream`](../../AVStream/classes/AVStream.md)

#### Source

[avformat/AVFormatContext.ts:104](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avformat/AVFormatContext.ts#L104)

***

### removeStream()

> **removeStream**(`stream`): `void`

#### Parameters

• **stream**: [`AVStream`](../../AVStream/classes/AVStream.md)

#### Returns

`void`

#### Source

[avformat/AVFormatContext.ts:110](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avformat/AVFormatContext.ts#L110)

***

### removeStreamById()

> **removeStreamById**(`id`): `void`

#### Parameters

• **id**: `number`

#### Returns

`void`

#### Source

[avformat/AVFormatContext.ts:112](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avformat/AVFormatContext.ts#L112)

***

### removeStreamByIndex()

> **removeStreamByIndex**(`index`): `void`

#### Parameters

• **index**: `number`

#### Returns

`void`

#### Source

[avformat/AVFormatContext.ts:114](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avformat/AVFormatContext.ts#L114)
