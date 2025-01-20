---
nav:
  title: 指南
  order: 2
group:
  title: 代码解读
  order: 2
order: 2
---

# 时间基

时间基是一个贯穿 libmedia 的基础概念，所以必须要掌握，时间基就是时间的单位。时间基的数据结构是 [Rational](https://zhaohappy.github.io/libmedia/docs/libmedia_api/classes/avutil_struct_rational.Rational.html) 它表示一个分数，其中 den 是分母，num 是分子。表示一个单位是秒的多少。举个例子，我们现在有一个时间戳 100，它在不同的时间基下表示的时间如下:

- ```{num: 1, den: 1000}``` 这个时间基表示一个单位是 1/1000 秒，也就是 1 毫秒，所以 100 是 100*1/1000 秒也就是 100 毫秒；flv 就是用的这个时间基。
- ```{num: 1, den: 90000}``` 这个时间基表示一个单位是 1/90000 秒，所以 100 是 100*1/90000 秒大约是 1.111 毫秒；ts 流就是用的这个时间基。
- ```{num: 666, den: 6666}``` 这个时间基表示一个单位是 666/6666 秒，所以 100 是 100*666/6666 秒大约是 9.991 毫秒；当然如此奇怪的时间基没有谁用它，这里只是举个例子。

## 不同地方的时间基

libmedia 在不同的地方都存有时间基数据，它们代表的意义各不相同。

- [AVStream](https://zhaohappy.github.io/libmedia/docs/libmedia_api/classes/avutil_AVStream.AVStream.html) 中的时间基是一个媒体的封装时间基，表示的是存放在媒体文件或者码流中的时间单位。解封装时由 [demux](https://zhaohappy.github.io/libmedia/docs/libmedia_api/modules/avformat_demux.html) 模块解析自动写入；封装时由用户写入作为后续的包写入文件的时间单位。是 [AVStream](https://zhaohappy.github.io/libmedia/docs/libmedia_api/classes/avutil_AVStream.AVStream.html) 下面的开始时间、时长等时间数据的单位。
- [AVPacket](https://zhaohappy.github.io/libmedia/docs/libmedia_api/classes/avutil_struct_avpacket.AVPacket.html) 中的时间基是当前这个 [AVPacket](https://zhaohappy.github.io/libmedia/docs/libmedia_api/classes/avutil_struct_avpacket.AVPacket.html) 中的 dts、pts、duration 的时间单位。如果 [AVPacket](https://zhaohappy.github.io/libmedia/docs/libmedia_api/classes/avutil_struct_avpacket.AVPacket.html) 通过 [readAVPacket](https://zhaohappy.github.io/libmedia/docs/libmedia_api/functions/avformat_demux.readAVPacket.html) 得到则时间基是 [AVStream](https://zhaohappy.github.io/libmedia/docs/libmedia_api/classes/avutil_AVStream.AVStream.html) 下面的时间基。
- [AVFrame](https://zhaohappy.github.io/libmedia/docs/libmedia_api/classes/avutil_struct_avframe.AVFrame.html) 中的时间基是当前这个 [AVFrame](https://zhaohappy.github.io/libmedia/docs/libmedia_api/classes/avutil_struct_avframe.AVFrame.html) 中的 pts、duration 的时间单位。当从解码器中得到则时间基是对应的 [AVPacket](https://zhaohappy.github.io/libmedia/docs/libmedia_api/classes/avutil_struct_avpacket.AVPacket.html) 的时间基。
- 编码器中的时间基是输出的 [AVPacket](https://zhaohappy.github.io/libmedia/docs/libmedia_api/classes/avutil_struct_avpacket.AVPacket.html) 中的时间基。创建编码器时需要传入一个时间基，代表着编码器编码之后输出的 [AVPacket](https://zhaohappy.github.io/libmedia/docs/libmedia_api/classes/avutil_struct_avpacket.AVPacket.html) 使用这个时间基。
- [VideoFrame](https://developer.mozilla.org/en-US/docs/Web/API/VideoFrame) 中的时间基在 Web 标准中是微秒，也就是```{num: 1, den: 1000000}```。如果你使用 [WebVideoDecoder](https://zhaohappy.github.io/libmedia/docs/libmedia_api/classes/avcodec_webcodec_VideoDecoder.WebVideoDecoder.html) 解码得到 [VideoFrame](https://developer.mozilla.org/en-US/docs/Web/API/VideoFrame) 不管输入的 AVPacket 是什么时间基，解码得到的 VideoFrame 统一转换成微秒时间基，这里和 web 标准保持一致。
- [AudioData](https://developer.mozilla.org/en-US/docs/Web/API/AudioData) 中的时间基在 Web 标准中是微秒，也就是```{num: 1, den: 1000000}```。如果你使用 [WebAudioDecoder](https://zhaohappy.github.io/libmedia/docs/libmedia_api/classes/avcodec_webcodec_AudioDecoder.WebAudioDecoder.html) 解码得到 [AudioData](https://developer.mozilla.org/en-US/docs/Web/API/AudioData) 则输出的单位天然是微秒时间基。对于 [AudioDecoder](https://developer.mozilla.org/en-US/docs/Web/API/AudioDecoder) 它不管输入的时间单位，统统会根据采样数重新计算。

## 时间基转换

libmedia 提供了 [avRescaleQ](https://zhaohappy.github.io/libmedia/docs/libmedia_api/functions/avutil_util_rational.avRescaleQ.html)、[avRescaleQ2](https://zhaohappy.github.io/libmedia/docs/libmedia_api/functions/avutil_util_rational.avRescaleQ2.html) 方法来做时间基转换，它可以将一个时间从一个时间基转到另一个时间基，在音视频开发中会经常用到。

```javascript
const sourceTimeBase = { num: 1, den: 90000 }
const targetTimeBase = { num: 1, den: 1000 }
const pts = avRescaleQ(100n, sourceTimeBase, targetTimeBase)
```

