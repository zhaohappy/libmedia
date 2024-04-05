
#include "config.h"
#include "wasmenv.h"
#include "./log.h"
#include <stdarg.h>
#include <string.h>
#include <stdio.h>

#define LOG_MAX 1024 * 4
static enum LOG_LEVEL level = WARN;

void format_log(int level, const char* fmt, ...) {
  char buf[LOG_MAX];
  va_list ap;
  va_start(ap, fmt);
  vsnprintf(buf, LOG_MAX  - 1, fmt, ap);
  va_end(ap);

  switch (level) {
    case AV_LOG_DEBUG:
      fprintf(stdout, "%s", buf);
      break;
    case AV_LOG_VERBOSE:
      fprintf(stdout, "%s", buf);
      break;
    case AV_LOG_INFO:
      fprintf(stdout, "%s", buf);
      break;
    case AV_LOG_WARNING:
     fprintf(stdout, "%s", buf);
      break;
    case AV_LOG_ERROR:
      fprintf(stderr, "%s", buf);
      break;
    default:
      fprintf(stdout, "%s", buf);
      break;
  }
}

void set_ffmpeg_log_level(enum LOG_LEVEL l) {
  switch (l) {
    case DEBUG:
      av_log_set_level(AV_LOG_DEBUG);
      break;
    case INFO:
      av_log_set_level(AV_LOG_INFO);
      break;
    case WARN:
      av_log_set_level(AV_LOG_WARNING);
      break;
    case ERROR:
      av_log_set_level(AV_LOG_ERROR);
      break;
    default:
      av_log_set_level(AV_LOG_ERROR);
      break;
  }
}

EM_PORT_API(void) setLogLevel(enum LOG_LEVEL l) {
  level = l;

  #if ENABLE_FFMPEG_LOG_LEVEL
    set_ffmpeg_log_level(l);
  #endif
}