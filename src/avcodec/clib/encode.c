#include "config.h"
#include "wasmenv.h"
#include "./logger/log.h"
#include <wasmatomic.h>

#include <libavcodec/avcodec.h>
#include <libavutil/opt.h>

#if MEDIA_TYPE_AUDIO
#include <libavutil/channel_layout.h>
#endif

static AVCodecContext* enc_ctx;
int enc_ctx_max_b_frames = -1;
int enc_ctx_flags = 0;
int enc_ctx_flags2 = 0;

struct AVBuffer {
  uint8_t *data; /**< data described by this buffer */
  size_t size; /**< size of data in bytes */

  /**
   *  number of existing AVBufferRef instances referring to this buffer
   */
  atomic_uint refcount;

  /**
   * a callback for freeing the data
   */
  void (*free)(void *opaque, uint8_t *data);

  /**
   * an opaque pointer, to be used by the freeing callback
   */
  void *opaque;

  /**
   * A combination of AV_BUFFER_FLAG_*
   */
  int flags;

  /**
   * A combination of BUFFER_FLAG_*
   */
  int flags_internal;
};

int open_codec_context(AVCodecContext** enc_ctx, enum AVCodecID codec_id, AVCodecParameters* codecpar, AVRational* time_base, int thread_count, AVDictionary** opts) {

  int ret;

  AVCodec *enc = NULL;

  /* find encoder for the stream */
  enc = avcodec_find_encoder(codec_id);
  if (!enc) {
    format_log(ERROR ,"Failed to find %s codec\n", avcodec_get_name(codec_id));
    return AVERROR(EINVAL);
  }

  /* Allocate a codec context for the decoder */
  *enc_ctx = avcodec_alloc_context3(enc);
  if (!*enc_ctx) {
    format_log(ERROR, "Failed to allocate the %s codec context\n", avcodec_get_name(codec_id));
    return AVERROR(ENOMEM);
  }

  /* Copy codec parameters from input stream to output codec context */
  if ((ret = avcodec_parameters_to_context(*enc_ctx, codecpar)) < 0) {
    format_log(ERROR, "Failed to copy %s codec parameters to decoder context\n", avcodec_get_name(codec_id));
    return ret;
  }

  (*enc_ctx)->time_base = *time_base;
  (*enc_ctx)->flags = enc_ctx_flags;
  (*enc_ctx)->flags2 = enc_ctx_flags2;
  (*enc_ctx)->strict_std_compliance = -2;

  if (enc_ctx_max_b_frames > -1) {
    (*enc_ctx)->max_b_frames = enc_ctx_max_b_frames;
  }

  #if MEDIA_TYPE_VIDEO
  if (wasm_pthread_support()) {
    if (codecpar->codec_type == AVMEDIA_TYPE_VIDEO) {
      (*enc_ctx)->thread_type = FF_THREAD_SLICE;
      (*enc_ctx)->thread_count = thread_count;
    }
  }
  #endif

  #if MEDIA_TYPE_AUDIO
  if (codecpar->codec_type == AVMEDIA_TYPE_AUDIO) {
    if (codecpar->ch_layout.u.mask == 0) {
      av_channel_layout_default(&(*enc_ctx)->ch_layout, (*enc_ctx)->ch_layout.nb_channels);
    }
  }
  #endif

  /* Init the encoders */
  if ((ret = avcodec_open2(*enc_ctx, enc, opts)) < 0) {
    format_log(ERROR, "Failed to open %s codec\n", avcodec_get_name(codec_id));
    return ret;
  }

  return 0;
}

int receive_packet(const AVPacket* packet) {
  int ret;

  ret = avcodec_receive_packet(enc_ctx, packet);

  if (ret == AVERROR(EAGAIN) || ret == AVERROR_EOF) {
    return 0;
  }

  else if (ret < 0) {
    format_log(ERROR, "Error during encoding, error: %d\n", ret);
    return ret;
  }

  return 1;
}

int encode_frame(const AVFrame* frame) {
  int ret;
  int i;

  if (frame) {
    for (i = 0; i < AV_NUM_DATA_POINTERS; i++) {
      if (frame->buf[i] != NULL) {
        if (frame->buf[i]->buffer->free == NULL) {
          frame->buf[i]->buffer->free = av_buffer_default_free;
        }
      }
    }
    if (frame->nb_extended_buf > 0) {
      for (i = 0; i < frame->nb_extended_buf; i++) {
        if (frame->extended_buf[i]->buffer->free == NULL) {
          frame->extended_buf[i]->buffer->free = av_buffer_default_free;
        }
      }
    }
  }

  ret = avcodec_send_frame(enc_ctx, frame);

  if (ret < 0) {
    format_log(ERROR, "Error sending a frame for encoding, error: %d\n", ret);
    return ret;
  }

  return 0;
}

EM_PORT_API(int) encoder_open(AVCodecParameters* codecpar, AVRational* time_base, int thread_count, AVDictionary** opts) {
  return open_codec_context(&enc_ctx, codecpar->codec_id, codecpar, time_base, thread_count, opts);
}

EM_PORT_API(void) encoder_set_flags(int flags) {
  enc_ctx_flags = flags;
}

EM_PORT_API(void) encoder_set_flags2(int flags) {
  enc_ctx_flags2 = flags;
}

EM_PORT_API(void) encoder_set_gop_size(int gop) {
  if (enc_ctx) {
    enc_ctx->gop_size = gop;
  }
}

#if MEDIA_TYPE_VIDEO 
EM_PORT_API(void) encoder_set_max_b_frame(int max) {
  enc_ctx_max_b_frames = max;
}
#endif

EM_PORT_API(int) encoder_encode(AVFrame* frame) {
  return encode_frame(frame);
}

EM_PORT_API(int) encoder_flush() {
  return encode_frame(NULL);
}

EM_PORT_API(int) encoder_receive(AVPacket* packet) {
  return receive_packet(packet);
}

EM_PORT_API(uint8_t*) encoder_get_extradata() {
  if (enc_ctx) {
    return enc_ctx->extradata;
  }
  return NULL;
}

EM_PORT_API(int) encoder_get_extradata_size() {
  if (enc_ctx) {
    return enc_ctx->extradata_size;
  }
  return 0;
}


#if MEDIA_TYPE_AUDIO
EM_PORT_API(int) encoder_get_framesize_size() {
  if (enc_ctx) {
    return enc_ctx->frame_size;
  }
  return 0;
}
#endif

#if MEDIA_TYPE_VIDEO 
EM_PORT_API(int) encoder_get_color_space() {
  if (enc_ctx) {
    return enc_ctx->colorspace;
  }
  return 0;
}

EM_PORT_API(int) encoder_get_color_primaries() {
  if (enc_ctx) {
    return enc_ctx->color_primaries;
  }
  return 0;
}

EM_PORT_API(int) encoder_get_color_trc() {
  if (enc_ctx) {
    return enc_ctx->color_trc;
  }
  return 0;
}
#endif

EM_PORT_API(void) encoder_close() {
  if (enc_ctx) {
    avcodec_free_context(&enc_ctx);
    enc_ctx = NULL;
  }
}