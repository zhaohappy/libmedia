[**libmedia**](../../../README.md) • **Docs**

***

[libmedia](../../../README.md) / [avformat/AVFormatContext](../README.md) / AVIFormatContext

# Interface: AVIFormatContext

## Properties

### errorFlag

> **errorFlag**: `number`

#### Source

avformat/AVFormatContext.ts:58

***

### iformat

> **iformat**: `default`

#### Source

avformat/AVFormatContext.ts:54

***

### interval

> **interval**: `AVFormatContextInterval`

#### Source

avformat/AVFormatContext.ts:60

***

### ioReader

> **ioReader**: [`IOReader`](../../../common/io/IOReader/classes/IOReader.md)

#### Source

avformat/AVFormatContext.ts:56

***

### options

> **options**: `Record`\<`string`, `any`\>

#### Source

avformat/AVFormatContext.ts:50

***

### privateData

> **privateData**: `Record`\<`string`, `any`\>

#### Source

avformat/AVFormatContext.ts:52

***

### streamIndex

> **streamIndex**: `number`

#### Source

avformat/AVFormatContext.ts:62

***

### streams

> **streams**: [`AVStream`](../../AVStream/classes/AVStream.md)[]

#### Source

avformat/AVFormatContext.ts:48

## Methods

### addStream()

> **addStream**(`stream`): `void`

#### Parameters

• **stream**: [`AVStream`](../../AVStream/classes/AVStream.md)

#### Returns

`void`

#### Source

avformat/AVFormatContext.ts:72

***

### createStream()

> **createStream**(): [`AVStream`](../../AVStream/classes/AVStream.md)

#### Returns

[`AVStream`](../../AVStream/classes/AVStream.md)

#### Source

avformat/AVFormatContext.ts:70

***

### destroy()

> **destroy**(): `void`

#### Returns

`void`

#### Source

avformat/AVFormatContext.ts:80

***

### getStreamById()

> **getStreamById**(`id`): [`AVStream`](../../AVStream/classes/AVStream.md)

#### Parameters

• **id**: `number`

#### Returns

[`AVStream`](../../AVStream/classes/AVStream.md)

#### Source

avformat/AVFormatContext.ts:64

***

### getStreamByIndex()

> **getStreamByIndex**(`index`): [`AVStream`](../../AVStream/classes/AVStream.md)

#### Parameters

• **index**: `number`

#### Returns

[`AVStream`](../../AVStream/classes/AVStream.md)

#### Source

avformat/AVFormatContext.ts:66

***

### getStreamByMediaType()

> **getStreamByMediaType**(`mediaType`): [`AVStream`](../../AVStream/classes/AVStream.md)

#### Parameters

• **mediaType**: `AVMediaType`

#### Returns

[`AVStream`](../../AVStream/classes/AVStream.md)

#### Source

avformat/AVFormatContext.ts:68

***

### removeStream()

> **removeStream**(`stream`): `void`

#### Parameters

• **stream**: [`AVStream`](../../AVStream/classes/AVStream.md)

#### Returns

`void`

#### Source

avformat/AVFormatContext.ts:74

***

### removeStreamById()

> **removeStreamById**(`id`): `void`

#### Parameters

• **id**: `number`

#### Returns

`void`

#### Source

avformat/AVFormatContext.ts:76

***

### removeStreamByIndex()

> **removeStreamByIndex**(`index`): `void`

#### Parameters

• **index**: `number`

#### Returns

`void`

#### Source

avformat/AVFormatContext.ts:78
