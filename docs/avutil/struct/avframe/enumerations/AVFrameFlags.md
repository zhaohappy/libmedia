[**libmedia**](../../../../README.md) • **Docs**

***

[libmedia](../../../../README.md) / [avutil/struct/avframe](../README.md) / AVFrameFlags

# Enumeration: AVFrameFlags

## Enumeration Members

### AV\_FRAME\_FLAG\_CORRUPT

> **AV\_FRAME\_FLAG\_CORRUPT**: `1`

The frame data may be corrupted, e.g. due to decoding errors.

#### Source

[avutil/struct/avframe.ts:42](https://github.com/zhaohappy/libmedia/blob/acbbf6bd75e6ee4c968b9f441fe28c40f42f350d/src/avutil/struct/avframe.ts#L42)

***

### AV\_FRAME\_FLAG\_DISCARD

> **AV\_FRAME\_FLAG\_DISCARD**: `4`

A flag to mark the frames which need to be decoded, but shouldn't be output.

#### Source

[avutil/struct/avframe.ts:50](https://github.com/zhaohappy/libmedia/blob/acbbf6bd75e6ee4c968b9f441fe28c40f42f350d/src/avutil/struct/avframe.ts#L50)

***

### AV\_FRAME\_FLAG\_INTERLACED

> **AV\_FRAME\_FLAG\_INTERLACED**: `8`

A flag to mark frames whose content is interlaced.

#### Source

[avutil/struct/avframe.ts:54](https://github.com/zhaohappy/libmedia/blob/acbbf6bd75e6ee4c968b9f441fe28c40f42f350d/src/avutil/struct/avframe.ts#L54)

***

### AV\_FRAME\_FLAG\_KEY

> **AV\_FRAME\_FLAG\_KEY**: `2`

A flag to mark frames that are keyframes.

#### Source

[avutil/struct/avframe.ts:46](https://github.com/zhaohappy/libmedia/blob/acbbf6bd75e6ee4c968b9f441fe28c40f42f350d/src/avutil/struct/avframe.ts#L46)

***

### AV\_FRAME\_FLAG\_NONE

> **AV\_FRAME\_FLAG\_NONE**: `0`

#### Source

[avutil/struct/avframe.ts:38](https://github.com/zhaohappy/libmedia/blob/acbbf6bd75e6ee4c968b9f441fe28c40f42f350d/src/avutil/struct/avframe.ts#L38)

***

### AV\_FRAME\_FLAG\_TOP\_FIELD\_FIRST

> **AV\_FRAME\_FLAG\_TOP\_FIELD\_FIRST**: `16`

A flag to mark frames where the top field is displayed first if the content
is interlaced.

#### Source

[avutil/struct/avframe.ts:59](https://github.com/zhaohappy/libmedia/blob/acbbf6bd75e6ee4c968b9f441fe28c40f42f350d/src/avutil/struct/avframe.ts#L59)
