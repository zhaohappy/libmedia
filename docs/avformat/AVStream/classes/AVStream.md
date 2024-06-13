[**libmedia**](../../../README.md) • **Docs**

***

[libmedia](../../../README.md) / [avformat/AVStream](../README.md) / AVStream

# Class: AVStream

from FFmpeg

## Constructors

### new AVStream()

> **new AVStream**(): [`AVStream`](AVStream.md)

#### Returns

[`AVStream`](AVStream.md)

## Properties

### codecpar

> **codecpar**: [`AVCodecParameters`](../../../avutil/struct/avcodecparameters/classes/AVCodecParameters.md)

#### Source

[avformat/AVStream.ts:108](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avformat/AVStream.ts#L108)

***

### disposition

> **disposition**: [`AVDisposition`](../enumerations/AVDisposition.md) = `AVDisposition.NONE`

AV_DISPOSITION_* bit field

#### Source

[avformat/AVStream.ts:162](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avformat/AVStream.ts#L162)

***

### duration

> **duration**: `int64` = `NOPTS_VALUE_BIGINT`

Decoding: duration of the stream, in stream time base.
If a source file does not specify a duration, but does specify
a bitrate, this value will be estimated from bitrate and file size.

Encoding: May be set by the caller before avformat_write_header() to
provide a hint to the muxer about the estimated duration.

#### Source

[avformat/AVStream.ts:142](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avformat/AVStream.ts#L142)

***

### firstDTS

> **firstDTS**: `int64`

第一个 packet 的 dts

#### Source

[avformat/AVStream.ts:157](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avformat/AVStream.ts#L157)

***

### id

> **id**: `int32` = `NOPTS_VALUE`

Format-specific stream ID.
decoding: set by libavformat
encoding: set by the user, replaced by libavformat if left unset

#### Source

[avformat/AVStream.ts:104](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avformat/AVStream.ts#L104)

***

### index

> **index**: `int32` = `NOPTS_VALUE`

stream index in AVFormatContext

#### Source

[avformat/AVStream.ts:97](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avformat/AVStream.ts#L97)

***

### metadata

> **metadata**: `Data` = `{}`

#### Source

[avformat/AVStream.ts:132](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avformat/AVStream.ts#L132)

***

### nbFrames

> **nbFrames**: `int64`

number of frames in this stream if known or 0

#### Source

[avformat/AVStream.ts:130](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avformat/AVStream.ts#L130)

***

### privData

> **privData**: `any` = `null`

#### Source

[avformat/AVStream.ts:106](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avformat/AVStream.ts#L106)

***

### sampleIndexes

> **sampleIndexes**: `object`[] = `[]`

帧索引，可用于 seek

#### Source

[avformat/AVStream.ts:181](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avformat/AVStream.ts#L181)

***

### sampleIndexesPosMap

> **sampleIndexesPosMap**: `Map`\<`int64`, `int32`\>

pos 到 sample index 的映射

#### Source

[avformat/AVStream.ts:193](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avformat/AVStream.ts#L193)

***

### sideData

> **sideData**: `Partial`\<`Record`\<`AVPacketSideDataType`, `Uint8Array`\>\> = `{}`

An array of side data that applies to the whole stream (i.e. the
container does not allow it to change between packets).

There may be no overlap between the side data in this array and side data
in the packets. I.e. a given side data is either exported by the muxer
(demuxing) / set by the caller (muxing) in this array, then it never
appears in the packets, or the side data is exported / sent through
the packets (always in the first packet where the value becomes known or
changes), then it does not appear in this array.

- demuxing: Set by libavformat when the stream is created.
- muxing: May be set by the caller before write_header().

#### Source

[avformat/AVStream.ts:125](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avformat/AVStream.ts#L125)

***

### startTime

> **startTime**: `int64` = `NOPTS_VALUE_BIGINT`

Decoding: pts of the first frame of the stream in presentation order, in stream time base.
Only set this if you are absolutely 100% sure that the value you set
it to really is the pts of the first frame.
This may be undefined (AV_NOPTS_VALUE).

#### Note

The ASF header does NOT contain a correct start_time the ASF
demuxer must NOT set this.

#### Source

[avformat/AVStream.ts:152](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avformat/AVStream.ts#L152)

***

### timeBase

> **timeBase**: `Rational`

封装时间基

decoding: set by libavformat
encoding: May be set by the caller before avformat_write_header() to
          provide a hint to the muxer about the desired timebase. In
          avformat_write_header(), the muxer will overwrite this field
          with the timebase that will actually be used for the timestamps
          written into the file (which may or may not be related to the
          user-provided one, depending on the format).

#### Source

[avformat/AVStream.ts:176](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avformat/AVStream.ts#L176)

## Methods

### destroy()

> **destroy**(): `void`

#### Returns

`void`

#### Source

[avformat/AVStream.ts:196](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avformat/AVStream.ts#L196)
