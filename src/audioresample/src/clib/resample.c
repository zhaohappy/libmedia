/*
 * libmedia audio resampler
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

#include <libavutil/opt.h>
#include <libavutil/channel_layout.h>
#include <libavutil/samplefmt.h>
#include <libswresample/swresample.h>

#include "wasmenv.h"

AVChannelLayout* src_ch_layout;
AVChannelLayout* dst_ch_layout;
int src_samplerate = 0;
int dst_samplerate = 0;
int src_nb_channels = 0;
int dst_nb_channels = 0;
enum AVSampleFormat src_sample_fmt;
enum AVSampleFormat dst_sample_fmt;

int first_input = 1;

struct PCMBuffer {
  uint8_t **data;
  int linesize;
  int nbSamples;
  int maxnbSamples;
  int channels;
  int sampleRate;
  enum AVSampleFormat format;
  int64_t timestamp;
  double duration;
};

struct SwrContext *swr_ctx;

EM_PORT_API(int) resample_init() {
  swr_ctx = swr_alloc();
  if (!swr_ctx) {
    return -1;      
  }

  av_opt_set_int(swr_ctx, "in_sample_rate",       src_samplerate, 0);
  av_opt_set_sample_fmt(swr_ctx, "in_sample_fmt", src_sample_fmt, 0);

  if (!src_ch_layout && src_nb_channels) {
    AVChannelLayout ch_layout;
    av_channel_layout_default(&ch_layout, src_nb_channels);
    av_opt_set_chlayout(swr_ctx, "in_chlayout",    &ch_layout, 0);
  }
  else {
    av_opt_set_chlayout(swr_ctx, "in_chlayout",    src_ch_layout, 0);
  }

  av_opt_set_int(swr_ctx, "out_sample_rate",       dst_samplerate, 0);
  av_opt_set_sample_fmt(swr_ctx, "out_sample_fmt", dst_sample_fmt, 0);
  
  if (!dst_ch_layout && dst_nb_channels) {
    AVChannelLayout ch_layout;
    av_channel_layout_default(&ch_layout, dst_nb_channels);
    av_opt_set_chlayout(swr_ctx, "out_chlayout",    &ch_layout, 0);
  }
  else {
    av_opt_set_chlayout(swr_ctx, "out_chlayout",    dst_ch_layout, 0);
  }

  if (swr_init(swr_ctx) < 0) {
    return -2;
  }

  first_input = 1;

  return  0;
}

EM_PORT_API(int) resample_set_input_parameters(int samplerate, int nb_channels, enum AVSampleFormat format, AVChannelLayout* ch_layout) {
  src_samplerate = samplerate;
  src_nb_channels = nb_channels;
  src_sample_fmt = format;

  if (ch_layout) {
    src_ch_layout = ch_layout;
  }

  return  0;
}

EM_PORT_API(int) resample_set_output_parameters(int samplerate, int nb_channels, enum AVSampleFormat format, AVChannelLayout* ch_layout) {
  dst_samplerate = samplerate;
  dst_nb_channels = nb_channels;
  dst_sample_fmt = format;

  if (ch_layout) {
    dst_ch_layout = ch_layout;
  }

  return  0;
}

EM_PORT_API(int) resample_process(uint8_t **input, struct PCMBuffer* output, int nb_samples) {

  if (!output) {
    return -1;
  }

  int dst_nb_samples = av_rescale_rnd((first_input ? 0 : swr_get_delay(swr_ctx, src_samplerate)) +
                                        nb_samples, dst_samplerate, src_samplerate, AV_ROUND_UP);
  
  first_input = 0;

  int ret;
  if (output->maxnbSamples < dst_nb_samples) {
    if (output->data) {
      av_freep(&output->data[0]);
      av_freep(&output->data);
    }
    ret = av_samples_alloc_array_and_samples(&output->data, &output->linesize, dst_nb_channels,
                            dst_nb_samples, dst_sample_fmt, 0);
    if (ret < 0) {
      return ret;
    }
    output->maxnbSamples = dst_nb_samples;
  }
  ret = swr_convert(swr_ctx, output->data, output->maxnbSamples, input, nb_samples);

  if (ret < 0) {
    return ret;
  }

  output->channels = dst_nb_channels;
  output->sampleRate = dst_samplerate;
  output->nbSamples = ret;
  output->format = dst_sample_fmt;

  return 0;
}

EM_PORT_API(int) resample_nb_sample(int nb_samples) {
  int dst_nb_samples = av_rescale_rnd((first_input ? 0 : swr_get_delay(swr_ctx, src_samplerate)) +
                                        nb_samples, dst_samplerate, src_samplerate, AV_ROUND_UP);
  return dst_nb_samples;
}

EM_PORT_API(int) resample_destroy() {
  swr_free(&swr_ctx);
}

