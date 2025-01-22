/*
 * libmedia stats struct defined
 *
 * 版权所有 (C) 2024 赵高兴
 * Copyright (C) 2024 Gaoxing Zhao
 *
 * 此文件是 libmedia 的一部分
 * This file is part of libmedia.
 * 
 * libmedia 是自由软件；您可以根据 GNU Lesser General Public License（GNU LGPL）3.1
 * 或任何其更新的版本条款重新分发或修改它
 * libmedia is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; either
 * version 3.1 of the License, or (at your option) any later version.
 * 
 * libmedia 希望能够为您提供帮助，但不提供任何明示或暗示的担保，包括但不限于适销性或特定用途的保证
 * 您应自行承担使用 libmedia 的风险，并且需要遵守 GNU Lesser General Public License 中的条款和条件。
 * libmedia is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * Lesser General Public License for more details.
 *
 */

@struct
export class JitterBuffer {
  min: int32
  max: int32
}

@struct
export default class Stats {
  /**
   * 音频通道数
   */
  channels: int32
  /**
   * 音频采样率
   */
  sampleRate: int32
  /**
   * 音频帧大小
   */
  audioFrameSize: int32
  /**
   * 音频包总字节数
   */
  audioPacketBytes: int64
  /**
   * 音频包总数
   */
  audioPacketCount: int64
  /**
   * 当前音频包队列长度
   */
  audioPacketQueueLength: int32
  /**
   * 音频包丢弃总数
   */
  audioDropPacketCount: int64
  /**
   * 音频解码错误包总数
   */
  audioDecodeErrorPacketCount: int32
  /**
   * 音频编码错误帧总数
   */
  audioEncodeErrorFrameCount: int32
  /**
   * 音频解码帧总数
   */
  audioFrameDecodeCount: int64
  /**
   * 音频编码包总数
   */
  audioPacketEncodeCount: int64
  /**
   * 音频渲染帧总数
   */
  audioFrameRenderCount: int64
  /**
   * 音频帧丢弃总数
   */
  audioFrameDropCount: int32
  /**
   * 视频宽度
   */
  width: int32
  /**
   * 视频高度
   */
  height: int32
  /**
   * 视频关键帧间隔
   */
  keyFrameInterval: int32
  /**
   * 视频 gop 长度
   */
  gop: int32
  /**
   * 视频包总字节数
   */
  videoPacketBytes: int64
  /**
   * 视频包总数
   */
  videoPacketCount: int64
  /**
   * 当前视频包队列总数
   */
  videoPacketQueueLength: int32
  /**
   * 视频包丢弃总数
   */
  videoDropPacketCount: int64
  /**
   * 视频包解码错误总数
   */
  videoDecodeErrorPacketCount: int32
  /**
   * 视频编码错误帧总数
   */
  videoEncodeErrorFrameCount: int32
  /**
   * 视频解码帧总数
   */
  videoFrameDecodeCount: int64
  /**
   * 视频编码包总数
   */
  videoPacketEncodeCount: int64
  /**
   * 视频渲染帧总数
   */
  videoFrameRenderCount: int64
  /**
   * 视频帧丢弃总数（解码未渲染）
   */
  videoFrameDropCount: int32
  /**
   * 视频关键帧总数
   */
  keyFrameCount: int64

  /**
   * buffer 丢弃总字节数
   */
  bufferDropBytes: int64
  /**
   * buffer 接收总字节数
   */
  bufferReceiveBytes: int64
  /**
   * buffer 发送总字节数
   */
  bufferSendBytes: int64
  /**
   * buffer 总输出字节数
   * 
   */
  bufferOutputBytes: int64
  /**
   * 音频码率
   */
  audioBitrate: int32
  /**
   * 视频码率
   */
  videoBitrate: int32
  /**
   * 视频解码帧率
   */
  videoDecodeFramerate: int32
  /**
   * 视频渲染帧率
   */
  videoRenderFramerate: int32
  /**
   * 视频编码帧率（根据 dts 计算）
   */
  videoEncodeFramerate: int32
  /**
   * 音频解码帧率
   */
  audioDecodeFramerate: int32
  /**
   * 音频渲染帧率
   */
  audioRenderFramerate: int32
  /**
   * 音视频编码帧率（根据 dts 计算）
   */
  audioEncodeFramerate: int32

  /**
   * 音频最大解码帧间隔（毫秒）
   */
  audioFrameDecodeIntervalMax: int32
  /**
   * 音频最大渲染帧间隔（毫秒）
   */
  audioFrameRenderIntervalMax: int32
  /**
   * 视频最大解码帧间隔（毫秒）
   */
  videoFrameDecodeIntervalMax: int32
  /**
   * 视频最大渲染帧间隔（毫秒）
   */
  videoFrameRenderIntervalMax: int32
  /**
   * 接收带宽
   */
  bandwidth: int32
  /**
   * 抖动指标
   */
  jitter: double

  /**
   * jitter buffer
   */
  jitterBuffer: JitterBuffer

  /**
   * 音频卡顿次数
   */
  audioStutter: int32
  /**
   * 视频卡顿次数
   */
  videoStutter: int32

  /**
   * 音频 codec string
   */
  audiocodec: string
  /**
   * 视频 codec string
   */
  videocodec: string

  /**
   * 首个 audio mux dts
   */
  firstAudioMuxDts: int64
  /**
   * 上一次 audio mux dts
   */
  lastAudioMuxDts: int64

  /**
   * 首个 audio mux dts
   */
  firstVideoMuxDts: int64
  /**
   * 上一次 video mux dts
   */
  lastVideoMuxDts: int64
  /**
   * 当前音频播放时间戳
   */
  audioCurrentTime: int64
  /**
   * 当前视频播放时间戳
   */
  videoCurrentTime: int64
  /**
   * 下一个音频帧播放时间戳
   */
  audioNextTime: int64
  /**
   * 下一个视频帧播放时间戳
   */
  videoNextTime: int64
}
