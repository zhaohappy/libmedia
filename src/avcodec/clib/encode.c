#include "config.h"
#include "wasmenv.h"
#include "./logger/log.h"

#include <libavcodec/avcodec.h>

static AVCodecContext* enc_ctx;

int open_codec_context(AVCodecContext** enc_ctx, enum AVCodecID codec_id, AVCodecParameters* codecpar, AVRational* time_base, int thread_count) {

  int ret;

  AVCodec *enc = NULL;
  AVDictionary *opts = NULL;

  /* find decoder for the stream */
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

  if (wasm_pthread_support()) {
    if (codecpar->codec_type == AVMEDIA_TYPE_VIDEO) {
      // (*dec_ctx)->thread_type = FF_THREAD_SLICE;
      (*enc_ctx)->thread_count = thread_count;
    }
  }

  /* Init the encoders */
  if ((ret = avcodec_open2(*enc_ctx, enc, &opts)) < 0) {
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

  ret = avcodec_send_frame(enc_ctx, frame);

  if (ret < 0) {
    format_log(ERROR, "Error sending a frame for encoding, error: %d\n", ret);
    return ret;
  }

  return 0;
}

EM_PORT_API(int) encoder_open(AVCodecParameters* codecpar, AVRational* time_base, int thread_count) {
  return open_codec_context(&enc_ctx, codecpar->codec_id, codecpar, time_base, thread_count);
}

EM_PORT_API(void) encoder_set_flags(int flags) {
  if (enc_ctx) {
    enc_ctx->flags |= flags;
  }
}

EM_PORT_API(void) encoder_set_flags2(int flags) {
  if (enc_ctx) {
    enc_ctx->flags2 |= flags;
  }
}

EM_PORT_API(void) encoder_set_gop_size(int gop) {
  if (enc_ctx) {
    enc_ctx->gop_size = gop;
  }
}

EM_PORT_API(void) encoder_set_max_b_frame(int max) {
  if (enc_ctx) {
    enc_ctx->max_b_frames = max;
  }
}

EM_PORT_API(int) encoder_encode(AVFrame* frame) {
  return encode_frame(frame);
}

EM_PORT_API(int) encoder_flush(AVPacket* packet) {
  return encode_frame(NULL);
}

EM_PORT_API(int) encoder_receive(AVPacket* packet) {
  return receive_packet(packet);
}

EM_PORT_API(void) encoder_close() {
  if (enc_ctx) {
    avcodec_free_context(&enc_ctx);
    enc_ctx = NULL;
  }
}