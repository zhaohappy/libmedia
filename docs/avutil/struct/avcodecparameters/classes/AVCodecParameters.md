[**libmedia**](../../../../README.md) • **Docs**

***

[libmedia](../../../../README.md) / [avutil/struct/avcodecparameters](../README.md) / AVCodecParameters

# Class: AVCodecParameters

FFmpeg AVCodecParameters 定义

## Constructors

### new AVCodecParameters()

> **new AVCodecParameters**(): [`AVCodecParameters`](AVCodecParameters.md)

#### Returns

[`AVCodecParameters`](AVCodecParameters.md)

## Properties

### bitFormat

> **bitFormat**: `int32` = `0`

码流格式
对于 h264/h265/h266 标记是 annexb 还是 avcc 格式

#### Source

[avutil/struct/avcodecparameters.ts:214](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avutil/struct/avcodecparameters.ts#L214)

***

### bitRate

> **bitRate**: `int64`

The average bitrate of the encoded data (in bits per second).

#### Source

[avutil/struct/avcodecparameters.ts:89](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avutil/struct/avcodecparameters.ts#L89)

***

### bitsPerCodedSample

> **bitsPerCodedSample**: `int32` = `0`

The number of bits per sample in the codedwords.

This is basically the bitrate per sample. It is mandatory for a bunch of
formats to actually decode them. It's the number of bits for one sample in
the actual coded bitstream.

This could be for example 4 for ADPCM
For PCM formats this matches bits_per_raw_sample
Can be 0

#### Source

[avutil/struct/avcodecparameters.ts:102](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avutil/struct/avcodecparameters.ts#L102)

***

### bitsPerRawSample

> **bitsPerRawSample**: `int32` = `0`

This is the number of valid bits in each output sample. If the
sample format has more bits, the least significant bits are additional
padding bits, which are always 0. Use right shifts to reduce the sample
to its actual size. For example, audio formats with 24 bit samples will
have bits_per_raw_sample set to 24, and format set to AV_SAMPLE_FMT_S32.
To get the original sample use "(int32_t)sample >> 8"."

For ADPCM this might be 12 or 16 or similar
Can be 0

#### Source

[avutil/struct/avcodecparameters.ts:114](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avutil/struct/avcodecparameters.ts#L114)

***

### blockAlign

> **blockAlign**: `int32` = `0`

Audio only. The number of bytes per coded audio frame, required by some
formats.

Corresponds to nBlockAlign in WAVEFORMATEX.

#### Source

[avutil/struct/avcodecparameters.ts:183](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avutil/struct/avcodecparameters.ts#L183)

***

### chLayout

> **chLayout**: `AVChannelLayout`

Audio only. The channel layout and number of channels.

#### Source

[avutil/struct/avcodecparameters.ts:171](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avutil/struct/avcodecparameters.ts#L171)

***

### chromaLocation

> **chromaLocation**: `AVChromaLocation` = `AVChromaLocation.AVCHROMA_LOC_UNSPECIFIED`

#### Source

[avutil/struct/avcodecparameters.ts:161](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avutil/struct/avcodecparameters.ts#L161)

***

### codecId

> **codecId**: `AVCodecID` = `AVCodecID.AV_CODEC_ID_NONE`

Specific type of the encoded data (the codec used).

#### Source

[avutil/struct/avcodecparameters.ts:50](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avutil/struct/avcodecparameters.ts#L50)

***

### codecTag

> **codecTag**: `uint32` = `0`

Additional information about the codec (corresponds to the AVI FOURCC).

#### Source

[avutil/struct/avcodecparameters.ts:54](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avutil/struct/avcodecparameters.ts#L54)

***

### codecType

> **codecType**: `AVMediaType` = `AVMediaType.AVMEDIA_TYPE_UNKNOWN`

General type of the encoded data.

#### Source

[avutil/struct/avcodecparameters.ts:46](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avutil/struct/avcodecparameters.ts#L46)

***

### codedSideData

> **codedSideData**: `pointer`\<[`AVPacketSideData`](../../avpacket/classes/AVPacketSideData.md)\> = `nullptr`

Additional data associated with the entire stream.

Should be allocated with av_packet_side_data_new() or
av_packet_side_data_add(), and will be freed by avcodec_parameters_free().

#### Source

[avutil/struct/avcodecparameters.ts:73](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avutil/struct/avcodecparameters.ts#L73)

***

### colorPrimaries

> **colorPrimaries**: `AVColorPrimaries` = `AVColorPrimaries.AVCOL_PRI_UNSPECIFIED`

#### Source

[avutil/struct/avcodecparameters.ts:158](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avutil/struct/avcodecparameters.ts#L158)

***

### colorRange

> **colorRange**: `AVColorRange` = `AVColorRange.AVCOL_RANGE_UNSPECIFIED`

Video only. Additional colorspace characteristics.

#### Source

[avutil/struct/avcodecparameters.ts:157](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avutil/struct/avcodecparameters.ts#L157)

***

### colorSpace

> **colorSpace**: `AVColorSpace` = `AVColorSpace.AVCOL_SPC_UNSPECIFIED`

#### Source

[avutil/struct/avcodecparameters.ts:160](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avutil/struct/avcodecparameters.ts#L160)

***

### colorTrc

> **colorTrc**: `AVColorTransferCharacteristic` = `AVColorTransferCharacteristic.AVCOL_TRC_UNSPECIFIED`

#### Source

[avutil/struct/avcodecparameters.ts:159](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avutil/struct/avcodecparameters.ts#L159)

***

### extradata

> **extradata**: `pointer`\<`uint8`\> = `nullptr`

Extra binary data needed for initializing the decoder, codec-dependent.

Must be allocated with av_malloc() and will be freed by
avcodec_parameters_free(). The allocated size of extradata must be at
least extradata_size + AV_INPUT_BUFFER_PADDING_SIZE, with the padding
bytes zeroed.

#### Source

[avutil/struct/avcodecparameters.ts:64](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avutil/struct/avcodecparameters.ts#L64)

***

### extradataSize

> **extradataSize**: `int32` = `0`

#### Source

[avutil/struct/avcodecparameters.ts:65](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avutil/struct/avcodecparameters.ts#L65)

***

### fieldOrder

> **fieldOrder**: `AVFieldOrder` = `AVFieldOrder.AV_FIELD_UNKNOWN`

Video only. The order of the fields in interlaced video.

#### Source

[avutil/struct/avcodecparameters.ts:152](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avutil/struct/avcodecparameters.ts#L152)

***

### format

> **format**: `AVSampleFormat` \| `AVPixelFormat` = `NOPTS_VALUE`

- video: the pixel format, the value corresponds to enum AVPixelFormat.
- audio: the sample format, the value corresponds to enum AVSampleFormat.

#### Source

[avutil/struct/avcodecparameters.ts:84](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avutil/struct/avcodecparameters.ts#L84)

***

### frameSize

> **frameSize**: `int32` = `0`

Audio only. Audio frame size, if known. Required by some formats to be static.

#### Source

[avutil/struct/avcodecparameters.ts:188](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avutil/struct/avcodecparameters.ts#L188)

***

### framerate

> **framerate**: `Rational`

Video only. Number of frames per second, for streams with constant frame
durations. Should be set to { 0, 1 } when some frames have differing
durations or if the value is not known.

#### Note

This field correponds to values that are stored in codec-level
headers and is typically overridden by container/transport-layer
timestamps, when available. It should thus be used only as a last resort,
when no higher-level timing information is available.

#### Source

[avutil/struct/avcodecparameters.ts:147](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avutil/struct/avcodecparameters.ts#L147)

***

### height

> **height**: `int32` = `0`

#### Source

[avutil/struct/avcodecparameters.ts:126](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avutil/struct/avcodecparameters.ts#L126)

***

### initialPadding

> **initialPadding**: `int32` = `0`

Audio only. The amount of padding (in samples) inserted by the encoder at
the beginning of the audio. I.e. this number of leading decoded samples
must be discarded by the caller to get the original audio without leading
padding.

#### Source

[avutil/struct/avcodecparameters.ts:196](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avutil/struct/avcodecparameters.ts#L196)

***

### level

> **level**: `int32` = `NOPTS_VALUE`

#### Source

[avutil/struct/avcodecparameters.ts:120](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avutil/struct/avcodecparameters.ts#L120)

***

### nbCodedSideData

> **nbCodedSideData**: `int32` = `0`

Amount of entries in

#### Ref

coded_side_data.

#### Source

[avutil/struct/avcodecparameters.ts:78](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avutil/struct/avcodecparameters.ts#L78)

***

### profile

> **profile**: `int32` = `NOPTS_VALUE`

Codec-specific bitstream restrictions that the stream conforms to.

#### Source

[avutil/struct/avcodecparameters.ts:119](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avutil/struct/avcodecparameters.ts#L119)

***

### sampleAspectRatio

> **sampleAspectRatio**: `Rational`

Video only. The aspect ratio (width / height) which a single pixel
should have when displayed.

When the aspect ratio is unknown / undefined, the numerator should be
set to 0 (the denominator may have any value).

#### Source

[avutil/struct/avcodecparameters.ts:135](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avutil/struct/avcodecparameters.ts#L135)

***

### sampleRate

> **sampleRate**: `int32` = `NOPTS_VALUE`

Audio only. The number of audio samples per second.

#### Source

[avutil/struct/avcodecparameters.ts:176](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avutil/struct/avcodecparameters.ts#L176)

***

### seekPreroll

> **seekPreroll**: `int32` = `0`

Audio only. Number of samples to skip after a discontinuity.

#### Source

[avutil/struct/avcodecparameters.ts:208](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avutil/struct/avcodecparameters.ts#L208)

***

### trailingPadding

> **trailingPadding**: `int32` = `0`

Audio only. The amount of padding (in samples) appended by the encoder to
the end of the audio. I.e. this number of decoded samples must be
discarded by the caller from the end of the stream to get the original
audio without any trailing padding.

#### Source

[avutil/struct/avcodecparameters.ts:204](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avutil/struct/avcodecparameters.ts#L204)

***

### videoDelay

> **videoDelay**: `int32` = `0`

Video only. Number of delayed frames.

#### Source

[avutil/struct/avcodecparameters.ts:166](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avutil/struct/avcodecparameters.ts#L166)

***

### width

> **width**: `int32` = `0`

Video only. The dimensions of the video frame in pixels.

#### Source

[avutil/struct/avcodecparameters.ts:125](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avutil/struct/avcodecparameters.ts#L125)

## Methods

### destroy()

> **destroy**(): `void`

#### Returns

`void`

#### Source

[avutil/struct/avcodecparameters.ts:216](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avutil/struct/avcodecparameters.ts#L216)
