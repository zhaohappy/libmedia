---
nav:
  title: Guide
  order: 2
group:
  title: Other
order: 5
---

# Migration to Version v1

The v1 API introduces some breaking changes. Please follow the steps below to migrate.

### Module export aggregation

Previously, each module was imported directly using source file paths, which was not convenient for future maintenance. This has now been changed to aggregated exports, so you can import directly from the package name.

For example:

```typescript

import * as demux from '@libmedia/avformat/demux'
import { AVPacketFlags } from '@libmedia/avutil/struct/avpacket'
import { createAVIFormatContext } from '@libmedia/avformat/AVFormatContext'
import { createAVPacket, destroyAVPacket } from '@libmedia/avutil/util/avpacket'

```

Changed to:

```typescript

import { demux, createAVIFormatContext } from '@libmedia/avformat'
import { AVPacketFlags, createAVPacket, destroyAVPacket } from '@libmedia/avutil'

```

You can refer to the API documentation to see the exact exports of each package.

For items such as ```IxxxFormat``` and ```OxxxFormat``` under the``` @libmedia/avformat``` package, import them using their corresponding paths like ```@libmedia/avformat/IxxxFormat``` or ```@libmedia/avformat/OxxxFormat```.
This is to optimize dynamic loading and prevent bundling all Format code into a single package.

### structAccess -> mapStruct

The ```structAccess``` function in cheap has been renamed to ```mapStruct```.

```typescript

import { mapStruct } from '@libmedia/cheap'

let p: pointer<A>

let a = mapStruct(p, A)

```