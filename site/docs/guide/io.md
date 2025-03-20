---
nav:
  title: 指南
  order: 2
group:
  title: 代码解读
  order: 2
order: 3
---

# IO 输入输出

libmedia 的数据输入由 [IOReader](https://zhaohappy.github.io/libmedia/docs/libmedia_api/classes/common_io_IOReader.IOReader.html) 代理，数据输出由 [IOWriterSync](https://zhaohappy.github.io/libmedia/docs/libmedia_api/classes/common_io_IOWriterSync.IOWriterSync.html) 代理。

## IOReader

IOReader 是异步的，可以用来读取任何来源的流数据。当创建 AVIFormatContext 之后需要设置 ioReader 属性挂载 IOReader 实例作为 AVIFormatContext 的输入源。

下面是从文件中读取数据的例子

```typescript

import { IOFlags } from '@libmedia/avutil/avformat'
import IOReader from '@libmedia/common/io/IOReader'

const readFile: File

const ioReader = new IOReader()

// 设置可以 seek 标志
ioReader.flags |= IOFlags.SEEKABLE

let readPos = 0
const readFileLength = readFile.size

ioReader.onFlush = async (buffer) => {
  if (readPos >= readFileLength) {
    return IOError.END
  }
  const len = Math.min(buffer.length, readFileLength - readPos)

  buffer.set(new Uint8Array(await (readFile.slice(readPos, readPos + len).arrayBuffer())), 0)

  readPos += len

  return len
}
ioReader.onSeek = (pos) => {
  readPos = Number(pos)
  return 0
}

ioReader.onSize = () => {
  return BigInt(readFile.size)
}
```

主要逻辑是设置 IOReader 的 ```onFlush```、```onSeek```、```onSize``` 回调，它们可以设置为同步方法或者异步方法。

```onFlush``` 回调里面写入数据，参数是待写入的 buffer，这个 buffer 是类 Uint8Array 结构，你只能使用 set 方法；返回已写入的数据长度。

```onSeek``` 回调告诉用户下一次 ```onFlush``` 从文件数据的哪个位置读取数据写入 buffer。如果源可以 seek 务必设置 ```ioReader.flags``` 的 ```IOFlags.SEEKABLE``` 标志

```onSize``` 回调返回文件的大小，单位字节，若没有可返回 0n，返回 0n 时可能会造成 demux 无法 seek 成功。

## IOWriterSync

IOWriterSync 是同步的。当创建 AVOFormatContext 之后需要设置 ioWriter 属性挂载 IOWriterSync 实例作为 AVOFormatContext 的输出源。输出的数据可以直接写入文件或者通过网络传输。

```typescript

import IOWriterSync from '@libmedia/common/io/IOWriterSync'

const ioWriter = new IOWriterSync()

ioWriter.onFlush = (data: Uint8Array, pos: int64) => {
  return 0
}
ioWriter.onSeek = (pos) => {
  return 0
}

```

主要是设置 IOWriterSync 的 ```onFlush```、```onSeek``` 回调。

其中 ```onFlush``` 若参数 pos 有值则表示在文件 pos 处追加数据，此时不要覆盖 pos 后面的数据（某些封装格式会在写完数据之后返回到文件头部追加数据，比如封装 mp4 时将 moov box 移到文件开始的位置）；否则在当前文件位置写入数据，若后面有数据则会覆盖。

```onSeek``` 用于调整文件写入位置，下一次 ```onFlush``` 从这个位置覆盖写入。