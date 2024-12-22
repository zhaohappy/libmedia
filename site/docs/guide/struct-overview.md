---
nav:
  title: 指南
  order: 2
group:
  title: 代码解读
  order: 2
order: 1
---

# 数据结构

想要使用 libmedia，你就需要了解几个重要的数据结构。这些数据结构来自于 FFmpeg，如果你了解了 [cheap](https://github.com/zhaohappy/cheap) 的思想，就会明白为什么 libmedia 需要让这些数据结构和 FFmpeg 保持一致。若你之前学习掌握过 FFmpeg 则可以跳过下面的内容。

## AVIFormatContext

[AVIFormatContext](https://zhaohappy.github.io/libmedia/docs/libmedia_api/interfaces/avformat_AVFormatContext.AVIFormatContext.html) 是解封装上下文，是用于保存对输入数据操作的其他关联结构、数据、上下文信息的数据结构。它通过 [createAVIFormatContext](https://zhaohappy.github.io/libmedia/docs/libmedia_api/functions/avformat_AVFormatContext.createAVIFormatContext.html) 来创建。[AVIFormatContext](https://zhaohappy.github.io/libmedia/docs/libmedia_api/interfaces/avformat_AVFormatContext.AVIFormatContext.html) 中有 [streams](https://zhaohappy.github.io/libmedia/docs/libmedia_api/interfaces/avformat_AVFormatContext.AVIFormatContext.html#streams) 数据可以拿到输入数据中的流信息；[chapters](https://zhaohappy.github.io/libmedia/docs/libmedia_api/interfaces/avformat_AVFormatContext.AVIFormatContext.html#chapters) 数据可以拿到输入数据的章节信息；[metadata](https://zhaohappy.github.io/libmedia/docs/libmedia_api/interfaces/avformat_AVFormatContext.AVIFormatContext.html#metadata) 可以拿到输入数据的一些元数据。

## AVOFormatContext

[AVOFormatContext](https://zhaohappy.github.io/libmedia/docs/libmedia_api/interfaces/avformat_AVFormatContext.AVOFormatContext.html) 是封装上下文，是用于保存对输出数据操作的其他关联结构、数据、上下文信息的数据结构。它通过 [createAVOFormatContext](https://zhaohappy.github.io/libmedia/docs/libmedia_api/functions/avformat_AVFormatContext.createAVOFormatContext.html) 创建。[AVOFormatContext](https://zhaohappy.github.io/libmedia/docs/libmedia_api/interfaces/avformat_AVFormatContext.AVOFormatContext.html)  的数据基本和 [AVIFormatContext](https://zhaohappy.github.io/libmedia/docs/libmedia_api/interfaces/avformat_AVFormatContext.AVIFormatContext.html) 一样，区别是 [AVIFormatContext](https://zhaohappy.github.io/libmedia/docs/libmedia_api/interfaces/avformat_AVFormatContext.AVIFormatContext.html) 中的数据由 [demux](https://zhaohappy.github.io/libmedia/docs/libmedia_api/modules/avformat_demux.html) 模块自动写入，[AVOFormatContext](https://zhaohappy.github.io/libmedia/docs/libmedia_api/interfaces/avformat_AVFormatContext.AVOFormatContext.html) 由用户自己写入。

## AVStream

[AVStream](https://zhaohappy.github.io/libmedia/docs/libmedia_api/classes/avutil_AVStream.AVStream.html) 数据结构保存一个媒体的具体信息。一般的，一个视频文件有一个视频 [AVStream](https://zhaohappy.github.io/libmedia/docs/libmedia_api/classes/avutil_AVStream.AVStream.html) 和一个或多个音频 [AVStream](https://zhaohappy.github.io/libmedia/docs/libmedia_api/classes/avutil_AVStream.AVStream.html)；一些视频格式还可能有一个或多个字幕 [AVStream](https://zhaohappy.github.io/libmedia/docs/libmedia_api/classes/avutil_AVStream.AVStream.html)。[AVStream](https://zhaohappy.github.io/libmedia/docs/libmedia_api/classes/avutil_AVStream.AVStream.html) 中保存有媒体的编码信息，开始时间，时长、媒体元数据、时间基等重要数据。

## AVCodecParameters

[AVCodecParameters](https://zhaohappy.github.io/libmedia/docs/libmedia_api/classes/avutil_struct_avcodecparameters.AVCodecParameters.html) 数据结构保存媒体的编码信息，是一个至关重要的数据结构。可以通过 [codecId](https://zhaohappy.github.io/libmedia/docs/libmedia_api/classes/avutil_struct_avcodecparameters.AVCodecParameters.html#codecid) 拿到编码类型；可以通过 [extradata](https://zhaohappy.github.io/libmedia/docs/libmedia_api/classes/avutil_struct_avcodecparameters.AVCodecParameters.html#extradata) 拿到编码的 extradata（一个对创建解码器非常重要的数据结构，如果你用过 WebCodecs，创建解码器需要传一个 [description](https://developer.mozilla.org/en-US/docs/Web/API/VideoDecoder/configure#description) 的数据，它就是 [extradata](https://zhaohappy.github.io/libmedia/docs/libmedia_api/classes/avutil_struct_avcodecparameters.AVCodecParameters.html#extradata)）。对于视频媒体可以拿到视频宽高、帧率、码率、颜色空间、像素格式等重要信息；对于音频可以拿到采样率、声道数、码率、PCM 数据格式等重要信息。

[AVCodecParameters](https://zhaohappy.github.io/libmedia/docs/libmedia_api/classes/avutil_struct_avcodecparameters.AVCodecParameters.html) 是用来创建解码器和编码器的必要数据结构。其中的数据当解封装时由 [demux](https://zhaohappy.github.io/libmedia/docs/libmedia_api/modules/avformat_demux.html) 模块写入，封装时由用户写入。

## AVPacket

[AVPacket](https://zhaohappy.github.io/libmedia/docs/libmedia_api/classes/avutil_struct_avpacket.AVPacket.html) 数据结构保存一帧编码后的媒体数据。可以拿到 [dts](https://zhaohappy.github.io/libmedia/docs/libmedia_api/classes/avutil_struct_avpacket.AVPacket.html#dts)(编码时间戳)、[pts](https://zhaohappy.github.io/libmedia/docs/libmedia_api/classes/avutil_struct_avpacket.AVPacket.html#pts)(显示时间戳)、[编码数据](https://zhaohappy.github.io/libmedia/docs/libmedia_api/classes/avutil_struct_avpacket.AVPacket.html#buf)、[时间基](https://zhaohappy.github.io/libmedia/docs/libmedia_api/classes/avutil_struct_avpacket.AVPacket.html#timebase)、所属的流 [streamIndex](https://zhaohappy.github.io/libmedia/docs/libmedia_api/classes/avutil_struct_avpacket.AVPacket.html#streamindex) 等信息。可以通过 [createAVPacket](https://zhaohappy.github.io/libmedia/docs/libmedia_api/functions/avutil_util_avpacket.createAVPacket.html) 方法创建，通过 [readAVPacket](https://zhaohappy.github.io/libmedia/docs/libmedia_api/functions/avformat_demux.readAVPacket.html) 写入数据或者自己组装得到；还可以从编码器的输出得到。[AVPacket](https://zhaohappy.github.io/libmedia/docs/libmedia_api/classes/avutil_struct_avpacket.AVPacket.html) 是解码器的输入编码器的输出。

## AVFrame

[AVFrame](https://zhaohappy.github.io/libmedia/docs/libmedia_api/classes/avutil_struct_avframe.AVFrame.html) 数据结构保存一帧编码前的媒体数据，对于视频是 YUV 像素数据，对于音频是 PCM 采样数据。可以通过 [createAVFrame](https://zhaohappy.github.io/libmedia/docs/libmedia_api/functions/avutil_util_avframe.createAVFrame.html) 方法创建然后自己组装得到；还可以从解码器的输出得到。[AVFrame](https://zhaohappy.github.io/libmedia/docs/libmedia_api/classes/avutil_struct_avframe.AVFrame.html) 结构比较复杂，想要更进一步的了解可以搜索介绍 FFmpeg 的 [AVFrame](https://zhaohappy.github.io/libmedia/docs/libmedia_api/classes/avutil_struct_avframe.AVFrame.html) 的文章学习。


