[**libmedia**](../../../README.md) • **Docs**

***

[libmedia](../../../README.md) / [avformat/AVStream](../README.md) / AVDisposition

# Enumeration: AVDisposition

## Enumeration Members

### ATTACHED\_PIC

> **ATTACHED\_PIC**: `1024`

The stream is stored in the file as an attached picture/"cover art" (e.g.
APIC frame in ID3v2). The first (usually only) packet associated with it
will be returned among the first few packets read from the file unless
seeking takes place. It can also be accessed at any time in
AVStream.attached_pic.

#### Source

[avformat/AVStream.ts:66](https://github.com/zhaohappy/libmedia/blob/acbbf6bd75e6ee4c968b9f441fe28c40f42f350d/src/avformat/AVStream.ts#L66)

***

### CAPTIONS

> **CAPTIONS**: `65536`

To specify text track kind (different from subtitles default).

#### Source

[avformat/AVStream.ts:76](https://github.com/zhaohappy/libmedia/blob/acbbf6bd75e6ee4c968b9f441fe28c40f42f350d/src/avformat/AVStream.ts#L76)

***

### CLEAN\_EFFECTS

> **CLEAN\_EFFECTS**: `512`

stream without voice

#### Source

[avformat/AVStream.ts:58](https://github.com/zhaohappy/libmedia/blob/acbbf6bd75e6ee4c968b9f441fe28c40f42f350d/src/avformat/AVStream.ts#L58)

***

### COMMENT

> **COMMENT**: `8`

#### Source

[avformat/AVStream.ts:37](https://github.com/zhaohappy/libmedia/blob/acbbf6bd75e6ee4c968b9f441fe28c40f42f350d/src/avformat/AVStream.ts#L37)

***

### DEFAULT

> **DEFAULT**: `1`

#### Source

[avformat/AVStream.ts:34](https://github.com/zhaohappy/libmedia/blob/acbbf6bd75e6ee4c968b9f441fe28c40f42f350d/src/avformat/AVStream.ts#L34)

***

### DEPENDENT

> **DEPENDENT**: `524288`

dependent audio stream (mix_type=0 in mpegts)

#### Source

[avformat/AVStream.ts:82](https://github.com/zhaohappy/libmedia/blob/acbbf6bd75e6ee4c968b9f441fe28c40f42f350d/src/avformat/AVStream.ts#L82)

***

### DESCRIPTIONS

> **DESCRIPTIONS**: `131072`

#### Source

[avformat/AVStream.ts:77](https://github.com/zhaohappy/libmedia/blob/acbbf6bd75e6ee4c968b9f441fe28c40f42f350d/src/avformat/AVStream.ts#L77)

***

### DUB

> **DUB**: `2`

#### Source

[avformat/AVStream.ts:35](https://github.com/zhaohappy/libmedia/blob/acbbf6bd75e6ee4c968b9f441fe28c40f42f350d/src/avformat/AVStream.ts#L35)

***

### FORCED

> **FORCED**: `64`

Track should be used during playback by default.
Useful for subtitle track that should be displayed
even when user did not explicitly ask for subtitles.

#### Source

[avformat/AVStream.ts:46](https://github.com/zhaohappy/libmedia/blob/acbbf6bd75e6ee4c968b9f441fe28c40f42f350d/src/avformat/AVStream.ts#L46)

***

### HEARING\_IMPAIRED

> **HEARING\_IMPAIRED**: `128`

stream for hearing impaired audiences

#### Source

[avformat/AVStream.ts:50](https://github.com/zhaohappy/libmedia/blob/acbbf6bd75e6ee4c968b9f441fe28c40f42f350d/src/avformat/AVStream.ts#L50)

***

### KARAOKE

> **KARAOKE**: `32`

#### Source

[avformat/AVStream.ts:39](https://github.com/zhaohappy/libmedia/blob/acbbf6bd75e6ee4c968b9f441fe28c40f42f350d/src/avformat/AVStream.ts#L39)

***

### LYRICS

> **LYRICS**: `16`

#### Source

[avformat/AVStream.ts:38](https://github.com/zhaohappy/libmedia/blob/acbbf6bd75e6ee4c968b9f441fe28c40f42f350d/src/avformat/AVStream.ts#L38)

***

### METADATA

> **METADATA**: `262144`

#### Source

[avformat/AVStream.ts:78](https://github.com/zhaohappy/libmedia/blob/acbbf6bd75e6ee4c968b9f441fe28c40f42f350d/src/avformat/AVStream.ts#L78)

***

### NONE

> **NONE**: `0`

#### Source

[avformat/AVStream.ts:33](https://github.com/zhaohappy/libmedia/blob/acbbf6bd75e6ee4c968b9f441fe28c40f42f350d/src/avformat/AVStream.ts#L33)

***

### ORIGINAL

> **ORIGINAL**: `4`

#### Source

[avformat/AVStream.ts:36](https://github.com/zhaohappy/libmedia/blob/acbbf6bd75e6ee4c968b9f441fe28c40f42f350d/src/avformat/AVStream.ts#L36)

***

### STILL\_IMAGE

> **STILL\_IMAGE**: `1048576`

still images in video stream (still_picture_flag=1 in mpegts

#### Source

[avformat/AVStream.ts:86](https://github.com/zhaohappy/libmedia/blob/acbbf6bd75e6ee4c968b9f441fe28c40f42f350d/src/avformat/AVStream.ts#L86)

***

### TIMED\_THUMBNAILS

> **TIMED\_THUMBNAILS**: `2048`

The stream is sparse, and contains thumbnail images, often corresponding
to chapter markers. Only ever used with AV_DISPOSITION_ATTACHED_PIC.

#### Source

[avformat/AVStream.ts:71](https://github.com/zhaohappy/libmedia/blob/acbbf6bd75e6ee4c968b9f441fe28c40f42f350d/src/avformat/AVStream.ts#L71)

***

### VISUAL\_IMPAIRED

> **VISUAL\_IMPAIRED**: `256`

stream for visual impaired audiences

#### Source

[avformat/AVStream.ts:54](https://github.com/zhaohappy/libmedia/blob/acbbf6bd75e6ee4c968b9f441fe28c40f42f350d/src/avformat/AVStream.ts#L54)
