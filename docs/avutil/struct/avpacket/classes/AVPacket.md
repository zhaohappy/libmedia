[**libmedia**](../../../../README.md) • **Docs**

***

[libmedia](../../../../README.md) / [avutil/struct/avpacket](../README.md) / AVPacket

# Class: AVPacket

FFmpeg AVPacket 定义

## Extended by

- [`AVPacketRef`](AVPacketRef.md)

## Constructors

### new AVPacket()

> **new AVPacket**(): [`AVPacket`](AVPacket.md)

#### Returns

[`AVPacket`](AVPacket.md)

## Properties

### bitFormat

> **bitFormat**: `int32` = `0`

码流格式
对于 h264/h265 标记是 annexb 还是 avcc 格式

#### Source

[avutil/struct/avpacket.ts:163](https://github.com/zhaohappy/libmedia/blob/b4bb608d2b1c00d036d73fc8d222b1a97be53694/src/avutil/struct/avpacket.ts#L163)

***

### buf

> **buf**: `pointer`\<[`AVBufferRef`](../../avbuffer/classes/AVBufferRef.md)\> = `nullptr`

A reference to the reference-counted buffer where the packet data is
stored.
May be NULL, then the packet data is not reference-counted.

#### Source

[avutil/struct/avpacket.ts:90](https://github.com/zhaohappy/libmedia/blob/b4bb608d2b1c00d036d73fc8d222b1a97be53694/src/avutil/struct/avpacket.ts#L90)

***

### data

> **data**: `pointer`\<`uint8`\> = `nullptr`

#### Source

[avutil/struct/avpacket.ts:110](https://github.com/zhaohappy/libmedia/blob/b4bb608d2b1c00d036d73fc8d222b1a97be53694/src/avutil/struct/avpacket.ts#L110)

***

### dts

> **dts**: `int64` = `NOPTS_VALUE_BIGINT`

Decompression timestamp in AVStream->time_base units; the time at which
the packet is decompressed.
Can be AV_NOPTS_VALUE if it is not stored in the file.

#### Source

[avutil/struct/avpacket.ts:108](https://github.com/zhaohappy/libmedia/blob/b4bb608d2b1c00d036d73fc8d222b1a97be53694/src/avutil/struct/avpacket.ts#L108)

***

### duration

> **duration**: `int64` = `NOPTS_VALUE_BIGINT`

Duration of this packet in AVStream->time_base units, 0 if unknown.
Equals next_pts - this_pts in presentation order.

#### Source

[avutil/struct/avpacket.ts:132](https://github.com/zhaohappy/libmedia/blob/b4bb608d2b1c00d036d73fc8d222b1a97be53694/src/avutil/struct/avpacket.ts#L132)

***

### flags

> **flags**: `int32` = `0`

A combination of AV_PKT_FLAG values

#### Source

[avutil/struct/avpacket.ts:119](https://github.com/zhaohappy/libmedia/blob/b4bb608d2b1c00d036d73fc8d222b1a97be53694/src/avutil/struct/avpacket.ts#L119)

***

### opaque

> **opaque**: `pointer`\<`void`\> = `nullptr`

for some private data of the user

#### Source

[avutil/struct/avpacket.ts:139](https://github.com/zhaohappy/libmedia/blob/b4bb608d2b1c00d036d73fc8d222b1a97be53694/src/avutil/struct/avpacket.ts#L139)

***

### opaqueRef

> **opaqueRef**: `pointer`\<[`AVBufferRef`](../../avbuffer/classes/AVBufferRef.md)\> = `nullptr`

AVBufferRef for free use by the API user. FFmpeg will never check the
contents of the buffer ref. FFmpeg calls av_buffer_unref() on it when
the packet is unreferenced. av_packet_copy_props() calls create a new
reference with av_buffer_ref() for the target packet's opaque_ref field.

This is unrelated to the opaque field, although it serves a similar
purpose.

#### Source

[avutil/struct/avpacket.ts:150](https://github.com/zhaohappy/libmedia/blob/b4bb608d2b1c00d036d73fc8d222b1a97be53694/src/avutil/struct/avpacket.ts#L150)

***

### pos

> **pos**: `int64` = `NOPTS_VALUE_BIGINT`

#### Source

[avutil/struct/avpacket.ts:134](https://github.com/zhaohappy/libmedia/blob/b4bb608d2b1c00d036d73fc8d222b1a97be53694/src/avutil/struct/avpacket.ts#L134)

***

### pts

> **pts**: `int64` = `NOPTS_VALUE_BIGINT`

Presentation timestamp in AVStream->time_base units; the time at which
the decompressed packet will be presented to the user.
Can be AV_NOPTS_VALUE if it is not stored in the file.
pts MUST be larger or equal to dts as presentation cannot happen before
decompression, unless one wants to view hex dumps. Some formats misuse
the terms dts and pts/cts to mean something different. Such timestamps
must be converted to true pts/dts before they are stored in AVPacket.

#### Source

[avutil/struct/avpacket.ts:101](https://github.com/zhaohappy/libmedia/blob/b4bb608d2b1c00d036d73fc8d222b1a97be53694/src/avutil/struct/avpacket.ts#L101)

***

### sideData

> **sideData**: `pointer`\<[`AVPacketSideData`](AVPacketSideData.md)\> = `nullptr`

Additional packet data that can be provided by the container.
Packet can contain several types of side information.

#### Source

[avutil/struct/avpacket.ts:125](https://github.com/zhaohappy/libmedia/blob/b4bb608d2b1c00d036d73fc8d222b1a97be53694/src/avutil/struct/avpacket.ts#L125)

***

### sideDataElems

> **sideDataElems**: `int32` = `0`

#### Source

[avutil/struct/avpacket.ts:126](https://github.com/zhaohappy/libmedia/blob/b4bb608d2b1c00d036d73fc8d222b1a97be53694/src/avutil/struct/avpacket.ts#L126)

***

### size

> **size**: `int32` = `0`

#### Source

[avutil/struct/avpacket.ts:112](https://github.com/zhaohappy/libmedia/blob/b4bb608d2b1c00d036d73fc8d222b1a97be53694/src/avutil/struct/avpacket.ts#L112)

***

### streamIndex

> **streamIndex**: `int32` = `NOPTS_VALUE`

#### Source

[avutil/struct/avpacket.ts:114](https://github.com/zhaohappy/libmedia/blob/b4bb608d2b1c00d036d73fc8d222b1a97be53694/src/avutil/struct/avpacket.ts#L114)

***

### timeBase

> **timeBase**: `Rational`

编码时间基

封装时用户设置

#### Source

[avutil/struct/avpacket.ts:157](https://github.com/zhaohappy/libmedia/blob/b4bb608d2b1c00d036d73fc8d222b1a97be53694/src/avutil/struct/avpacket.ts#L157)
