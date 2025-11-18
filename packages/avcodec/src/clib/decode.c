#include "config.h"
#include "wasmenv.h"
#include "./logger/log.h"
#include <wasmatomic.h>

#include <libavcodec/avcodec.h>
#include <libavutil/frame.h>
#include <libavutil/buffer.h>
#include <libavutil/rational.h>

#include <wasmpthread.h>

static AVCodecContext* dec_ctx;

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

int open_codec_context(AVCodecContext** dec_ctx, enum AVCodecID codec_id, AVCodecParameters* codecpar, AVRational* time_base, int thread_count, AVDictionary** opts) {

  int ret;

  AVCodec *dec = NULL;

  /* find decoder for the stream */
  dec = avcodec_find_decoder(codec_id);
  if (!dec) {
    format_log(ERROR, "Failed to find %s codec\n", avcodec_get_name(codec_id));
    return AVERROR(EINVAL);
  }

  /* Allocate a codec context for the decoder */
  *dec_ctx = avcodec_alloc_context3(dec);
  if (!*dec_ctx) {
    format_log(ERROR, "Failed to allocate the %s codec context\n", avcodec_get_name(codec_id));
    return AVERROR(ENOMEM);
  }

  /* Copy codec parameters from input stream to output codec context */
  if ((ret = avcodec_parameters_to_context(*dec_ctx, codecpar)) < 0) {
    format_log(ERROR, "Failed to copy %s codec parameters to decoder context\n", avcodec_get_name(codec_id));
    return ret;
  }
  if (time_base) {
    (*dec_ctx)->pkt_timebase = *time_base;
  }
  (*dec_ctx)->flags2 |= AV_CODEC_FLAG2_SHOW_ALL;

  if (wasm_pthread_support()) {
    if (codecpar->codec_type == AVMEDIA_TYPE_VIDEO) {
      // (*dec_ctx)->thread_type = FF_THREAD_SLICE;
      (*dec_ctx)->thread_count = thread_count;
    }
  }
  else {
    (*dec_ctx)->thread_count = 1;
  }

  (*dec_ctx)->strict_std_compliance = FF_COMPLIANCE_EXPERIMENTAL;

  /* Init the decoders */
  if ((ret = avcodec_open2(*dec_ctx, dec, opts)) < 0) {
    format_log(ERROR, "Failed to open %s codec\n", avcodec_get_name(codec_id));
    return ret;
  }

  return 0;
}

int receive_frame(const AVFrame* frame) {
  // get all the available frames from the decoder
  int ret = 0;

  ret = avcodec_receive_frame(dec_ctx, frame);

  if (ret < 0) {

    if (ret == AVERROR_EOF) {
      avcodec_flush_buffers(dec_ctx);
    }
    // those two return values are special and mean there is no output
    // frame available, but there were no errors during decoding
    if (ret == AVERROR_EOF || ret == AVERROR(EAGAIN)) {
      return 0;
    }

    format_log(ERROR, "Error during decoding (%s)\n", av_err2str(ret));

    return ret;
  }

  return 1;
}


int decode_packet(const AVPacket* packet) {
  int ret;
  // submit the packet to the decoder
  ret = avcodec_send_packet(dec_ctx, packet);

  if (ret < 0) {
    format_log(ERROR, "Error submitting a packet for decoding (%s)\n", av_err2str(ret));
    return ret;
  }
  return 0;
}

EM_PORT_API(int) decoder_open(AVCodecParameters* codecpar, AVRational* time_base, int thread_count, AVDictionary** opts) {
  // setLogLevel(DEBUG);
  return open_codec_context(&dec_ctx, codecpar->codec_id, codecpar, time_base, thread_count, opts);
}

EM_PORT_API(int) decoder_decode(AVPacket* packet) {
  if (packet->buf) {
    packet->buf->buffer->free = av_buffer_default_free;
  }
  return decode_packet(packet);
}

EM_PORT_API(int) decoder_flush() {
  return decode_packet(NULL);
}

EM_PORT_API(int) decoder_receive(AVFrame* frame) {
  return receive_frame(frame);
}

EM_PORT_API(void) decoder_close() {
  if (dec_ctx) {
    avcodec_free_context(&dec_ctx);
    dec_ctx = NULL;
  }
}

EM_PORT_API(int) decoder_discard(enum AVDiscard discard) {
  if (dec_ctx) {
    dec_ctx->skip_frame = discard;
  }
}