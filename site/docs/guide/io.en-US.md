---
nav:
  title: Guide
  order: 2
group:
  title: Code Interpretation
  order: 2
order: 3
---

# IO Input & Output

The data input of libmedia is handled by [IOReader](https://zhaohappy.github.io/libmedia/docs/libmedia_api/classes/common_io_IOReader.IOReader.html), and the data output is handled by [IOWriterSync](https://zhaohappy.github.io/libmedia/docs/libmedia_api/classes/common_io_IOWriterSync.IOWriterSync.html).

## IOReader

IOReader is asynchronous and can be used to read stream data from any source. After creating AVIFormatContext, you need to set the ioReader property to mount the IOReader instance as the input source of AVIFormatContext.

The following is an example of reading data from a file

```typescript

import { IOFlags } from '@libmedia/avutil/avformat'
import IOReader from '@libmedia/common/io/IOReader'

const readFile: File

const ioReader = new IOReader()
// set seekable flag
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

The main logic is to set the ```onFlush```, ```onSeek```, and ```onSize``` callbacks of IOReader, which all can be set as synchronous methods or asynchronous methods.

The ```onFlush``` callback will write data to the buffer(from parameter). The parameter of buffer is a Uint8Array-like structure, and you can only use the set method; it returns the length of the written data.

The ```onSeek``` callback tells the user where the next ```onFlush``` will read data from the file data. If the source can seek, be sure to set the ```IOFlags.SEEKABLE``` flag in ```ioReader.flags```

The ```onSize``` callback returns the size of the file in bytes, you can return 0n if you don't know file size(this may cause demux can not seek).

## IOWriterSync

IOWriterSync is synchronous. After creating AVOFormatContext, you need to set the ioWriter property to mount the IOWriterSync instance as the output source of AVOFormatContext. The output data can be written directly to a file or transmitted over the network.

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
The main logic is to set the ```onFlush``` and ```onSeek``` callbacks of IOWriterSync.

If the parameter pos of ```onFlush``` has a value, it means appending data at the file pos. Do not overwrite the data after pos (some formats will seek to the file header to append data after finished writing the data, such as moving the moov box to the beginning of the file when mux mp4 format); otherwise, write data at the current file position, and overwrite if there is data behind.

```onSeek``` is used to adjust the file writing position, and the next ```onFlush``` will overwrite and write from this position.