#ifndef __LOG_H__

  #define __LOG_H__

  #include "wasmenv.h"
  #include "libavutil/log.h"

  enum LOG_LEVEL {
    DEBUG = 1,
    INFO = 2,
    WARN = 3,
    ERROR = 4,
    NONE = 5
  };
  void set_ffmpeg_log_level(enum LOG_LEVEL l);
  void format_log(int level, const char* fmt, ...);
  EM_PORT_API(void) setLogLevel(enum LOG_LEVEL l);
#endif