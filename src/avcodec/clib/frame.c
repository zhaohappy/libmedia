#include "wasmenv.h"
#include <libavutil/frame.h>

EM_PORT_API(int) avframe_ref(AVFrame *dst, const AVFrame *src) {
  return av_frame_ref(dst, src);
}

EM_PORT_API(int) avframe_copy(AVFrame *dst, const AVFrame *src) {
  return av_frame_copy(dst, src);
}

EM_PORT_API(AVBufferRef*) avframe_get_plane_buffer(AVFrame *frame, int plane) {
  return av_frame_get_plane_buffer(frame, plane);
}

EM_PORT_API(int) avframe_copy_props(AVFrame *dst, const AVFrame *src) {
  return av_frame_copy_props(dst, src);
}
