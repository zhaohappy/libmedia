#include "wasmenv.h"
#include "libavutil/imgutils.h"

EM_PORT_API(int) avimage_alloc(uint8_t *pointers[4], int linesizes[4],
                   int w, int h, enum AVPixelFormat pix_fmt, int align) {
  return av_image_alloc(pointers, linesizes, w, h, pix_fmt, align);
}