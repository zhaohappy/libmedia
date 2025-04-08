---
nav: 指南
order: 1
group:
  title: 开始
  order: 1
---

# 介绍

libmedia 是一个用于在 Web 平台上处理多媒体内容（如音频、视频、字幕）的工具库。

libmedia 有 TypeScript 模块和 WebAssembly 模块，并且设计理念上以 TypeScript 模块为主导；我们将音视频的封装解封装层放在 TypeScript 模块实现，这样就能使用异步 IO 来处理各种来源的流，可以让整个系统在非 SharedArrayBuffer 和非 Worker 环境上运行。

解码编码模块放入 WebAssembly 模块中，这些模块可以从 FFmpeg 的 libavcodec 模块中编译而来，并且将每种解码器和编码器编译成单独的 wasm 模块，解决编译产物太大的问题，使用的时候只需要去加载要使用的模块。同时编解码模块可以使用 WebCodecs。

libmedia 的 API 设计上参照 FFmpeg 设计，很多数据结构概念都是一致的，所以你能看见诸如 ```AVStream```、```AVCodecParameters```、```AVFormatContext```、```AVPacket```、```AVFrame``` 等数据结构。FFmpeg 作为音视频行业事实上的标准，其设计是非常优秀的；照着设计直接得到优秀的设计模式，还减少开发者学习理解的难度，毕竟做音视频开发的多少都对 FFmpeg 学习过；当然最主要的原因是我们需要让这些数据可以在 TypeScript 模块和 WebAssembly 模块中都可以进行读写操作，其在内存上的布局和 FFmpeg 保持一致是前提。

libmedia 是设计在多线程上的，只是可以回退到单线程上运行；所以对多线程开发比较亲和；开发者可以很优雅的基于此做多线程的开发，毕竟在音视频领域使用多线程带来的体验绝对要高出很多。

## 优势

- 跨平台兼容：支持主流浏览器、移动端、Electron、Node 等环境；
- 降低成本：几乎所有计算运行在客户端，大大降低服务器成本；
- 隐私安全：用户的数据在本地读取，无需上传到服务器；
- 性能强大：设计在多线程上并且没有数据拷贝开销，与 Wasm 模块互操作开销可忽略不计；支持 Webcodecs 使用硬件编解码器；
- 可扩展性：提供低级的 API，可以应对各种使用场景，可以基于这些低级 API 实现更加复杂的业务逻辑；
- 支持多种媒体格式：支持 mp4、mov、mpegts、flv、matroska、webm、mp3、ogg、flac、aac、wav 封装格式；
- 完善的编解码器支持：支持视频编码格式 H265、H264、H266、VP9、VP8、AV1 和音频编码格式 AAC、MP3、FLAC、SPEEX、G711、OPUS；
- 丰富的音视频协议支持：支持 hls、dash、rtmp、rtsp 协议；
- 开箱即用的强大工具：内部实现了播放器和转码器可快速集成使用；

## 赞助作者

如果该项目对你有帮助，可以扫描二维码赞助作者:

<img src="../../public/img/alipay-qcode.png" width="200" alt="alipay" />
<img src="../../public/img/wechat-qcode.png" width="200" alt="wechat-pay" />

加微信 ```zhaohappy_``` 备注 libmedia 加作者微信，后面人数到达一定数量之后会拉群交流。