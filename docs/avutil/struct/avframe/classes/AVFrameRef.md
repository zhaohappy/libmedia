[**libmedia**](../../../../README.md) • **Docs**

***

[libmedia](../../../../README.md) / [avutil/struct/avframe](../README.md) / AVFrameRef

# Class: AVFrameRef

FFmpeg AVFrame 定义

## Extends

- [`AVFrame`](AVFrame.md)

## Constructors

### new AVFrameRef()

> **new AVFrameRef**(): [`AVFrameRef`](AVFrameRef.md)

#### Returns

[`AVFrameRef`](AVFrameRef.md)

#### Inherited from

[`AVFrame`](AVFrame.md).[`constructor`](AVFrame.md#constructors)

## Properties

### bestEffortTimestamp

> **bestEffortTimestamp**: `int64` = `NOPTS_VALUE_BIGINT`

frame timestamp estimated using various heuristics, in stream time base
- encoding: unused
- decoding: set by libavcodec, read by user.

#### Inherited from

[`AVFrame`](AVFrame.md).[`bestEffortTimestamp`](AVFrame.md#bestefforttimestamp)

#### Source

[avutil/struct/avframe.ts:557](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avutil/struct/avframe.ts#L557)

***

### buf

> **buf**: `array`\<`pointer`\<[`AVBufferRef`](../../avbuffer/classes/AVBufferRef.md)\>, `8`\>

AVBuffer references backing the data for this frame. If all elements of
this array are NULL, then this frame is not reference counted. This array
must be filled contiguously -- if buf[i] is non-NULL then buf[j] must
also be non-NULL for all j < i.

There may be at most one AVBuffer per data plane, so for video this array
always contains all the references. For planar audio with more than
AV_NUM_DATA_POINTERS channels, there may be more buffers than can fit in
this array. Then the extra AVBufferRef pointers are stored in the
extended_buf array.

#### Inherited from

[`AVFrame`](AVFrame.md).[`buf`](AVFrame.md#buf)

#### Source

[avutil/struct/avframe.ts:505](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avutil/struct/avframe.ts#L505)

***

### chLayout

> **chLayout**: `AVChannelLayout`

Channel layout of the audio data.

#### Inherited from

[`AVFrame`](AVFrame.md).[`chLayout`](AVFrame.md#chlayout)

#### Source

[avutil/struct/avframe.ts:645](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avutil/struct/avframe.ts#L645)

***

### chromaLocation

> **chromaLocation**: `AVChromaLocation` = `AVChromaLocation.AVCHROMA_LOC_UNSPECIFIED`

#### Inherited from

[`AVFrame`](AVFrame.md).[`chromaLocation`](AVFrame.md#chromalocation)

#### Source

[avutil/struct/avframe.ts:550](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avutil/struct/avframe.ts#L550)

***

### colorPrimaries

> **colorPrimaries**: `AVColorPrimaries` = `AVColorPrimaries.AVCOL_PRI_UNSPECIFIED`

#### Inherited from

[`AVFrame`](AVFrame.md).[`colorPrimaries`](AVFrame.md#colorprimaries)

#### Source

[avutil/struct/avframe.ts:541](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avutil/struct/avframe.ts#L541)

***

### colorRange

> **colorRange**: `AVColorRange` = `AVColorRange.AVCOL_RANGE_UNSPECIFIED`

MPEG vs JPEG YUV range.
- encoding: Set by user
- decoding: Set by libavcodec

#### Inherited from

[`AVFrame`](AVFrame.md).[`colorRange`](AVFrame.md#colorrange)

#### Source

[avutil/struct/avframe.ts:540](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avutil/struct/avframe.ts#L540)

***

### colorSpace

> **colorSpace**: `AVColorSpace` = `AVColorSpace.AVCOL_SPC_UNSPECIFIED`

YUV colorspace type.
- encoding: Set by user
- decoding: Set by libavcodec

#### Inherited from

[`AVFrame`](AVFrame.md).[`colorSpace`](AVFrame.md#colorspace)

#### Source

[avutil/struct/avframe.ts:549](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avutil/struct/avframe.ts#L549)

***

### colorTrc

> **colorTrc**: `AVColorTransferCharacteristic` = `AVColorTransferCharacteristic.AVCOL_TRC_UNSPECIFIED`

#### Inherited from

[`AVFrame`](AVFrame.md).[`colorTrc`](AVFrame.md#colortrc)

#### Source

[avutil/struct/avframe.ts:542](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avutil/struct/avframe.ts#L542)

***

### cropBottom

> **cropBottom**: `int32` = `0`

#### Inherited from

[`AVFrame`](AVFrame.md).[`cropBottom`](AVFrame.md#cropbottom)

#### Source

[avutil/struct/avframe.ts:623](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avutil/struct/avframe.ts#L623)

***

### cropLeft

> **cropLeft**: `int32` = `0`

#### Inherited from

[`AVFrame`](AVFrame.md).[`cropLeft`](AVFrame.md#cropleft)

#### Source

[avutil/struct/avframe.ts:625](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avutil/struct/avframe.ts#L625)

***

### cropRight

> **cropRight**: `int32` = `0`

#### Inherited from

[`AVFrame`](AVFrame.md).[`cropRight`](AVFrame.md#cropright)

#### Source

[avutil/struct/avframe.ts:627](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avutil/struct/avframe.ts#L627)

***

### cropTop

> **cropTop**: `int32` = `0`

#### Anchor

cropping

#### Name

Cropping
Video frames only. The number of pixels to discard from the the
top/bottom/left/right border of the frame to obtain the sub-rectangle of
the frame intended for presentation.

#### Inherited from

[`AVFrame`](AVFrame.md).[`cropTop`](AVFrame.md#croptop)

#### Source

[avutil/struct/avframe.ts:621](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avutil/struct/avframe.ts#L621)

***

### data

> **data**: `array`\<`pointer`\<`uint8`\>, `8`\>

pointer to the picture/channel planes.
This might be different from the first allocated byte

Some decoders access areas outside 0,0 - width, height, please
see avcodec_align_dimensions2(). Some filters and swscale can read
up to 16 bytes beyond the planes, if these filters are to be used,
then 16 extra bytes must be allocated.

NOTE: Except for hwaccel formats, pointers not needed by the format
MUST be set to NULL.

#### Inherited from

[`AVFrame`](AVFrame.md).[`data`](AVFrame.md#data)

#### Source

[avutil/struct/avframe.ts:327](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avutil/struct/avframe.ts#L327)

***

### decodeErrorFlags

> **decodeErrorFlags**: [`FFDecodeError`](../enumerations/FFDecodeError.md) = `FFDecodeError.NONE`

decode error flags of the frame, set to a combination of
FF_DECODE_ERROR_xxx flags if the decoder produced a frame, but there
were errors during the decoding.
- encoding: unused
- decoding: set by libavcodec, read by user.

#### Inherited from

[`AVFrame`](AVFrame.md).[`decodeErrorFlags`](AVFrame.md#decodeerrorflags)

#### Source

[avutil/struct/avframe.ts:583](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avutil/struct/avframe.ts#L583)

***

### duration

> **duration**: `int64`

Duration of the frame, in the same units as pts. 0 if unknown.

#### Inherited from

[`AVFrame`](AVFrame.md).[`duration`](AVFrame.md#duration)

#### Source

[avutil/struct/avframe.ts:650](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avutil/struct/avframe.ts#L650)

***

### extendedBuf

> **extendedBuf**: `pointer`\<`pointer`\<[`AVBufferRef`](../../avbuffer/classes/AVBufferRef.md)\>\> = `nullptr`

For planar audio which requires more than AV_NUM_DATA_POINTERS
AVBufferRef pointers, this array will hold all the references which
cannot fit into AVFrame.buf.

Note that this is different from AVFrame.extended_data, which always
contains all the pointers. This array only contains the extra pointers,
which cannot fit into AVFrame.buf.

This array is always allocated using av_malloc() by whoever constructs
the frame. It is freed in av_frame_unref().

#### Inherited from

[`AVFrame`](AVFrame.md).[`extendedBuf`](AVFrame.md#extendedbuf)

#### Source

[avutil/struct/avframe.ts:519](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avutil/struct/avframe.ts#L519)

***

### extendedData

> **extendedData**: `pointer`\<`pointer`\<`uint8`\>\> = `nullptr`

pointers to the data planes/channels.

For video, this should simply point to data[].

For planar audio, each channel has a separate data pointer, and
linesize[0] contains the size of each channel buffer.
For packed audio, there is just one data pointer, and linesize[0]
contains the total size of the buffer for all channels.

Note: Both data and extended_data should always be set in a valid frame,
but for planar audio with more channels that can fit in data,
extended_data must be used in order to access all channels.

#### Inherited from

[`AVFrame`](AVFrame.md).[`extendedData`](AVFrame.md#extendeddata)

#### Source

[avutil/struct/avframe.ts:360](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avutil/struct/avframe.ts#L360)

***

### flags

> **flags**: [`AVFrameFlags`](../enumerations/AVFrameFlags.md) = `AVFrameFlags.AV_FRAME_FLAG_NONE`

Frame flags, a combination of

#### Ref

lavu_frame_flags

#### Inherited from

[`AVFrame`](AVFrame.md).[`flags`](AVFrame.md#flags)

#### Source

[avutil/struct/avframe.ts:533](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avutil/struct/avframe.ts#L533)

***

### format

> **format**: `int32` = `NOPTS_VALUE`

format of the frame, -1 if unknown or unset
Values correspond to enum AVPixelFormat for video frames,
enum AVSampleFormat for audio)

#### Inherited from

[`AVFrame`](AVFrame.md).[`format`](AVFrame.md#format)

#### Source

[avutil/struct/avframe.ts:384](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avutil/struct/avframe.ts#L384)

***

### height

> **height**: `int32` = `NOPTS_VALUE`

#### Inherited from

[`AVFrame`](AVFrame.md).[`height`](AVFrame.md#height)

#### Source

[avutil/struct/avframe.ts:372](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avutil/struct/avframe.ts#L372)

***

### hwFramesCtx

> **hwFramesCtx**: `pointer`\<[`AVBufferRef`](../../avbuffer/classes/AVBufferRef.md)\> = `nullptr`

For hwaccel-format frames, this should be a reference to the
AVHWFramesContext describing the frame.

#### Inherited from

[`AVFrame`](AVFrame.md).[`hwFramesCtx`](AVFrame.md#hwframesctx)

#### Source

[avutil/struct/avframe.ts:601](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avutil/struct/avframe.ts#L601)

***

### ~~interlacedFrame~~

> **interlacedFrame**: `int32` = `NOPTS_VALUE`

The content of the picture is interlaced.

#### Deprecated

Use AV_FRAME_FLAG_INTERLACED instead

#### Inherited from

[`AVFrame`](AVFrame.md).[`interlacedFrame`](AVFrame.md#interlacedframe)

#### Source

[avutil/struct/avframe.ts:471](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avutil/struct/avframe.ts#L471)

***

### ~~keyFrame~~

> **keyFrame**: `int32` = `0`

1 -> keyframe, 0-> not

#### Deprecated

Use AV_FRAME_FLAG_KEY instead

#### Inherited from

[`AVFrame`](AVFrame.md).[`keyFrame`](AVFrame.md#keyframe)

#### Source

[avutil/struct/avframe.ts:392](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avutil/struct/avframe.ts#L392)

***

### linesize

> **linesize**: `array`\<`int32`, `8`\>

For video, size in bytes of each picture line.
For audio, size in bytes of each plane.

For audio, only linesize[0] may be set. For planar audio, each channel
plane must be the same size.

For video the linesizes should be multiples of the CPUs alignment
preference, this is 16 or 32 for modern desktop CPUs.
Some code requires such alignment other code can be slower without
correct alignment, for yet other it makes no difference.

#### Note

The linesize may be larger than the size of usable data -- there
may be extra padding present for performance reasons.

#### Inherited from

[`AVFrame`](AVFrame.md).[`linesize`](AVFrame.md#linesize)

#### Source

[avutil/struct/avframe.ts:344](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avutil/struct/avframe.ts#L344)

***

### metadata

> **metadata**: `pointer`\<`AVDictionary`\> = `nullptr`

metadata.
- encoding: Set by user.
- decoding: Set by libavcodec.

#### Inherited from

[`AVFrame`](AVFrame.md).[`metadata`](AVFrame.md#metadata)

#### Source

[avutil/struct/avframe.ts:574](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avutil/struct/avframe.ts#L574)

***

### nbExtendedBuf

> **nbExtendedBuf**: `int32` = `0`

Number of elements in extended_buf.

#### Inherited from

[`AVFrame`](AVFrame.md).[`nbExtendedBuf`](AVFrame.md#nbextendedbuf)

#### Source

[avutil/struct/avframe.ts:524](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avutil/struct/avframe.ts#L524)

***

### nbSamples

> **nbSamples**: `int32` = `NOPTS_VALUE`

number of audio samples (per channel) described by this frame

#### Inherited from

[`AVFrame`](AVFrame.md).[`nbSamples`](AVFrame.md#nbsamples)

#### Source

[avutil/struct/avframe.ts:377](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avutil/struct/avframe.ts#L377)

***

### nbSideData

> **nbSideData**: `int32` = `0`

#### Inherited from

[`AVFrame`](AVFrame.md).[`nbSideData`](AVFrame.md#nbsidedata)

#### Source

[avutil/struct/avframe.ts:528](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avutil/struct/avframe.ts#L528)

***

### opaque

> **opaque**: `pointer`\<`void`\> = `nullptr`

Frame owner's private data.

This field may be set by the code that allocates/owns the frame data.
It is then not touched by any library functions, except:
- it is copied to other references by av_frame_copy_props() (and hence by
  av_frame_ref());
- it is set to NULL when the frame is cleared by av_frame_unref()
- on the caller's explicit request. E.g. libavcodec encoders/decoders
  will copy this field to/from

#### Ref

AVPacket "AVPackets" if the caller sets

#### Ref

AV_CODEC_FLAG_COPY_OPAQUE.

#### See

opaque_ref the reference-counted analogue

#### Inherited from

[`AVFrame`](AVFrame.md).[`opaque`](AVFrame.md#opaque)

#### Source

[avutil/struct/avframe.ts:443](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avutil/struct/avframe.ts#L443)

***

### opaqueRef

> **opaqueRef**: `pointer`\<[`AVBufferRef`](../../avbuffer/classes/AVBufferRef.md)\> = `nullptr`

AVBufferRef for free use by the API user. FFmpeg will never check the
contents of the buffer ref. FFmpeg calls av_buffer_unref() on it when
the frame is unreferenced. av_frame_copy_props() calls create a new
reference with av_buffer_ref() for the target frame's opaque_ref field.

This is unrelated to the opaque field, although it serves a similar
purpose.

#### Inherited from

[`AVFrame`](AVFrame.md).[`opaqueRef`](AVFrame.md#opaqueref)

#### Source

[avutil/struct/avframe.ts:612](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avutil/struct/avframe.ts#L612)

***

### ~~paletteHasChanged~~

> **paletteHasChanged**: `int32` = `NOPTS_VALUE`

Tell user application that palette has changed from previous frame.

#### Deprecated

#### Inherited from

[`AVFrame`](AVFrame.md).[`paletteHasChanged`](AVFrame.md#palettehaschanged)

#### Source

[avutil/struct/avframe.ts:486](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avutil/struct/avframe.ts#L486)

***

### pictType

> **pictType**: [`AVPictureType`](../enumerations/AVPictureType.md) = `AVPictureType.AV_PICTURE_TYPE_NONE`

Picture type of the frame.

#### Inherited from

[`AVFrame`](AVFrame.md).[`pictType`](AVFrame.md#picttype)

#### Source

[avutil/struct/avframe.ts:397](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avutil/struct/avframe.ts#L397)

***

### pktDts

> **pktDts**: `int64` = `NOPTS_VALUE_BIGINT`

DTS copied from the AVPacket that triggered returning this frame. (if frame threading isn't used)
This is also the Presentation time of this AVFrame calculated from
only AVPacket.dts values without pts values.

#### Inherited from

[`AVFrame`](AVFrame.md).[`pktDts`](AVFrame.md#pktdts)

#### Source

[avutil/struct/avframe.ts:414](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avutil/struct/avframe.ts#L414)

***

### ~~pktPos~~

> **pktPos**: `int64` = `NOPTS_VALUE_BIGINT`

reordered pos from the last AVPacket that has been input into the decoder
- encoding: unused
- decoding: Read by user.

#### Deprecated

use AV_CODEC_FLAG_COPY_OPAQUE to pass through arbitrary user
            data from packets to frames

#### Inherited from

[`AVFrame`](AVFrame.md).[`pktPos`](AVFrame.md#pktpos)

#### Source

[avutil/struct/avframe.ts:567](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avutil/struct/avframe.ts#L567)

***

### ~~pktSize~~

> **pktSize**: `int32` = `NOPTS_VALUE`

size of the corresponding packet containing the compressed
frame.
It is set to a negative value if unknown.
- encoding: unused
- decoding: set by libavcodec, read by user.

#### Deprecated

use AV_CODEC_FLAG_COPY_OPAQUE to pass through arbitrary user
            data from packets to frames

#### Inherited from

[`AVFrame`](AVFrame.md).[`pktSize`](AVFrame.md#pktsize)

#### Source

[avutil/struct/avframe.ts:595](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avutil/struct/avframe.ts#L595)

***

### privateRef

> **privateRef**: `pointer`\<[`AVBufferRef`](../../avbuffer/classes/AVBufferRef.md)\> = `nullptr`

AVBufferRef for internal use by a single libav* library.
Must not be used to transfer data between libraries.
Has to be NULL when ownership of the frame leaves the respective library.

Code outside the FFmpeg libs should never check or change the contents of the buffer ref.

FFmpeg calls av_buffer_unref() on it when the frame is unreferenced.
av_frame_copy_props() calls create a new reference with av_buffer_ref()
for the target frame's private_ref field.

#### Inherited from

[`AVFrame`](AVFrame.md).[`privateRef`](AVFrame.md#privateref)

#### Source

[avutil/struct/avframe.ts:640](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avutil/struct/avframe.ts#L640)

***

### pts

> **pts**: `int64` = `NOPTS_VALUE_BIGINT`

Presentation timestamp in time_base units (time when frame should be shown to user).

#### Inherited from

[`AVFrame`](AVFrame.md).[`pts`](AVFrame.md#pts)

#### Source

[avutil/struct/avframe.ts:407](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avutil/struct/avframe.ts#L407)

***

### quality

> **quality**: `int32` = `NOPTS_VALUE`

quality (between 1 (good) and FF_LAMBDA_MAX (bad))

#### Inherited from

[`AVFrame`](AVFrame.md).[`quality`](AVFrame.md#quality)

#### Source

[avutil/struct/avframe.ts:427](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avutil/struct/avframe.ts#L427)

***

### refCount

> **refCount**: `atomic_int32`

#### Source

[avutil/struct/avframe.ts:660](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avutil/struct/avframe.ts#L660)

***

### repeatPict

> **repeatPict**: `int32` = `NOPTS_VALUE`

Number of fields in this frame which should be repeated, i.e. the total
duration of this frame should be repeat_pict + 2 normal field durations.

For interlaced frames this field may be set to 1, which signals that this
frame should be presented as 3 fields: beginning with the first field (as
determined by AV_FRAME_FLAG_TOP_FIELD_FIRST being set or not), followed
by the second field, and then the first field again.

For progressive frames this field may be set to a multiple of 2, which
signals that this frame's duration should be (repeat_pict + 2) / 2
normal frame durations.

#### Note

This field is computed from MPEG2 repeat_first_field flag and its
associated flags, H.264 pic_struct from picture timing SEI, and
their analogues in other codecs. Typically it should only be used when
higher-layer timing information is not available.

#### Inherited from

[`AVFrame`](AVFrame.md).[`repeatPict`](AVFrame.md#repeatpict)

#### Source

[avutil/struct/avframe.ts:463](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avutil/struct/avframe.ts#L463)

***

### sampleAspectRatio

> **sampleAspectRatio**: `Rational`

Sample aspect ratio for the video frame, 0/1 if unknown/unspecified.

#### Inherited from

[`AVFrame`](AVFrame.md).[`sampleAspectRatio`](AVFrame.md#sampleaspectratio)

#### Source

[avutil/struct/avframe.ts:402](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avutil/struct/avframe.ts#L402)

***

### sampleRate

> **sampleRate**: `int32` = `NOPTS_VALUE`

Sample rate of the audio data.

#### Inherited from

[`AVFrame`](AVFrame.md).[`sampleRate`](AVFrame.md#samplerate)

#### Source

[avutil/struct/avframe.ts:491](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avutil/struct/avframe.ts#L491)

***

### sideData

> **sideData**: `pointer`\<`pointer`\<[`AVFrameSideData`](AVFrameSideData.md)\>\> = `nullptr`

#### Inherited from

[`AVFrame`](AVFrame.md).[`sideData`](AVFrame.md#sidedata)

#### Source

[avutil/struct/avframe.ts:526](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avutil/struct/avframe.ts#L526)

***

### timeBase

> **timeBase**: `Rational`

Time base for the timestamps in this frame.
In the future, this field may be set on frames output by decoders or
filters, but its value will be by default ignored on input to encoders
or filters.

#### Inherited from

[`AVFrame`](AVFrame.md).[`timeBase`](AVFrame.md#timebase)

#### Source

[avutil/struct/avframe.ts:422](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avutil/struct/avframe.ts#L422)

***

### ~~topFieldFirst~~

> **topFieldFirst**: `int32` = `NOPTS_VALUE`

If the content is interlaced, is top field displayed first.

#### Deprecated

Use AV_FRAME_FLAG_TOP_FIELD_FIRST instead

#### Inherited from

[`AVFrame`](AVFrame.md).[`topFieldFirst`](AVFrame.md#topfieldfirst)

#### Source

[avutil/struct/avframe.ts:479](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avutil/struct/avframe.ts#L479)

***

### width

> **width**: `int32` = `NOPTS_VALUE`

#### Name

Video dimensions
Video frames only. The coded dimensions (in pixels) of the video frame,
i.e. the size of the rectangle that contains some well-defined values.

#### Note

The part of the frame intended for display/presentation is further
restricted by the

#### Ref

cropping "Cropping rectangle".

#### Inherited from

[`AVFrame`](AVFrame.md).[`width`](AVFrame.md#width)

#### Source

[avutil/struct/avframe.ts:371](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avutil/struct/avframe.ts#L371)

## Methods

### close()

> **close**(): `void`

#### Returns

`void`

#### Inherited from

[`AVFrame`](AVFrame.md).[`close`](AVFrame.md#close)

#### Source

[avutil/struct/avframe.ts:652](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avutil/struct/avframe.ts#L652)
