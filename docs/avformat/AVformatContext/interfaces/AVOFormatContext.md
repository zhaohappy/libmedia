[**libmedia**](../../../README.md) • **Docs**

***

[libmedia](../../../README.md) / [avformat/AVFormatContext](../README.md) / AVOFormatContext

# Interface: AVOFormatContext

## Properties

### errorFlag

> **errorFlag**: `number`

#### Source

avformat/AVFormatContext.ts:98

***

### interval

> **interval**: `AVFormatContextInterval`

#### Source

avformat/AVFormatContext.ts:100

***

### ioWriter

> **ioWriter**: [`IOWriterSync`](../../../common/io/IOWriterSync/classes/IOWriterSync.md)

#### Source

avformat/AVFormatContext.ts:96

***

### metadataHeaderPadding

> **metadataHeaderPadding**: `int32`

#### Source

avformat/AVFormatContext.ts:85

***

### oformat

> **oformat**: `default`

#### Source

avformat/AVFormatContext.ts:94

***

### options

> **options**: `Record`\<`string`, `any`\>

#### Source

avformat/AVFormatContext.ts:89

***

### privateData

> **privateData**: `Record`\<`string`, `any`\>

#### Source

avformat/AVFormatContext.ts:91

***

### processPrivateData

> **processPrivateData**: `Record`\<`string`, `any`\>

#### Source

avformat/AVFormatContext.ts:92

***

### streamIndex

> **streamIndex**: `number`

#### Source

avformat/AVFormatContext.ts:102

***

### streams

> **streams**: [`AVStream`](../../AVStream/classes/AVStream.md)[]

#### Source

avformat/AVFormatContext.ts:87

## Methods

### addStream()

> **addStream**(`stream`): `void`

#### Parameters

• **stream**: [`AVStream`](../../AVStream/classes/AVStream.md)

#### Returns

`void`

#### Source

avformat/AVFormatContext.ts:112

***

### createStream()

> **createStream**(): [`AVStream`](../../AVStream/classes/AVStream.md)

#### Returns

[`AVStream`](../../AVStream/classes/AVStream.md)

#### Source

avformat/AVFormatContext.ts:110

***

### destroy()

> **destroy**(): `void`

#### Returns

`void`

#### Source

avformat/AVFormatContext.ts:120

***

### getStreamById()

> **getStreamById**(`id`): [`AVStream`](../../AVStream/classes/AVStream.md)

#### Parameters

• **id**: `number`

#### Returns

[`AVStream`](../../AVStream/classes/AVStream.md)

#### Source

avformat/AVFormatContext.ts:104

***

### getStreamByIndex()

> **getStreamByIndex**(`index`): [`AVStream`](../../AVStream/classes/AVStream.md)

#### Parameters

• **index**: `number`

#### Returns

[`AVStream`](../../AVStream/classes/AVStream.md)

#### Source

avformat/AVFormatContext.ts:106

***

### getStreamByMediaType()

> **getStreamByMediaType**(`mediaType`): [`AVStream`](../../AVStream/classes/AVStream.md)

#### Parameters

• **mediaType**: `AVMediaType`

#### Returns

[`AVStream`](../../AVStream/classes/AVStream.md)

#### Source

avformat/AVFormatContext.ts:108

***

### removeStream()

> **removeStream**(`stream`): `void`

#### Parameters

• **stream**: [`AVStream`](../../AVStream/classes/AVStream.md)

#### Returns

`void`

#### Source

avformat/AVFormatContext.ts:114

***

### removeStreamById()

> **removeStreamById**(`id`): `void`

#### Parameters

• **id**: `number`

#### Returns

`void`

#### Source

avformat/AVFormatContext.ts:116

***

### removeStreamByIndex()

> **removeStreamByIndex**(`index`): `void`

#### Parameters

• **index**: `number`

#### Returns

`void`

#### Source

avformat/AVFormatContext.ts:118
