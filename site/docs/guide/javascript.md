---
nav:
  title: 指南
  order: 2
group:
  title: 开始
order: 10
---

# 在 JavaScript 中使用

原则上你需要使用 TypeScript 语言来基于 libmedia 做音视频开发。如果必须要使用 JavaScript 来开发则需要掌握在 JavaScript 中访问指针数据的技巧，这需要你对 cheap 比较熟悉。

## 访问结构体指针属性

```javascript

import { mapStruct } from '@libmedia/cheap'
import { AVPacket } from '@libmedia/avutil'

// 一个 avpacket 指针变量
let avpacket
// 使用 mapStruct 将指针转成 proxy 代理
const avpacketProxy = mapStruct(avpacket, AVPacket)
// 使用 js 访问 avpacket 的属性
console.log(avpacketProxy.pts)

```

## 结构体实例取地址

```javascript
import { addressof } from '@libmedia/cheap'

let stream = iformatContext.getStreamByMediaType(AVMediaType.AVMEDIA_TYPE_AUDIO)
// 可以通过访问实例的 symbolStructAddress 属性得到实例地址
let codecpar = addressof(stream.codecpar)

```

## 结构体属性取地址

```javascript
import { offsetof } from '@libmedia/cheap'
import { AVPacket } from '@libmedia/avutil'

// 一个 avpacket 指针变量
let avpacket
// 获取 avpacket 指针下的 data 地址，基址 + 偏移
const data = avpacket + offsetof(AVPacket, 'data')

```