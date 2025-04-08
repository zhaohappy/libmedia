---
nav: 体验
order: 6
group:
  order: 0
---

# 视频渲染

## wasm 解码渲染

点击 ```开始``` 开始执行播放视频操作，点击 ```停止``` 结束播放。点击 ```开始``` 之前可以选择本地文件。没有选择文件会使用测试文件。

代码会加载解码器，解码器托管在 github 上，请耐心等待。

<code src="./video-render-avframe.tsx"></code>

## WebCodecs 解码渲染

点击 ```开始``` 开始执行播放视频操作，点击 ```停止``` 结束播放。点击 ```开始``` 之前可以选择本地文件。没有选择文件会使用测试文件。

<code src="./video-render-videoframe.tsx"></code>