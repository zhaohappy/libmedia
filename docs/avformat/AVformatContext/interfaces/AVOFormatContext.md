[**libmedia**](../../../README.md) • **Docs**

***

[libmedia](../../../README.md) / [avformat/AVformatContext](../README.md) / AVOFormatContext

# Interface: AVOFormatContext

## Properties

### errorFlag

> **errorFlag**: `number`

#### Source

[avformat/AVformatContext.ts:98](https://github.com/zhaohappy/libmedia/blob/b4bb608d2b1c00d036d73fc8d222b1a97be53694/src/avformat/AVformatContext.ts#L98)

***

### interval

> **interval**: `AVFormatContextInterval`

#### Source

[avformat/AVformatContext.ts:100](https://github.com/zhaohappy/libmedia/blob/b4bb608d2b1c00d036d73fc8d222b1a97be53694/src/avformat/AVformatContext.ts#L100)

***

### ioWriter

> **ioWriter**: [`IOWriterSync`](../../../common/io/IOWriterSync/classes/IOWriterSync.md)

#### Source

[avformat/AVformatContext.ts:96](https://github.com/zhaohappy/libmedia/blob/b4bb608d2b1c00d036d73fc8d222b1a97be53694/src/avformat/AVformatContext.ts#L96)

***

### metadataHeaderPadding

> **metadataHeaderPadding**: `int32`

#### Source

[avformat/AVformatContext.ts:85](https://github.com/zhaohappy/libmedia/blob/b4bb608d2b1c00d036d73fc8d222b1a97be53694/src/avformat/AVformatContext.ts#L85)

***

### oformat

> **oformat**: `default`

#### Source

[avformat/AVformatContext.ts:94](https://github.com/zhaohappy/libmedia/blob/b4bb608d2b1c00d036d73fc8d222b1a97be53694/src/avformat/AVformatContext.ts#L94)

***

### options

> **options**: `Record`\<`string`, `any`\>

#### Source

[avformat/AVformatContext.ts:89](https://github.com/zhaohappy/libmedia/blob/b4bb608d2b1c00d036d73fc8d222b1a97be53694/src/avformat/AVformatContext.ts#L89)

***

### privateData

> **privateData**: `Record`\<`string`, `any`\>

#### Source

[avformat/AVformatContext.ts:91](https://github.com/zhaohappy/libmedia/blob/b4bb608d2b1c00d036d73fc8d222b1a97be53694/src/avformat/AVformatContext.ts#L91)

***

### processPrivateData

> **processPrivateData**: `Record`\<`string`, `any`\>

#### Source

[avformat/AVformatContext.ts:92](https://github.com/zhaohappy/libmedia/blob/b4bb608d2b1c00d036d73fc8d222b1a97be53694/src/avformat/AVformatContext.ts#L92)

***

### streamIndex

> **streamIndex**: `number`

#### Source

[avformat/AVformatContext.ts:102](https://github.com/zhaohappy/libmedia/blob/b4bb608d2b1c00d036d73fc8d222b1a97be53694/src/avformat/AVformatContext.ts#L102)

***

### streams

> **streams**: [`AVStream`](../../AVStream/classes/AVStream.md)[]

#### Source

[avformat/AVformatContext.ts:87](https://github.com/zhaohappy/libmedia/blob/b4bb608d2b1c00d036d73fc8d222b1a97be53694/src/avformat/AVformatContext.ts#L87)

## Methods

### addStream()

> **addStream**(`stream`): `void`

#### Parameters

• **stream**: [`AVStream`](../../AVStream/classes/AVStream.md)

#### Returns

`void`

#### Source

[avformat/AVformatContext.ts:112](https://github.com/zhaohappy/libmedia/blob/b4bb608d2b1c00d036d73fc8d222b1a97be53694/src/avformat/AVformatContext.ts#L112)

***

### createStream()

> **createStream**(): [`AVStream`](../../AVStream/classes/AVStream.md)

#### Returns

[`AVStream`](../../AVStream/classes/AVStream.md)

#### Source

[avformat/AVformatContext.ts:110](https://github.com/zhaohappy/libmedia/blob/b4bb608d2b1c00d036d73fc8d222b1a97be53694/src/avformat/AVformatContext.ts#L110)

***

### destroy()

> **destroy**(): `void`

#### Returns

`void`

#### Source

[avformat/AVformatContext.ts:120](https://github.com/zhaohappy/libmedia/blob/b4bb608d2b1c00d036d73fc8d222b1a97be53694/src/avformat/AVformatContext.ts#L120)

***

### getStreamById()

> **getStreamById**(`id`): [`AVStream`](../../AVStream/classes/AVStream.md)

#### Parameters

• **id**: `number`

#### Returns

[`AVStream`](../../AVStream/classes/AVStream.md)

#### Source

[avformat/AVformatContext.ts:104](https://github.com/zhaohappy/libmedia/blob/b4bb608d2b1c00d036d73fc8d222b1a97be53694/src/avformat/AVformatContext.ts#L104)

***

### getStreamByIndex()

> **getStreamByIndex**(`index`): [`AVStream`](../../AVStream/classes/AVStream.md)

#### Parameters

• **index**: `number`

#### Returns

[`AVStream`](../../AVStream/classes/AVStream.md)

#### Source

[avformat/AVformatContext.ts:106](https://github.com/zhaohappy/libmedia/blob/b4bb608d2b1c00d036d73fc8d222b1a97be53694/src/avformat/AVformatContext.ts#L106)

***

### getStreamByMediaType()

> **getStreamByMediaType**(`mediaType`): [`AVStream`](../../AVStream/classes/AVStream.md)

#### Parameters

• **mediaType**: `AVMediaType`

#### Returns

[`AVStream`](../../AVStream/classes/AVStream.md)

#### Source

[avformat/AVformatContext.ts:108](https://github.com/zhaohappy/libmedia/blob/b4bb608d2b1c00d036d73fc8d222b1a97be53694/src/avformat/AVformatContext.ts#L108)

***

### removeStream()

> **removeStream**(`stream`): `void`

#### Parameters

• **stream**: [`AVStream`](../../AVStream/classes/AVStream.md)

#### Returns

`void`

#### Source

[avformat/AVformatContext.ts:114](https://github.com/zhaohappy/libmedia/blob/b4bb608d2b1c00d036d73fc8d222b1a97be53694/src/avformat/AVformatContext.ts#L114)

***

### removeStreamById()

> **removeStreamById**(`id`): `void`

#### Parameters

• **id**: `number`

#### Returns

`void`

#### Source

[avformat/AVformatContext.ts:116](https://github.com/zhaohappy/libmedia/blob/b4bb608d2b1c00d036d73fc8d222b1a97be53694/src/avformat/AVformatContext.ts#L116)

***

### removeStreamByIndex()

> **removeStreamByIndex**(`index`): `void`

#### Parameters

• **index**: `number`

#### Returns

`void`

#### Source

[avformat/AVformatContext.ts:118](https://github.com/zhaohappy/libmedia/blob/b4bb608d2b1c00d036d73fc8d222b1a97be53694/src/avformat/AVformatContext.ts#L118)
