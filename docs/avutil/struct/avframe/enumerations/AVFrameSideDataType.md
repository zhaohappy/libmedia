[**libmedia**](../../../../README.md) • **Docs**

***

[libmedia](../../../../README.md) / [avutil/struct/avframe](../README.md) / AVFrameSideDataType

# Enumeration: AVFrameSideDataType

## Defgroup

lavu_frame AVFrame

## Ingroup

lavu_data

@{
AVFrame is an abstraction for reference-counted raw multimedia data.

## Enumeration Members

### AV\_FRAME\_DATA\_A53\_CC

> **AV\_FRAME\_DATA\_A53\_CC**: `1`

ATSC A53 Part 4 Closed Captions.
A53 CC bitstream is stored as uint8_t in AVFrameSideData.data.
The number of bytes of CC data is AVFrameSideData.size.

#### Source

[avutil/struct/avframe.ts:123](https://github.com/zhaohappy/libmedia/blob/a88305ff5d10e91621f2d71d24c72fc85681b8f7/src/avutil/struct/avframe.ts#L123)

***

### AV\_FRAME\_DATA\_AFD

> **AV\_FRAME\_DATA\_AFD**: `7`

Active Format Description data consisting of a single byte as specified
in ETSI TS 101 154 using AVActiveFormatDescription enum.

#### Source

[avutil/struct/avframe.ts:154](https://github.com/zhaohappy/libmedia/blob/a88305ff5d10e91621f2d71d24c72fc85681b8f7/src/avutil/struct/avframe.ts#L154)

***

### AV\_FRAME\_DATA\_AUDIO\_SERVICE\_TYPE

> **AV\_FRAME\_DATA\_AUDIO\_SERVICE\_TYPE**: `10`

This side data must be associated with an audio frame and corresponds to
enum AVAudioServiceType defined in avcodec.h.

#### Source

[avutil/struct/avframe.ts:178](https://github.com/zhaohappy/libmedia/blob/a88305ff5d10e91621f2d71d24c72fc85681b8f7/src/avutil/struct/avframe.ts#L178)

***

### AV\_FRAME\_DATA\_CONTENT\_LIGHT\_LEVEL

> **AV\_FRAME\_DATA\_CONTENT\_LIGHT\_LEVEL**: `14`

Content light level (based on CTA-861.3). This payload contains data in
the form of the AVContentLightMetadata struct.

#### Source

[avutil/struct/avframe.ts:201](https://github.com/zhaohappy/libmedia/blob/a88305ff5d10e91621f2d71d24c72fc85681b8f7/src/avutil/struct/avframe.ts#L201)

***

### AV\_FRAME\_DATA\_DETECTION\_BBOXES

> **AV\_FRAME\_DATA\_DETECTION\_BBOXES**: `22`

Bounding boxes for object detection and classification,
as described by AVDetectionBBoxHeader.

#### Source

[avutil/struct/avframe.ts:254](https://github.com/zhaohappy/libmedia/blob/a88305ff5d10e91621f2d71d24c72fc85681b8f7/src/avutil/struct/avframe.ts#L254)

***

### AV\_FRAME\_DATA\_DISPLAYMATRIX

> **AV\_FRAME\_DATA\_DISPLAYMATRIX**: `6`

This side data contains a 3x3 transformation matrix describing an affine
transformation that needs to be applied to the frame for correct
presentation.

See libcommon/display.h for a detailed description of the data.

#### Source

[avutil/struct/avframe.ts:149](https://github.com/zhaohappy/libmedia/blob/a88305ff5d10e91621f2d71d24c72fc85681b8f7/src/avutil/struct/avframe.ts#L149)

***

### AV\_FRAME\_DATA\_DOWNMIX\_INFO

> **AV\_FRAME\_DATA\_DOWNMIX\_INFO**: `4`

Metadata relevant to a downmix procedure.
The data is the AVDownmixInfo struct defined in libcommon/downmix_info.h.

#### Source

[avutil/struct/avframe.ts:137](https://github.com/zhaohappy/libmedia/blob/a88305ff5d10e91621f2d71d24c72fc85681b8f7/src/avutil/struct/avframe.ts#L137)

***

### AV\_FRAME\_DATA\_DYNAMIC\_HDR\_PLUS

> **AV\_FRAME\_DATA\_DYNAMIC\_HDR\_PLUS**: `17`

HDR dynamic metadata associated with a video frame. The payload is
an AVDynamicHDRPlus type and contains information for color
volume transform - application 4 of SMPTE 2094-40:2016 standard.

#### Source

[avutil/struct/avframe.ts:223](https://github.com/zhaohappy/libmedia/blob/a88305ff5d10e91621f2d71d24c72fc85681b8f7/src/avutil/struct/avframe.ts#L223)

***

### AV\_FRAME\_DATA\_FILM\_GRAIN\_PARAMS

> **AV\_FRAME\_DATA\_FILM\_GRAIN\_PARAMS**: `21`

Film grain parameters for a frame, described by AVFilmGrainParams.
Must be present for every frame which should have film grain applied.

#### Source

[avutil/struct/avframe.ts:248](https://github.com/zhaohappy/libmedia/blob/a88305ff5d10e91621f2d71d24c72fc85681b8f7/src/avutil/struct/avframe.ts#L248)

***

### AV\_FRAME\_DATA\_GOP\_TIMECODE

> **AV\_FRAME\_DATA\_GOP\_TIMECODE**: `12`

The GOP timecode in 25 bit timecode format. Data format is 64-bit integer.
This is set on the first frame of a GOP that has a temporal reference of 0.

#### Source

[avutil/struct/avframe.ts:189](https://github.com/zhaohappy/libmedia/blob/a88305ff5d10e91621f2d71d24c72fc85681b8f7/src/avutil/struct/avframe.ts#L189)

***

### AV\_FRAME\_DATA\_ICC\_PROFILE

> **AV\_FRAME\_DATA\_ICC\_PROFILE**: `15`

The data contains an ICC profile as an opaque octet buffer following the
format described by ISO 15076-1 with an optional name defined in the
metadata key entry "name".

#### Source

[avutil/struct/avframe.ts:208](https://github.com/zhaohappy/libmedia/blob/a88305ff5d10e91621f2d71d24c72fc85681b8f7/src/avutil/struct/avframe.ts#L208)

***

### AV\_FRAME\_DATA\_MASTERING\_DISPLAY\_METADATA

> **AV\_FRAME\_DATA\_MASTERING\_DISPLAY\_METADATA**: `11`

Mastering display metadata associated with a video frame. The payload is
an AVMasteringDisplayMetadata type and contains information about the
mastering display color volume.

#### Source

[avutil/struct/avframe.ts:184](https://github.com/zhaohappy/libmedia/blob/a88305ff5d10e91621f2d71d24c72fc85681b8f7/src/avutil/struct/avframe.ts#L184)

***

### AV\_FRAME\_DATA\_MATRIXENCODING

> **AV\_FRAME\_DATA\_MATRIXENCODING**: `3`

The data is the AVMatrixEncoding enum defined in libcommon/channel_layout.h.

#### Source

[avutil/struct/avframe.ts:132](https://github.com/zhaohappy/libmedia/blob/a88305ff5d10e91621f2d71d24c72fc85681b8f7/src/avutil/struct/avframe.ts#L132)

***

### AV\_FRAME\_DATA\_MOTION\_VECTORS

> **AV\_FRAME\_DATA\_MOTION\_VECTORS**: `8`

Motion vectors exported by some codecs (on demand through the export_mvs
flag set in the libavcodec AVCodecContext flags2 option).
The data is the AVMotionVector struct defined in
libcommon/motion_vector.h.

#### Source

[avutil/struct/avframe.ts:161](https://github.com/zhaohappy/libmedia/blob/a88305ff5d10e91621f2d71d24c72fc85681b8f7/src/avutil/struct/avframe.ts#L161)

***

### AV\_FRAME\_DATA\_PANSCAN

> **AV\_FRAME\_DATA\_PANSCAN**: `0`

The data is the AVPanScan struct defined in libavcodec.

#### Source

[avutil/struct/avframe.ts:117](https://github.com/zhaohappy/libmedia/blob/a88305ff5d10e91621f2d71d24c72fc85681b8f7/src/avutil/struct/avframe.ts#L117)

***

### AV\_FRAME\_DATA\_REGIONS\_OF\_INTEREST

> **AV\_FRAME\_DATA\_REGIONS\_OF\_INTEREST**: `18`

Regions Of Interest, the data is an array of AVRegionOfInterest type, the number of
array element is implied by AVFrameSideData.size / AVRegionOfInterest.self_size.

#### Source

[avutil/struct/avframe.ts:229](https://github.com/zhaohappy/libmedia/blob/a88305ff5d10e91621f2d71d24c72fc85681b8f7/src/avutil/struct/avframe.ts#L229)

***

### AV\_FRAME\_DATA\_REPLAYGAIN

> **AV\_FRAME\_DATA\_REPLAYGAIN**: `5`

ReplayGain information in the form of the AVReplayGain struct.

#### Source

[avutil/struct/avframe.ts:141](https://github.com/zhaohappy/libmedia/blob/a88305ff5d10e91621f2d71d24c72fc85681b8f7/src/avutil/struct/avframe.ts#L141)

***

### AV\_FRAME\_DATA\_S12M\_TIMECODE

> **AV\_FRAME\_DATA\_S12M\_TIMECODE**: `16`

Timecode which conforms to SMPTE ST 12-1. The data is an array of 4 uint32_t
where the first uint32_t describes how many (1-3) of the other timecodes are used.
The timecode format is described in the documentation of av_timecode_get_smpte_from_framenum()
function in libcommon/timecode.h.

#### Source

[avutil/struct/avframe.ts:216](https://github.com/zhaohappy/libmedia/blob/a88305ff5d10e91621f2d71d24c72fc85681b8f7/src/avutil/struct/avframe.ts#L216)

***

### AV\_FRAME\_DATA\_SEI\_UNREGISTERED

> **AV\_FRAME\_DATA\_SEI\_UNREGISTERED**: `20`

User data unregistered metadata associated with a video frame.
This is the H.26[45] UDU SEI message, and shouldn't be used for any other purpose
The data is stored as uint8_t in AVFrameSideData.data which is 16 bytes of
uuid_iso_iec_11578 followed by AVFrameSideData.size - 16 bytes of user_data_payload_byte.

#### Source

[avutil/struct/avframe.ts:242](https://github.com/zhaohappy/libmedia/blob/a88305ff5d10e91621f2d71d24c72fc85681b8f7/src/avutil/struct/avframe.ts#L242)

***

### AV\_FRAME\_DATA\_SKIP\_SAMPLES

> **AV\_FRAME\_DATA\_SKIP\_SAMPLES**: `9`

Recommmends skipping the specified number of samples. This is exported
only if the "skip_manual" AVOption is set in libavcodec.
This has the same format as AV_PKT_DATA_SKIP_SAMPLES.

#### Code

u32le number of samples to skip from start of this packet
u32le number of samples to skip from end of this packet
u8    reason for start skip
u8    reason for end   skip (0=padding silence, 1=convergence)

#### Endcode

#### Source

[avutil/struct/avframe.ts:173](https://github.com/zhaohappy/libmedia/blob/a88305ff5d10e91621f2d71d24c72fc85681b8f7/src/avutil/struct/avframe.ts#L173)

***

### AV\_FRAME\_DATA\_SPHERICAL

> **AV\_FRAME\_DATA\_SPHERICAL**: `13`

The data represents the AVSphericalMapping structure defined in
libcommon/spherical.h.

#### Source

[avutil/struct/avframe.ts:195](https://github.com/zhaohappy/libmedia/blob/a88305ff5d10e91621f2d71d24c72fc85681b8f7/src/avutil/struct/avframe.ts#L195)

***

### AV\_FRAME\_DATA\_STEREO3D

> **AV\_FRAME\_DATA\_STEREO3D**: `2`

Stereoscopic 3d metadata.
The data is the AVStereo3D struct defined in libcommon/stereo3d.h.

#### Source

[avutil/struct/avframe.ts:128](https://github.com/zhaohappy/libmedia/blob/a88305ff5d10e91621f2d71d24c72fc85681b8f7/src/avutil/struct/avframe.ts#L128)

***

### AV\_FRAME\_DATA\_VIDEO\_ENC\_PARAMS

> **AV\_FRAME\_DATA\_VIDEO\_ENC\_PARAMS**: `19`

Encoding parameters for a video frame, as described by AVVideoEncParams.

#### Source

[avutil/struct/avframe.ts:234](https://github.com/zhaohappy/libmedia/blob/a88305ff5d10e91621f2d71d24c72fc85681b8f7/src/avutil/struct/avframe.ts#L234)
