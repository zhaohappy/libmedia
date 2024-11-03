/*
 * libmedia rtmp
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

/**
 * maximum possible number of different RTMP channels
 */
export const RTMP_CHANNELS = 65599

export const APP_MAX_LENGTH = 1024

export const TCURL_MAX_LENGTH = 1024

export const FLASHVER_MAX_LENGTH = 64

export const RTMP_PKTDATA_DEFAULT_SIZE = 4096

export const RTMP_HEADER = 11

/**
 * channels used to for RTMP packets with different purposes (i.e. data, network
 * control, remote procedure calls, etc.)
 */
export const enum RtmpChannel {
  /**
   * channel for network-related messages (bandwidth report, ping, etc)
   */
  NETWORK_CHANNEL = 2,
  /**
   * channel for sending server control messages
   */
  SYSTEM_CHANNEL,
  /**
   * channel for audio data
   */
  AUDIO_CHANNEL,
  /**
   * channel for video data
   */
  VIDEO_CHANNEL   = 6,
  /**
   * channel for a/v invokes
   */
  SOURCE_CHANNEL  = 8,
}

/**
 * known RTMP packet types
 */
export const enum RtmpPacketType {
  /**
   * chunk size change
   */
  PT_CHUNK_SIZE = 1,
  /**
   * number of bytes read
   */
  PT_BYTES_READ = 3,
  /**
   * user control
   */
  PT_USER_CONTROL,
  /**
   * window acknowledgement size
   */
  PT_WINDOW_ACK_SIZE,
  /**
   * peer bandwidth
   */
  PT_SET_PEER_BW,
  /**
   * audio packet
   */
  PT_AUDIO = 8,
  /**
   * video packet
   */
  PT_VIDEO,
  /**
   * Flex shared stream
   */
  PT_FLEX_STREAM = 15,
  /**
   * Flex shared object
   */
  PT_FLEX_OBJECT,
  /**
   * Flex shared message
   */
  PT_FLEX_MESSAGE,
  /**
   * some notification
   */
  PT_NOTIFY,
  /**
   * shared object
   */
  PT_SHARED_OBJ,
  /**
   * invoke some stream action
   */
  PT_INVOKE,
  /**
   * FLV metadata
   */
  PT_METADATA = 22
}

/**
 * possible RTMP packet header sizes
 */
export const enum RtmpPacketHeaderSize {
  /**
   * packet has 12-byte header
   */
  PS_TWELVE_BYTES = 0,
  /**
   * packet has 8-byte header
   */
  PS_EIGHT_BYTES,
  /**
   * packet has 4-byte header
   */
  PS_FOUR_BYTES,
  /**
   * packet is really a next chunk of a packet
   */
  PS_ONE_BYTE
}
