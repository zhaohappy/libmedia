[**libmedia**](../../../README.md) • **Docs**

***

[libmedia](../../../README.md) / [avformat/AVFormatContext](../README.md) / AVFormatContext

# Class: AVFormatContext

## Implements

- [`AVIFormatContext`](../interfaces/AVIFormatContext.md)
- [`AVOFormatContext`](../interfaces/AVOFormatContext.md)

## Constructors

### new AVFormatContext()

> **new AVFormatContext**(): [`AVFormatContext`](AVFormatContext.md)

#### Returns

[`AVFormatContext`](AVFormatContext.md)

#### Source

[avformat/AVFormatContext.ts:200](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avformat/AVFormatContext.ts#L200)

## Properties

### chapters

> **chapters**: [`AVChapter`](../interfaces/AVChapter.md)[]

#### Implementation of

[`AVOFormatContext`](../interfaces/AVOFormatContext.md).[`chapters`](../interfaces/AVOFormatContext.md#chapters)

#### Source

[avformat/AVFormatContext.ts:179](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avformat/AVFormatContext.ts#L179)

***

### errorFlag

> **errorFlag**: `number`

#### Implementation of

[`AVOFormatContext`](../interfaces/AVOFormatContext.md).[`errorFlag`](../interfaces/AVOFormatContext.md#errorflag)

#### Source

[avformat/AVFormatContext.ts:192](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avformat/AVFormatContext.ts#L192)

***

### getDecoderResource()

> **getDecoderResource**: (`mediaType`, `codecId`) => `WebAssemblyResource` \| `Promise`\<`WebAssemblyResource`\> = `null`

#### Parameters

• **mediaType**: `AVMediaType`

• **codecId**: `AVCodecID`

#### Returns

`WebAssemblyResource` \| `Promise`\<`WebAssemblyResource`\>

#### Implementation of

[`AVIFormatContext`](../interfaces/AVIFormatContext.md).[`getDecoderResource`](../interfaces/AVIFormatContext.md#getdecoderresource)

#### Source

[avformat/AVFormatContext.ts:198](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avformat/AVFormatContext.ts#L198)

***

### iformat

> **iformat**: `default`

#### Implementation of

[`AVIFormatContext`](../interfaces/AVIFormatContext.md).[`iformat`](../interfaces/AVIFormatContext.md#iformat)

#### Source

[avformat/AVFormatContext.ts:184](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avformat/AVFormatContext.ts#L184)

***

### interval

> **interval**: `AVFormatContextInterval`

#### Implementation of

[`AVOFormatContext`](../interfaces/AVOFormatContext.md).[`interval`](../interfaces/AVOFormatContext.md#interval)

#### Source

[avformat/AVFormatContext.ts:194](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avformat/AVFormatContext.ts#L194)

***

### ioReader

> **ioReader**: [`IOReader`](../../../common/io/IOReader/classes/IOReader.md) \| [`IOReaderSync`](../../../common/io/IOReaderSync/classes/IOReaderSync.md)

#### Implementation of

[`AVIFormatContext`](../interfaces/AVIFormatContext.md).[`ioReader`](../interfaces/AVIFormatContext.md#ioreader)

#### Source

[avformat/AVFormatContext.ts:188](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avformat/AVFormatContext.ts#L188)

***

### ioWriter

> **ioWriter**: [`IOWriterSync`](../../../common/io/IOWriterSync/classes/IOWriterSync.md)

#### Implementation of

[`AVOFormatContext`](../interfaces/AVOFormatContext.md).[`ioWriter`](../interfaces/AVOFormatContext.md#iowriter)

#### Source

[avformat/AVFormatContext.ts:190](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avformat/AVFormatContext.ts#L190)

***

### metadata

> **metadata**: `Record`\<`string`, `any`\>

#### Implementation of

[`AVOFormatContext`](../interfaces/AVOFormatContext.md).[`metadata`](../interfaces/AVOFormatContext.md#metadata)

#### Source

[avformat/AVFormatContext.ts:175](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avformat/AVFormatContext.ts#L175)

***

### metadataHeaderPadding

> **metadataHeaderPadding**: `number` = `-1`

#### Implementation of

[`AVOFormatContext`](../interfaces/AVOFormatContext.md).[`metadataHeaderPadding`](../interfaces/AVOFormatContext.md#metadataheaderpadding)

#### Source

[avformat/AVFormatContext.ts:173](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avformat/AVFormatContext.ts#L173)

***

### oformat

> **oformat**: `default`

#### Implementation of

[`AVOFormatContext`](../interfaces/AVOFormatContext.md).[`oformat`](../interfaces/AVOFormatContext.md#oformat)

#### Source

[avformat/AVFormatContext.ts:185](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avformat/AVFormatContext.ts#L185)

***

### options

> **options**: `Record`\<`string`, `any`\>

#### Implementation of

[`AVOFormatContext`](../interfaces/AVOFormatContext.md).[`options`](../interfaces/AVOFormatContext.md#options)

#### Source

[avformat/AVFormatContext.ts:178](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avformat/AVFormatContext.ts#L178)

***

### privateData

> **privateData**: `Record`\<`string`, `any`\>

#### Implementation of

[`AVOFormatContext`](../interfaces/AVOFormatContext.md).[`privateData`](../interfaces/AVOFormatContext.md#privatedata)

#### Source

[avformat/AVFormatContext.ts:181](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avformat/AVFormatContext.ts#L181)

***

### processPrivateData

> **processPrivateData**: `Record`\<`string`, `any`\>

#### Implementation of

[`AVOFormatContext`](../interfaces/AVOFormatContext.md).[`processPrivateData`](../interfaces/AVOFormatContext.md#processprivatedata)

#### Source

[avformat/AVFormatContext.ts:182](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avformat/AVFormatContext.ts#L182)

***

### streamIndex

> **streamIndex**: `number`

#### Implementation of

[`AVOFormatContext`](../interfaces/AVOFormatContext.md).[`streamIndex`](../interfaces/AVOFormatContext.md#streamindex)

#### Source

[avformat/AVFormatContext.ts:196](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avformat/AVFormatContext.ts#L196)

***

### streams

> **streams**: [`AVStream`](../../AVStream/classes/AVStream.md)[]

#### Implementation of

[`AVOFormatContext`](../interfaces/AVOFormatContext.md).[`streams`](../interfaces/AVOFormatContext.md#streams)

#### Source

[avformat/AVFormatContext.ts:176](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avformat/AVFormatContext.ts#L176)

## Accessors

### format

> `get` **format**(): `AVFormat`

#### Returns

`AVFormat`

#### Source

[avformat/AVFormatContext.ts:212](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avformat/AVFormatContext.ts#L212)

## Methods

### addStream()

> **addStream**(`stream`): `void`

#### Parameters

• **stream**: [`AVStream`](../../AVStream/classes/AVStream.md)

#### Returns

`void`

#### Implementation of

[`AVOFormatContext`](../interfaces/AVOFormatContext.md).[`addStream`](../interfaces/AVOFormatContext.md#addstream)

#### Source

[avformat/AVFormatContext.ts:253](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avformat/AVFormatContext.ts#L253)

***

### createStream()

> **createStream**(): [`AVStream`](../../AVStream/classes/AVStream.md)

#### Returns

[`AVStream`](../../AVStream/classes/AVStream.md)

#### Implementation of

[`AVOFormatContext`](../interfaces/AVOFormatContext.md).[`createStream`](../interfaces/AVOFormatContext.md#createstream)

#### Source

[avformat/AVFormatContext.ts:234](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avformat/AVFormatContext.ts#L234)

***

### destroy()

> **destroy**(): `void`

#### Returns

`void`

#### Implementation of

[`AVOFormatContext`](../interfaces/AVOFormatContext.md).[`destroy`](../interfaces/AVOFormatContext.md#destroy)

#### Source

[avformat/AVFormatContext.ts:285](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avformat/AVFormatContext.ts#L285)

***

### getStreamById()

> **getStreamById**(`id`): [`AVStream`](../../AVStream/classes/AVStream.md)

#### Parameters

• **id**: `number`

#### Returns

[`AVStream`](../../AVStream/classes/AVStream.md)

#### Implementation of

[`AVOFormatContext`](../interfaces/AVOFormatContext.md).[`getStreamById`](../interfaces/AVOFormatContext.md#getstreambyid)

#### Source

[avformat/AVFormatContext.ts:222](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avformat/AVFormatContext.ts#L222)

***

### getStreamByIndex()

> **getStreamByIndex**(`index`): [`AVStream`](../../AVStream/classes/AVStream.md)

#### Parameters

• **index**: `number`

#### Returns

[`AVStream`](../../AVStream/classes/AVStream.md)

#### Implementation of

[`AVOFormatContext`](../interfaces/AVOFormatContext.md).[`getStreamByIndex`](../interfaces/AVOFormatContext.md#getstreambyindex)

#### Source

[avformat/AVFormatContext.ts:226](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avformat/AVFormatContext.ts#L226)

***

### getStreamByMediaType()

> **getStreamByMediaType**(`mediaType`): [`AVStream`](../../AVStream/classes/AVStream.md)

#### Parameters

• **mediaType**: `AVMediaType`

#### Returns

[`AVStream`](../../AVStream/classes/AVStream.md)

#### Implementation of

[`AVOFormatContext`](../interfaces/AVOFormatContext.md).[`getStreamByMediaType`](../interfaces/AVOFormatContext.md#getstreambymediatype)

#### Source

[avformat/AVFormatContext.ts:230](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avformat/AVFormatContext.ts#L230)

***

### removeStream()

> **removeStream**(`stream`): `void`

#### Parameters

• **stream**: [`AVStream`](../../AVStream/classes/AVStream.md)

#### Returns

`void`

#### Implementation of

[`AVOFormatContext`](../interfaces/AVOFormatContext.md).[`removeStream`](../interfaces/AVOFormatContext.md#removestream)

#### Source

[avformat/AVFormatContext.ts:258](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avformat/AVFormatContext.ts#L258)

***

### removeStreamById()

> **removeStreamById**(`id`): `void`

#### Parameters

• **id**: `number`

#### Returns

`void`

#### Implementation of

[`AVOFormatContext`](../interfaces/AVOFormatContext.md).[`removeStreamById`](../interfaces/AVOFormatContext.md#removestreambyid)

#### Source

[avformat/AVFormatContext.ts:262](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avformat/AVFormatContext.ts#L262)

***

### removeStreamByIndex()

> **removeStreamByIndex**(`i`): `void`

#### Parameters

• **i**: `number`

#### Returns

`void`

#### Implementation of

[`AVOFormatContext`](../interfaces/AVOFormatContext.md).[`removeStreamByIndex`](../interfaces/AVOFormatContext.md#removestreambyindex)

#### Source

[avformat/AVFormatContext.ts:273](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avformat/AVFormatContext.ts#L273)
