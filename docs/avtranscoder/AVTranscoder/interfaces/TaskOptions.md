[**libmedia**](../../../README.md) • **Docs**

***

[libmedia](../../../README.md) / [avtranscoder/AVTranscoder](../README.md) / TaskOptions

# Interface: TaskOptions

## Properties

### duration?

> `optional` **duration**: `number`

#### Source

[avtranscoder/AVTranscoder.ts:103](https://github.com/zhaohappy/libmedia/blob/a88305ff5d10e91621f2d71d24c72fc85681b8f7/src/avtranscoder/AVTranscoder.ts#L103)

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

[avtranscoder/AVTranscoder.ts:97](https://github.com/zhaohappy/libmedia/blob/a88305ff5d10e91621f2d71d24c72fc85681b8f7/src/avtranscoder/AVTranscoder.ts#L97)

***

### nbFrame?

> `optional` **nbFrame**: `number`

#### Source

[avtranscoder/AVTranscoder.ts:104](https://github.com/zhaohappy/libmedia/blob/a88305ff5d10e91621f2d71d24c72fc85681b8f7/src/avtranscoder/AVTranscoder.ts#L104)

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

> `optional` **codec**: `"copy"` \| `"mp3"` \| `"vorbis"` \| `"flac"` \| `"opus"` \| `"aac"` \| `"speex"`

输出编码类型

#### audio.disable?

> `optional` **disable**: `boolean`

是否不输出

#### audio.profile?

> `optional` **profile**: `number`

#### audio.sampleFmt?

> `optional` **sampleFmt**: `"float"` \| `"u8"` \| `"s16"` \| `"s32"` \| `"double"` \| `"u8p"` \| `"s16p"` \| `"s32p"` \| `"s64"` \| `"s64p"` \| `"floatp"` \| `"doublep"`

输出采样格式

#### audio.sampleRate?

> `optional` **sampleRate**: `number`

输出采样率

#### file

> **file**: `FileSystemFileHandle` \| [`IOWriterSync`](../../../common/io/IOWriterSync/classes/IOWriterSync.md)

#### format?

> `optional` **format**: `string`

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

> `optional` **codec**: `"avc"` \| `"copy"` \| `"vp8"` \| `"h264"` \| `"hevc"` \| `"h265"` \| `"vvc"` \| `"h266"` \| `"av1"` \| `"vp9"` \| `"mpeg4"`

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

> `optional` **pixfmt**: `"yuv420p"` \| `"yuv422p"` \| `"yuv444p"` \| `"yuv420p10le"` \| `"yuv422p10le"` \| `"yuv444p10le"` \| `"yuv420p10be"` \| `"yuv422p10be"` \| `"yuv444p10be"`

输出像素格式

#### video.profile?

> `optional` **profile**: `number`

#### video.width?

> `optional` **width**: `number`

输出宽度

#### Source

[avtranscoder/AVTranscoder.ts:105](https://github.com/zhaohappy/libmedia/blob/a88305ff5d10e91621f2d71d24c72fc85681b8f7/src/avtranscoder/AVTranscoder.ts#L105)

***

### start?

> `optional` **start**: `number`

#### Source

[avtranscoder/AVTranscoder.ts:102](https://github.com/zhaohappy/libmedia/blob/a88305ff5d10e91621f2d71d24c72fc85681b8f7/src/avtranscoder/AVTranscoder.ts#L102)
