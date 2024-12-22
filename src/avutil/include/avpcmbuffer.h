#ifndef _LIBMEDIA_AVUTIL_AVPCMBUFFER_H_

#define _LIBMEDIA_AVUTIL_AVPCMBUFFER_H_

#include <stdint.h>
#include "wasmatomic.h"
#include "audiosample.h"

typedef struct AVPCMBuffer {
   /**
   * pcm 数据
   * 可同时存放多个 channel 数据
   */
  uint8_t** data;
  /**
   * data 每一个 channel 的缓冲区大小
   */
  int32_t linesize;
  /**
   * 当前存放了多少个采样点
   */
  int32_t nbSamples;
  /**
   * 当前 data 每个 channel 能存放的最大采样点数
   */
  int32_t maxnbSamples;
  /**
   * 声道数
   */
  int32_t channels;
  /**
   * 采样率
   */
  int32_t sampleRate;
  /**
   * pcm 格式
   */
  enum AVSampleFormat format;
  /**
   * pts
   */
  int64_t timestamp;
  /**
   * 时长
   */
  double duration;
} AVPCMBuffer;

typedef struct AVPCMBufferRef {
   /**
   * pcm 数据
   * 可同时存放多个 channel 数据
   */
  uint8_t** data;
  /**
   * data 每一个 channel 的缓冲区大小
   */
  int32_t linesize;
  /**
   * 当前存放了多少个采样点
   */
  int32_t nbSamples;
  /**
   * 当前 data 每个 channel 能存放的最大采样点数
   */
  int32_t maxnbSamples;
  /**
   * 声道数
   */
  int32_t channels;
  /**
   * 采样率
   */
  int32_t sampleRate;
  /**
   * pts
   */
  int64_t timestamp;
  /**
   * 时长
   */
  double duration;

  atomic_int32 ref_count;
} AVPCMBufferRef;

#endif