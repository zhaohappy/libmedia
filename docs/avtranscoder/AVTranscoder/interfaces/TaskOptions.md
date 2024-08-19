[**libmedia**](../../../README.md) • **Docs**

***

[libmedia](../../../README.md) / [avtranscoder/AVTranscoder](../README.md) / TaskOptions

# Interface: TaskOptions

## Properties

### duration?

> `optional` **duration**: `number`

#### Source

[avtranscoder/AVTranscoder.ts:111](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avtranscoder/AVTranscoder.ts#L111)

***

### input

> **input**: `object`

#### file

> **file**: `string` \| `File` \| [`IOReader`](../../../common/io/IOReader/classes/IOReader.md)

#### format?

> `optional` **format**: `string`

#### protocol?

> `optional` **protocol**: `"hls"` \| `"dash"`

#### Source

[avtranscoder/AVTranscoder.ts:105](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avtranscoder/AVTranscoder.ts#L105)

***

### nbFrame?

> `optional` **nbFrame**: `number`

#### Source

[avtranscoder/AVTranscoder.ts:112](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avtranscoder/AVTranscoder.ts#L112)

***

### output

> **output**: `object`

#### audio?

> `optional` **audio**: `object`

#### audio.bitrate?

> `optional` **bitrate**: `number`

输出码率

#### audio.channels?

> `optional` **channels**: `number`

输出声道数

#### audio.codec?

> `optional` **codec**: `"copy"` \| `"mp3"` \| `"vorbis"` \| `"flac"` \| `"opus"` \| `"aac"` \| `"ac3"` \| `"eac3"` \| `"dca"` \| `"speex"` \| `"g711a"` \| `"g711u"`

输出编码类型

#### audio.disable?

> `optional` **disable**: `boolean`

是否不输出

#### audio.profile?

> `optional` **profile**: `number`

#### audio.sampleFmt?

> `optional` **sampleFmt**: `"float"` \| `"u8"` \| `"s16"` \| `"s32"` \| `"u8p"` \| `"s16p"` \| `"s32p"` \| `"s64"` \| `"s64p"` \| `"floatp"` \| `"double"` \| `"doublep"`

输出采样格式

#### audio.sampleRate?

> `optional` **sampleRate**: `number`

输出采样率

#### file

> **file**: `FileSystemFileHandle` \| [`IOWriterSync`](../../../common/io/IOWriterSync/classes/IOWriterSync.md)

#### format?

> `optional` **format**: `string`

#### formatOptions?

> `optional` **formatOptions**: `Data`

#### video?

> `optional` **video**: `object`

#### video.aspect?

> `optional` **aspect**: `object`

输出视频高宽比

#### video.aspect.den

> **den**: `number`

#### video.aspect.num

> **num**: `number`

#### video.bitrate?

> `optional` **bitrate**: `number`

输出码率

#### video.codec?

> `optional` **codec**: `"avc"` \| `"copy"` \| `"vp8"` \| `"h264"` \| `"h265"` \| `"hevc"` \| `"h266"` \| `"vvc"` \| `"av1"` \| `"vp9"` \| `"mpeg4"` \| `"theora"`

输出编码类型

#### video.delay?

> `optional` **delay**: `number`

#### video.disable?

> `optional` **disable**: `boolean`

是否不输出

#### video.framerate?

> `optional` **framerate**: `number`

输出帧率

#### video.height?

> `optional` **height**: `number`

输出高度

#### video.keyFrameInterval?

> `optional` **keyFrameInterval**: `number`

输出关键帧间隔(毫秒)

#### video.level?

> `optional` **level**: `number`

#### video.pixfmt?

> `optional` **pixfmt**: `"yuv420p"` \| `"yuv422p"` \| `"yuv444p"` \| `"yuva420p"` \| `"yuva422p"` \| `"yuva444p"` \| `"yuv420p10le"` \| `"yuv422p10le"` \| `"yuv444p10le"` \| `"yuva420p10le"` \| `"yuva422p10le"` \| `"yuva444p10le"` \| `"yuv420p10be"` \| `"yuv422p10be"` \| `"yuv444p10be"` \| `"yuva420p10be"` \| `"yuva422p10be"` \| `"yuva444p10be"`

输出像素格式

#### video.profile?

> `optional` **profile**: `number`

#### video.width?

> `optional` **width**: `number`

输出宽度

#### Source

[avtranscoder/AVTranscoder.ts:113](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avtranscoder/AVTranscoder.ts#L113)

***

### start?

> `optional` **start**: `number`

#### Source

[avtranscoder/AVTranscoder.ts:110](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avtranscoder/AVTranscoder.ts#L110)
