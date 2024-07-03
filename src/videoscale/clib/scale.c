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
#include <libswscale/swscale.h>

#include "wasmenv.h"

int src_width;
int src_height;
int src_pix_fmt;

int out_width;
int out_height;
int out_pix_fmt;

struct SwsContext *sws_ctx;

EM_PORT_API(int) scale_set_input_parameters(int width, int height, int pix_fmt) {

  src_width = width;
  src_height = height;
  src_pix_fmt = pix_fmt;

  return  0;
}

EM_PORT_API(int) scale_set_output_parameters(int width, int height, int pix_fmt) {

  out_width = width;
  out_height = height;
  out_pix_fmt = pix_fmt;

  return  0;
}

EM_PORT_API(int) scale_init(int flags) {
  sws_ctx = sws_getContext(src_width, src_height, src_pix_fmt,
    out_width, out_height, out_pix_fmt,
    flags, NULL, NULL, NULL);
  
  if (!sws_ctx) {
    return -1;      
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
