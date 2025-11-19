---
nav:
  title: Guide
  order: 2
group:
  title: Code Interpretation
  order: 2
order: 1
---

# Data Structure

If you want to use libmedia, you need to understand several important data structures. These data structures come from FFmpeg. If you understand the idea of ​​[cheap](https://github.com/zhaohappy/cheap), you will understand why libmedia needs to keep these data structures consistent with FFmpeg. If you have learned and mastered FFmpeg before, you can skip the following content.

## AVIFormatContext

[AVIFormatContext](https://zhaohappy.github.io/libmedia/docs/libmedia_api/interfaces/avformat_src.AVIFormatContext.html) is a demux context, which is a data structure used to save other associated structures, data, and context information for input data operations. It is created through [createAVIFormatContext](https://zhaohappy.github.io/libmedia/docs/libmedia_api/functions/avformat_src.createAVIFormatContext.html). In [AVIFormatContext](https://zhaohappy.github.io/libmedia/docs/libmedia_api/interfaces/avformat_src.AVIFormatContext.html), there is [streams](https://zhaohappy.github.io/libmedia/docs/libmedia_api/interfaces/avformat_src.AVIFormatContext.html#streams) data, which can get the stream information in the input data; [chapters](https://zhaohappy.github.io/libmedia/docs/libmedia_api/interfaces/avformat_src.AVIFormatContext.html#chapters) data, which can get the chapter information of the input data; [metadata](https://zhaohappy.github.io/libmedia/docs/libmedia_api/interfaces/avformat_src.AVIFormatContext.html#metadata) can get some metadata of the input data.

## AVOFormatContext

[AVOFormatContext](https://zhaohappy.github.io/libmedia/docs/libmedia_api/interfaces/avformat_src.AVOFormatContext.html) is an mux context, which is a data structure used to store other associated structures, data, and context information for output data operations. It is created through [createAVOFormatContext](https://zhaohappy.github.io/libmedia/docs/libmedia_api/functions/avformat_src_AVFormatContext.createAVOFormatContext.html). The data in [AVOFormatContext](https://zhaohappy.github.io/libmedia/docs/libmedia_api/interfaces/avformat_src.AVOFormatContext.html) is basically the same as that in [AVIFormatContext](https://zhaohappy.github.io/libmedia/docs/libmedia_api/interfaces/avformat_src.AVIFormatContext.html), the difference is that the data in [AVIFormatContext](https://zhaohappy.github.io/libmedia/docs/libmedia_api/interfaces/avformat_src.AVIFormatContext.html) is automatically written by the [demux](https://zhaohappy.github.io/libmedia/docs/libmedia_api/modules/avformat_src.demux.html) module, while the data in [AVOFormatContext](https://zhaohappy.github.io/libmedia/docs/libmedia_api/interfaces/avformat_src.AVOFormatContext.html) is written by the user.

## AVStream

The [AVStream](https://zhaohappy.github.io/libmedia/docs/libmedia_api/classes/avutil_src.AVStream.html) data structure stores the specific information of a media. Generally, a video file has a video [AVStream](https://zhaohappy.github.io/libmedia/docs/libmedia_api/classes/avutil_src.AVStream.html) and one or more audio [AVStream](https://zhaohappy.github.io/libmedia/docs/libmedia_api/classes/avutil_src.AVStream.html); some video formats may also have one or more subtitle [AVStream](https://zhaohappy.github.io/libmedia/docs/libmedia_api/classes/avutil_src.AVStream.html). [AVStream](https://zhaohappy.github.io/libmedia/docs/libmedia_api/classes/avutil_src.AVStream.html) stores important data such as media encoding information, start time, duration, media metadata, time base, etc.

## AVCodecParameters

The [AVCodecParameters](https://zhaohappy.github.io/libmedia/docs/libmedia_api/classes/avutil_src.AVCodecParameters.html) data structure stores the encoding information of the media and is a crucial data structure. You can get the encoding type through [codecId](https://zhaohappy.github.io/libmedia/docs/libmedia_api/classes/avutil_src.AVCodecParameters.html#codecid); you can get the encoded extradata through [extradata](https://zhaohappy.github.io/libmedia/docs/libmedia_api/classes/avutil_src.AVCodecParameters.html#extradata) (a data structure that is very important for creating a decoder. If you have used WebCodecs, you need to pass a [description](https://developer.mozilla.org/en-US/docs/Web/API/VideoDecoder/configure#description) data when creating a decoder. It is [extradata](https://zhaohappy.github.io/libmedia/docs/libmedia_api/classes/avutil_src.AVCodecParameters.html#extradata)). For video media, you can get important information such as video width and height, frame rate, bit rate, color space, pixel format, etc. For audio, you can get important information such as sampling rate, number of channels, bit rate, PCM data format, etc.

[AVCodecParameters](https://zhaohappy.github.io/libmedia/docs/libmedia_api/classes/avutil_src.AVCodecParameters.html) is a necessary data structure for creating decoders and encoders. The data in it is written by the [demux](https://zhaohappy.github.io/libmedia/docs/libmedia_api/modules/avformat_src.demux.html) module when decapsulating and by the user when encapsulating.

## AVPacket

The [AVPacket](https://zhaohappy.github.io/libmedia/docs/libmedia_api/classes/avutil_src.AVPacket.html) data structure stores a frame of encoded media data. You can get [dts](https://zhaohappy.github.io/libmedia/docs/libmedia_api/classes/avutil_src.AVPacket.html#dts)(decoding timestamp), [pts](https://zhaohappy.github.io/libmedia/docs/libmedia_api/classes/avutil_src.AVPacket.html#pts)(presentation timestamp), [encoded data](https://zhaohappy.github.io/libmedia/docs/libmedia_api/classes/avutil_src.AVPacket.html#buf), [time base](https://zhaohappy.github.io/libmedia/docs/libmedia_api/classes/avutil_src.AVPacket.html#timebase), and the stream to which it belongs. [streamIndex](https://zhaohappy.github.io/libmedia/docs/libmedia_api/classes/avutil_src.AVPacket.html#streamindex) and other information. It can be created by the [createAVPacket](https://zhaohappy.github.io/libmedia/docs/libmedia_api/functions/avutil_src.createAVPacket.html) method, written by [readAVPacket](https://zhaohappy.github.io/libmedia/docs/libmedia_api/functions/avformat_src.demux.readAVPacket.html) or assembled by yourself; it can also be obtained from the output of the encoder. [AVPacket](https://zhaohappy.github.io/libmedia/docs/libmedia_api/classes/avutil_src.AVPacket.html) is the input of the decoder and the output of the encoder.

## AVFrame

The [AVFrame](https://zhaohappy.github.io/libmedia/docs/libmedia_api/classes/avutil_src.AVFrame.html) data structure stores a frame of media data before encoding. For video, it is YUV pixel data, and for audio, it is PCM sample data. You can create it through the [createAVFrame](https://zhaohappy.github.io/libmedia/docs/libmedia_api/functions/avutil_src.createAVFrame.html) method and assemble it yourself; you can also get it from the output of the decoder. The [AVFrame](https://zhaohappy.github.io/libmedia/docs/libmedia_api/classes/avutil_src.AVFrame.html) structure is relatively complex. If you want to learn more about it, you can search for the article [AVFrame](https://zhaohappy.github.io/libmedia/docs/libmedia_api/classes/avutil_src.AVFrame.html) that introduces FFmpeg.
