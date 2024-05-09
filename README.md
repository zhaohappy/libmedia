
libmedia
======
中文 | [English](README_en.md)

![](https://img.shields.io/badge/language-typescript-blue.svg) [![](https://img.shields.io/badge/base-cheap-green.svg)](https://github.com/zhaohappy/cheap) ![](https://img.shields.io/badge/feature-thread-red.svg) ![license](https://img.shields.io/github/license/zhaohappy/libmedia)

### 介绍
 
libmedia 是一个用于在 Web 平台上处理多媒体内容（如音频、视频、字幕）的工具库。

### 库

- ```avformat``` 音视频封装解封装库（flv、mp4、mpegts、matroska、mp3）
- ```avcodec``` 音视频编解码库，主要是 C/C++(FFmpeg 和其他编解码项目) 编译的 Wasm 和 Web 平台标准 WebCodecs
- ```audioresample``` 音频重采样（FFmpeg 音频重采样模块编译）
- ```audiostretchpitch``` 音频变速、变调处理（soundtouch 编译）
- ```avnetwork``` Web 平台网络文件 IO 相关（Fetch、WebSocket、WebTransport、File）
- ```avprotocol``` 音视频协议（dash、m3u8）
- ```avrender``` 音视频渲染（8bit、10bit、HDR、audioWorklet、WebGL、WebGPU）
- ```avpipeline``` 媒体任务处理管线，用于多线程并行化处理任务

### 多线程

libmedia 支持多线程，但需要页面可以使用 SharedArrayBuffer，你可以通过在顶层文档的响应头上添加以下两个响应头:

- Cross-Origin-Opener-Policy: same-origin
- Cross-Origin-Embedder-Policy: require-corp

来开启使用 SharedArrayBuffer，若不支持多线程将回退到主线程上运行。


 ### 工具

- AVPlayer 是 libmedia 的音视频播放器实现，支持软解、硬解、MSE；支持多种封装协议、多种编码格式。[在线 demo](https://zhaohappy.github.io/libmedia/test/avplayer.html)


- AVTranscode 是 libmedia 的转码工具实现，目前还未实现

 ### 文档

 现在还没有

### 开发

若你想集成此项目来开发，建议将本仓库作为子模块，项目使用了 [cheap](https://github.com/zhaohappy/cheap) 库，需要你对 cheap 的使用有所了解。

当前本项目只支持使用 webpack 进行编译打包

下面介绍如何编译 AVPlayer 工具

```shell

# 克隆项目以及所有子模块
git clone https://github.com/zhaohappy/libmedia.git --recursive

# 进入 libmedia 目录
cd libmedia

# 安装依赖
npm install

# 编译 AVPlayer 开发版
npm run build-avplayer-dev

# 启动本地 http 服务
# 任何一个 http 服务都行，若报 edp 找不到，可以全局安装: npm install edp -g
edp webserver start --port=9000

# 浏览器访问 http://localhost:9000/test/avplayer.html

```

若要源码调试多线程 Worker 中的代码，设置 ```tsconfig.json``` 中```ENABLE_THREADS_SPLIT```宏为 ```true```并重新编译 AVPlayer

```json
{
  "cheap": {
    "defined": {
      "ENABLE_THREADS_SPLIT": true
    }
  }
}
```

```tsconfig.json``` 还可设置其他宏来裁剪编译，你可以根据自己的需要更改相关设置，详情看 ```tsconfig.json``` -> ```cheap``` -> ```defined``` 中的配置

 ### 示例

```test/avplayer.html``` 是 AVPlayer 的使用示例，也是在线 demo 的实现

```test/avtranscode.html``` 是一个转码示例，涉及到解封装和封装的用法

 ### 开源协议

 libmedia 使用 LGPL 开源协议，你需要遵守协议要求，详情查看 [LGPL](https://github.com/zhaohappy/libmedia/blob/master/COPYING.LGPLv3)

版权所有 (C) 2024-现在 赵高兴

Copyright (C) 2024-present, Gaoxing Zhao
