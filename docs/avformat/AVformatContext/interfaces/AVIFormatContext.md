[**libmedia**](../../../README.md) • **Docs**

***

[libmedia](../../../README.md) / [avformat/AVFormatContext](../README.md) / AVIFormatContext

# Interface: AVIFormatContext

## Properties

### errorFlag

> **errorFlag**: `number`

#### Source

[avformat/AVFormatContext.ts:58](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avformat/AVFormatContext.ts#L58)

***

### iformat

> **iformat**: `default`

#### Source

[avformat/AVFormatContext.ts:54](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avformat/AVFormatContext.ts#L54)

***

### interval

> **interval**: `AVFormatContextInterval`

#### Source

[avformat/AVFormatContext.ts:60](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avformat/AVFormatContext.ts#L60)

***

### ioReader

> **ioReader**: [`IOReader`](../../../common/io/IOReader/classes/IOReader.md)

#### Source

[avformat/AVFormatContext.ts:56](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avformat/AVFormatContext.ts#L56)

***

### options

> **options**: `Record`\<`string`, `any`\>

#### Source

[avformat/AVFormatContext.ts:50](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avformat/AVFormatContext.ts#L50)

***

### privateData

> **privateData**: `Record`\<`string`, `any`\>

#### Source

[avformat/AVFormatContext.ts:52](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avformat/AVFormatContext.ts#L52)

***

### streamIndex

> **streamIndex**: `number`

#### Source

[avformat/AVFormatContext.ts:62](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avformat/AVFormatContext.ts#L62)

***

### streams

> **streams**: [`AVStream`](../../AVStream/classes/AVStream.md)[]

#### Source

[avformat/AVFormatContext.ts:48](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avformat/AVFormatContext.ts#L48)

## Methods

### addStream()

> **addStream**(`stream`): `void`

#### Parameters

• **stream**: [`AVStream`](../../AVStream/classes/AVStream.md)

#### Returns

`void`

#### Source

[avformat/AVFormatContext.ts:72](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avformat/AVFormatContext.ts#L72)

***

### createStream()

> **createStream**(): [`AVStream`](../../AVStream/classes/AVStream.md)

#### Returns

[`AVStream`](../../AVStream/classes/AVStream.md)

#### Source

[avformat/AVFormatContext.ts:70](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avformat/AVFormatContext.ts#L70)

***

### destroy()

> **destroy**(): `void`

#### Returns

`void`

#### Source

[avformat/AVFormatContext.ts:80](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avformat/AVFormatContext.ts#L80)

***

### getStreamById()

> **getStreamById**(`id`): [`AVStream`](../../AVStream/classes/AVStream.md)

#### Parameters

• **id**: `number`

#### Returns

[`AVStream`](../../AVStream/classes/AVStream.md)

#### Source

[avformat/AVFormatContext.ts:64](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avformat/AVFormatContext.ts#L64)

***

### getStreamByIndex()

> **getStreamByIndex**(`index`): [`AVStream`](../../AVStream/classes/AVStream.md)

#### Parameters

• **index**: `number`

#### Returns

[`AVStream`](../../AVStream/classes/AVStream.md)

#### Source

[avformat/AVFormatContext.ts:66](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avformat/AVFormatContext.ts#L66)

***

### getStreamByMediaType()

> **getStreamByMediaType**(`mediaType`): [`AVStream`](../../AVStream/classes/AVStream.md)

#### Parameters

• **mediaType**: `AVMediaType`

#### Returns

[`AVStream`](../../AVStream/classes/AVStream.md)

#### Source

[avformat/AVFormatContext.ts:68](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avformat/AVFormatContext.ts#L68)

***

### removeStream()

> **removeStream**(`stream`): `void`

#### Parameters

• **stream**: [`AVStream`](../../AVStream/classes/AVStream.md)

#### Returns

`void`

#### Source

[avformat/AVFormatContext.ts:74](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avformat/AVFormatContext.ts#L74)

***

### removeStreamById()

> **removeStreamById**(`id`): `void`

#### Parameters

• **id**: `number`

#### Returns

`void`

#### Source

[avformat/AVFormatContext.ts:76](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avformat/AVFormatContext.ts#L76)

***

### removeStreamByIndex()

> **removeStreamByIndex**(`index`): `void`

#### Parameters

• **index**: `number`

#### Returns

`void`

#### Source

[avformat/AVFormatContext.ts:78](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avformat/AVFormatContext.ts#L78)
