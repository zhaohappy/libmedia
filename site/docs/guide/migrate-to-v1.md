---
nav:
  title: 指南
  order: 2
group:
  title: 其他
order: 5
---

# 迁移至 v1 版本

v1 版本的 API 有一些破坏性变更，请按以下步骤迁移。

### 模块导出聚合

原来各个模块导入路径直接使用源码路径导入，不利于后期维护，现更改为聚合导出，直接使用包名导入即可。

比如:

```typescript

import * as demux from '@libmedia/avformat/demux'
import { AVPacketFlags } from '@libmedia/avutil/struct/avpacket'
import { createAVIFormatContext } from '@libmedia/avformat/AVFormatContext'
import { createAVPacket, destroyAVPacket } from '@libmedia/avutil/util/avpacket'

```

更改为:

```typescript

import { demux, createAVIFormatContext } from '@libmedia/avformat'
import { AVPacketFlags, createAVPacket, destroyAVPacket } from '@libmedia/avutil'

```

具体可查看 API 文档查询各个包具体导出内容，也可以查看体验中的示例代码。

```@libmedia/avformat``` 包下的诸如 ```IxxxFormat``` 和 ```OxxxFormat``` 使用对应的 ```@libmedia/avformat/IxxxFormat``` 或 ```@libmedia/avformat/OxxxFormat``` 来导入，这是为了对动态加载进行优化，避免将所有 Format 代码都打入一个包。

### structAccess -> mapStruct

cheap 方法 ```structAccess``` 更改为 ```mapStruct```

```typescript

import { mapStruct } from '@libmedia/cheap'

let p: pointer<A>

let a = mapStruct(p, A)

```