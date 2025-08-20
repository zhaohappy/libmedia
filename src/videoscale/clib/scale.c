/*
 * libmedia video scale
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

#include <libavutil/imgutils.h>
#include <libavutil/frame.h>
#include <libavutil/opt.h>
#include <libswscale/swscale.h>

#include "wasmenv.h"

int src_width;
int src_height;
int src_pix_fmt;
int src_range = AVCOL_RANGE_UNSPECIFIED;
int src_color_space = AVCOL_SPC_UNSPECIFIED;

int out_width;
int out_height;
int out_pix_fmt;
int out_range = AVCOL_RANGE_UNSPECIFIED;
int out_color_space = AVCOL_SPC_UNSPECIFIED;

struct SwsContext *sws_ctx;

EM_PORT_API(int) scale_set_input_parameters(int width, int height, int pix_fmt) {

  src_width = width;
  src_height = height;
  src_pix_fmt = pix_fmt;

  return  0;
}

EM_PORT_API(int) scale_set_input_color(int space, int range) {

  src_range = range;
  src_color_space = space;

  return  0;
}

EM_PORT_API(int) scale_set_output_parameters(int width, int height, int pix_fmt) {

  out_width = width;
  out_height = height;
  out_pix_fmt = pix_fmt;

  return  0;
}

EM_PORT_API(int) scale_set_output_color(int space, int range) {

  out_range = range;
  out_color_space = space;

  return  0;
}

EM_PORT_API(int) scale_init(int flags, int thread_count) {

  sws_ctx = sws_alloc_context();

  if (!sws_ctx) {
    return -1;
  }

  av_opt_set_int(sws_ctx, "srcw", src_width, 0);
  av_opt_set_int(sws_ctx, "srch", src_height, 0);
  av_opt_set_int(sws_ctx, "src_format", src_pix_fmt, 0);
  av_opt_set_int(sws_ctx, "dstw", out_width, 0);
  av_opt_set_int(sws_ctx, "dsth", out_height, 0);
  av_opt_set_int(sws_ctx, "dst_format", out_pix_fmt, 0);

  if (src_range != AVCOL_RANGE_UNSPECIFIED) {
    av_opt_set_int(sws_ctx, "src_range", src_range == AVCOL_RANGE_JPEG, 0);
  }
  if (out_range != AVCOL_RANGE_UNSPECIFIED) {
    av_opt_set_int(sws_ctx, "dst_range", out_range == AVCOL_RANGE_JPEG, 0);
  }

  if (thread_count > 1) {
    av_opt_set_int(sws_ctx, "threads", thread_count, 0);
  }

  if (sws_init_context(sws_ctx, NULL, NULL) < 0) {
    sws_freeContext(sws_ctx);
    return -1;
  }

  if (src_color_space != AVCOL_SPC_UNSPECIFIED || out_color_space != AVCOL_SPC_UNSPECIFIED) {
    int in_full, out_full, brightness, contrast, saturation;
    const int *inv_table, *table;

    sws_getColorspaceDetails(sws_ctx, (int **)&inv_table, &in_full,
      (int **)&table, &out_full,
      &brightness, &contrast, &saturation);

    if (src_color_space != AVCOL_SPC_UNSPECIFIED) {
      inv_table = sws_getCoefficients(src_color_space);
    }
    if (out_color_space != AVCOL_SPC_UNSPECIFIED) {
      table = sws_getCoefficients(out_color_space);
    }
    else if (src_color_space != AVCOL_SPC_UNSPECIFIED) {
      table = inv_table;
    }

    sws_setColorspaceDetails(sws_ctx, inv_table, in_full,
      table, out_full,
      brightness, contrast, saturation);
  }

  return  0;
}

EM_PORT_API(int) scale_process(AVFrame* src, AVFrame* dst) {
  int ret;
  if (!dst->linesize[0]) {
    dst->width = out_width;
    dst->height = out_height;
    dst->format = out_pix_fmt;
    ret = av_frame_get_buffer(dst, 1);
    if (ret < 0) {
      return ret;
    }
  }
  
  sws_scale(sws_ctx, (const uint8_t * const*)src->data, src->linesize, 0, src_height, dst->data, dst->linesize);

  return 0;
}

EM_PORT_API(int) scale_destroy() {
  sws_freeContext(sws_ctx);
}
