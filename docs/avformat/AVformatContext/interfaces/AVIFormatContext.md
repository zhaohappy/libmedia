[**libmedia**](../../../README.md) • **Docs**

***

[libmedia](../../../README.md) / [avformat/AVformatContext](../README.md) / AVIFormatContext

# Interface: AVIFormatContext

## Properties

### errorFlag

> **errorFlag**: `number`

#### Source

[avformat/AVformatContext.ts:58](https://github.com/zhaohappy/libmedia/blob/b4bb608d2b1c00d036d73fc8d222b1a97be53694/src/avformat/AVformatContext.ts#L58)

***

### iformat

> **iformat**: `default`

#### Source

[avformat/AVformatContext.ts:54](https://github.com/zhaohappy/libmedia/blob/b4bb608d2b1c00d036d73fc8d222b1a97be53694/src/avformat/AVformatContext.ts#L54)

***

### interval

> **interval**: `AVFormatContextInterval`

#### Source

[avformat/AVformatContext.ts:60](https://github.com/zhaohappy/libmedia/blob/b4bb608d2b1c00d036d73fc8d222b1a97be53694/src/avformat/AVformatContext.ts#L60)

***

### ioReader

> **ioReader**: [`IOReader`](../../../common/io/IOReader/classes/IOReader.md)

#### Source

[avformat/AVformatContext.ts:56](https://github.com/zhaohappy/libmedia/blob/b4bb608d2b1c00d036d73fc8d222b1a97be53694/src/avformat/AVformatContext.ts#L56)

***

### options

> **options**: `Record`\<`string`, `any`\>

#### Source

[avformat/AVformatContext.ts:50](https://github.com/zhaohappy/libmedia/blob/b4bb608d2b1c00d036d73fc8d222b1a97be53694/src/avformat/AVformatContext.ts#L50)

***

### privateData

> **privateData**: `Record`\<`string`, `any`\>

#### Source

[avformat/AVformatContext.ts:52](https://github.com/zhaohappy/libmedia/blob/b4bb608d2b1c00d036d73fc8d222b1a97be53694/src/avformat/AVformatContext.ts#L52)

***

### streamIndex

> **streamIndex**: `number`

#### Source

[avformat/AVformatContext.ts:62](https://github.com/zhaohappy/libmedia/blob/b4bb608d2b1c00d036d73fc8d222b1a97be53694/src/avformat/AVformatContext.ts#L62)

***

### streams

> **streams**: [`AVStream`](../../AVStream/classes/AVStream.md)[]

#### Source

[avformat/AVformatContext.ts:48](https://github.com/zhaohappy/libmedia/blob/b4bb608d2b1c00d036d73fc8d222b1a97be53694/src/avformat/AVformatContext.ts#L48)

## Methods

### addStream()

> **addStream**(`stream`): `void`

#### Parameters

• **stream**: [`AVStream`](../../AVStream/classes/AVStream.md)

#### Returns

`void`

#### Source

[avformat/AVformatContext.ts:72](https://github.com/zhaohappy/libmedia/blob/b4bb608d2b1c00d036d73fc8d222b1a97be53694/src/avformat/AVformatContext.ts#L72)

***

### createStream()

> **createStream**(): [`AVStream`](../../AVStream/classes/AVStream.md)

#### Returns

[`AVStream`](../../AVStream/classes/AVStream.md)

#### Source

[avformat/AVformatContext.ts:70](https://github.com/zhaohappy/libmedia/blob/b4bb608d2b1c00d036d73fc8d222b1a97be53694/src/avformat/AVformatContext.ts#L70)

***

### destroy()

> **destroy**(): `void`

#### Returns

`void`

#### Source

[avformat/AVformatContext.ts:80](https://github.com/zhaohappy/libmedia/blob/b4bb608d2b1c00d036d73fc8d222b1a97be53694/src/avformat/AVformatContext.ts#L80)

***

### getStreamById()

> **getStreamById**(`id`): [`AVStream`](../../AVStream/classes/AVStream.md)

#### Parameters

• **id**: `number`

#### Returns

[`AVStream`](../../AVStream/classes/AVStream.md)

#### Source

[avformat/AVformatContext.ts:64](https://github.com/zhaohappy/libmedia/blob/b4bb608d2b1c00d036d73fc8d222b1a97be53694/src/avformat/AVformatContext.ts#L64)

***

### getStreamByIndex()

> **getStreamByIndex**(`index`): [`AVStream`](../../AVStream/classes/AVStream.md)

#### Parameters

• **index**: `number`

#### Returns

[`AVStream`](../../AVStream/classes/AVStream.md)

#### Source

[avformat/AVformatContext.ts:66](https://github.com/zhaohappy/libmedia/blob/b4bb608d2b1c00d036d73fc8d222b1a97be53694/src/avformat/AVformatContext.ts#L66)

***

### getStreamByMediaType()

> **getStreamByMediaType**(`mediaType`): [`AVStream`](../../AVStream/classes/AVStream.md)

#### Parameters

• **mediaType**: `AVMediaType`

#### Returns

[`AVStream`](../../AVStream/classes/AVStream.md)

#### Source

[avformat/AVformatContext.ts:68](https://github.com/zhaohappy/libmedia/blob/b4bb608d2b1c00d036d73fc8d222b1a97be53694/src/avformat/AVformatContext.ts#L68)

***

### removeStream()

> **removeStream**(`stream`): `void`

#### Parameters

• **stream**: [`AVStream`](../../AVStream/classes/AVStream.md)

#### Returns

`void`

#### Source

[avformat/AVformatContext.ts:74](https://github.com/zhaohappy/libmedia/blob/b4bb608d2b1c00d036d73fc8d222b1a97be53694/src/avformat/AVformatContext.ts#L74)

***

### removeStreamById()

> **removeStreamById**(`id`): `void`

#### Parameters

• **id**: `number`

#### Returns

`void`

#### Source

[avformat/AVformatContext.ts:76](https://github.com/zhaohappy/libmedia/blob/b4bb608d2b1c00d036d73fc8d222b1a97be53694/src/avformat/AVformatContext.ts#L76)

***

### removeStreamByIndex()

> **removeStreamByIndex**(`index`): `void`

#### Parameters

• **index**: `number`

#### Returns

`void`

#### Source

[avformat/AVformatContext.ts:78](https://github.com/zhaohappy/libmedia/blob/b4bb608d2b1c00d036d73fc8d222b1a97be53694/src/avformat/AVformatContext.ts#L78)
