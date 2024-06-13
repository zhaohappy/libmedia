[**libmedia**](../../../README.md) • **Docs**

***

[libmedia](../../../README.md) / [avformat/AVFormatContext](../README.md) / AVOFormatContext

# Interface: AVOFormatContext

## Properties

### errorFlag

> **errorFlag**: `number`

#### Source

[avformat/AVFormatContext.ts:98](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avformat/AVFormatContext.ts#L98)

***

### interval

> **interval**: `AVFormatContextInterval`

#### Source

[avformat/AVFormatContext.ts:100](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avformat/AVFormatContext.ts#L100)

***

### ioWriter

> **ioWriter**: [`IOWriterSync`](../../../common/io/IOWriterSync/classes/IOWriterSync.md)

#### Source

[avformat/AVFormatContext.ts:96](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avformat/AVFormatContext.ts#L96)

***

### metadataHeaderPadding

> **metadataHeaderPadding**: `int32`

#### Source

[avformat/AVFormatContext.ts:85](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avformat/AVFormatContext.ts#L85)

***

### oformat

> **oformat**: `default`

#### Source

[avformat/AVFormatContext.ts:94](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avformat/AVFormatContext.ts#L94)

***

### options

> **options**: `Record`\<`string`, `any`\>

#### Source

[avformat/AVFormatContext.ts:89](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avformat/AVFormatContext.ts#L89)

***

### privateData

> **privateData**: `Record`\<`string`, `any`\>

#### Source

[avformat/AVFormatContext.ts:91](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avformat/AVFormatContext.ts#L91)

***

### processPrivateData

> **processPrivateData**: `Record`\<`string`, `any`\>

#### Source

[avformat/AVFormatContext.ts:92](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avformat/AVFormatContext.ts#L92)

***

### streamIndex

> **streamIndex**: `number`

#### Source

[avformat/AVFormatContext.ts:102](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avformat/AVFormatContext.ts#L102)

***

### streams

> **streams**: [`AVStream`](../../AVStream/classes/AVStream.md)[]

#### Source

[avformat/AVFormatContext.ts:87](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avformat/AVFormatContext.ts#L87)

## Methods

### addStream()

> **addStream**(`stream`): `void`

#### Parameters

• **stream**: [`AVStream`](../../AVStream/classes/AVStream.md)

#### Returns

`void`

#### Source

[avformat/AVFormatContext.ts:112](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avformat/AVFormatContext.ts#L112)

***

### createStream()

> **createStream**(): [`AVStream`](../../AVStream/classes/AVStream.md)

#### Returns

[`AVStream`](../../AVStream/classes/AVStream.md)

#### Source

[avformat/AVFormatContext.ts:110](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avformat/AVFormatContext.ts#L110)

***

### destroy()

> **destroy**(): `void`

#### Returns

`void`

#### Source

[avformat/AVFormatContext.ts:120](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avformat/AVFormatContext.ts#L120)

***

### getStreamById()

> **getStreamById**(`id`): [`AVStream`](../../AVStream/classes/AVStream.md)

#### Parameters

• **id**: `number`

#### Returns

[`AVStream`](../../AVStream/classes/AVStream.md)

#### Source

[avformat/AVFormatContext.ts:104](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avformat/AVFormatContext.ts#L104)

***

### getStreamByIndex()

> **getStreamByIndex**(`index`): [`AVStream`](../../AVStream/classes/AVStream.md)

#### Parameters

• **index**: `number`

#### Returns

[`AVStream`](../../AVStream/classes/AVStream.md)

#### Source

[avformat/AVFormatContext.ts:106](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avformat/AVFormatContext.ts#L106)

***

### getStreamByMediaType()

> **getStreamByMediaType**(`mediaType`): [`AVStream`](../../AVStream/classes/AVStream.md)

#### Parameters

• **mediaType**: `AVMediaType`

#### Returns

[`AVStream`](../../AVStream/classes/AVStream.md)

#### Source

[avformat/AVFormatContext.ts:108](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avformat/AVFormatContext.ts#L108)

***

### removeStream()

> **removeStream**(`stream`): `void`

#### Parameters

• **stream**: [`AVStream`](../../AVStream/classes/AVStream.md)

#### Returns

`void`

#### Source

[avformat/AVFormatContext.ts:114](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avformat/AVFormatContext.ts#L114)

***

### removeStreamById()

> **removeStreamById**(`id`): `void`

#### Parameters

• **id**: `number`

#### Returns

`void`

#### Source

[avformat/AVFormatContext.ts:116](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avformat/AVFormatContext.ts#L116)

***

### removeStreamByIndex()

> **removeStreamByIndex**(`index`): `void`

#### Parameters

• **index**: `number`

#### Returns

`void`

#### Source

[avformat/AVFormatContext.ts:118](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avformat/AVFormatContext.ts#L118)
