[**libmedia**](../../../../README.md) • **Docs**

***

[libmedia](../../../../README.md) / [avutil/struct/avpacket](../README.md) / AVPacketFlags

# Enumeration: AVPacketFlags

## Enumeration Members

### AV\_PKT\_FLAG\_CORRUPT

> **AV\_PKT\_FLAG\_CORRUPT**: `2`

The packet content is corrupted

#### Source

[avutil/struct/avpacket.ts:44](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avutil/struct/avpacket.ts#L44)

***

### AV\_PKT\_FLAG\_DISCARD

> **AV\_PKT\_FLAG\_DISCARD**: `4`

Flag is used to discard packets which are required to maintain valid
decoder state but are not required for output and should be dropped
after decoding.

#### Source

[avutil/struct/avpacket.ts:50](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avutil/struct/avpacket.ts#L50)

***

### AV\_PKT\_FLAG\_DISPOSABLE

> **AV\_PKT\_FLAG\_DISPOSABLE**: `16`

Flag is used to indicate packets that contain frames that can
be discarded by the decoder.  I.e. Non-reference frames.

#### Source

[avutil/struct/avpacket.ts:62](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avutil/struct/avpacket.ts#L62)

***

### AV\_PKT\_FLAG\_END

> **AV\_PKT\_FLAG\_END**: `32`

The stream is end

#### Source

[avutil/struct/avpacket.ts:67](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avutil/struct/avpacket.ts#L67)

***

### AV\_PKT\_FLAG\_KEY

> **AV\_PKT\_FLAG\_KEY**: `1`

The packet contains a keyframe

#### Source

[avutil/struct/avpacket.ts:40](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avutil/struct/avpacket.ts#L40)

***

### AV\_PKT\_FLAG\_TRUSTED

> **AV\_PKT\_FLAG\_TRUSTED**: `8`

The packet comes from a trusted source.

Otherwise-unsafe constructs such as arbitrary pointers to data
outside the packet may be followed.

#### Source

[avutil/struct/avpacket.ts:57](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avutil/struct/avpacket.ts#L57)
