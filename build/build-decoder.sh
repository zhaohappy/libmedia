#!/bin/bash

decode=$1
ENABLE_SIMD=$2
ENABLE_ATOMIC=$3
ENABLE_WASM64=$4

echo "===== start decoder $decode build====="

NOW_PATH=$(cd $(dirname $0); pwd)

PROJECT_ROOT_PATH=$(cd $NOW_PATH/../; pwd)

PROJECT_SRC_PATH=$PROJECT_ROOT_PATH/src

PROJECT_OUTPUT_PATH=$PROJECT_ROOT_PATH/dist/decode

FFMPEG_PATH=$PROJECT_ROOT_PATH/lib/ffmpeg
FFMPEG_AVUTIL_PATH=$FFMPEG_PATH/lib
FFMPEG_DECODE_PATH=$PROJECT_ROOT_PATH/lib/decode
EMSDK_PATH=$PROJECT_ROOT_PATH/../emsdk

CLIB_PATH=$PROJECT_SRC_PATH/avcodec/clib

INCLUDE_PATH=$PROJECT_ROOT_PATH/dist/include

source $EMSDK_PATH/emsdk_env.sh

if ! [ -n "$2" ]; then
  ENABLE_SIMD=`sed '/^enable_simd=/!d;s/.*=//' $NOW_PATH/config`
fi
if ! [ -n "$3" ]; then
  ENABLE_ATOMIC=`sed '/^enable_atomic=/!d;s/.*=//' $NOW_PATH/config`
fi
ENABLE_DEBUG=`sed '/^enable_debug=/!d;s/.*=//' $NOW_PATH/config` 

echo "enable simd $ENABLE_SIMD"
echo "enable atomic $ENABLE_ATOMIC"
echo "enable wasm64 $ENABLE_WASM64"
echo "include path $INCLUDE_PATH"

WASM64=""
if [ $ENABLE_WASM64 == "1" ]; then
  WASM64="-s MEMORY64"
fi

FILE_NAME=$decode

if [ $ENABLE_WASM64 == "1" ]; then
  FILE_NAME=$decode-64
else
  if [ $ENABLE_SIMD == "1" ]; then
    FILE_NAME=$decode-simd
  else
    if [ $ENABLE_ATOMIC == "1" ]; then
      FILE_NAME=$decode-atomic
    fi
  fi
fi

if [ ! -d $PROJECT_OUTPUT_PATH ]; then
  mkdir $PROJECT_OUTPUT_PATH
fi

if [ ! -d $INCLUDE_PATH ]; then
  mkdir $INCLUDE_PATH
fi

rm $PROJECT_OUTPUT_PATH/$FILE_NAME.js
rm $PROJECT_OUTPUT_PATH/$FILE_NAME.wasm
rm $PROJECT_OUTPUT_PATH/$FILE_NAME.debug.wasm
rm $INCLUDE_PATH/config.h

DECODER_LIB=""

# 写入 config.h 配置
$NOW_PATH/config.sh $INCLUDE_PATH
if [ $decode == "h264" ]; then
  echo "#define CODEC_ID AV_CODEC_ID_H264" >> $INCLUDE_PATH/config.h
elif [ $decode == "hevc" ]; then
  echo "#define CODEC_ID AV_CODEC_ID_HEVC" >> $INCLUDE_PATH/config.h
elif [ $decode == "vp8" ]; then
  if [ $ENABLE_WASM64 == "1" ]; then
    DECODER_LIB="$PROJECT_ROOT_PATH/lib/libvpx-64/lib/libvpx.a"
  else
    if [ $ENABLE_SIMD == "1" ]; then
      DECODER_LIB="$PROJECT_ROOT_PATH/lib/libvpx-simd/lib/libvpx.a"
    else
      if [ $ENABLE_ATOMIC == "1" ]; then
        DECODER_LIB="$PROJECT_ROOT_PATH/lib/libvpx-atomic/lib/libvpx.a"
      else
        DECODER_LIB="$PROJECT_ROOT_PATH/lib/libvpx/lib/libvpx.a"
      fi
    fi
  fi
elif [ $decode == "vp9" ]; then
  if [ $ENABLE_WASM64 == "1" ]; then
    DECODER_LIB="$PROJECT_ROOT_PATH/lib/libvpx-64/lib/libvpx.a"
  else
    if [ $ENABLE_SIMD == "1" ]; then
      DECODER_LIB="$PROJECT_ROOT_PATH/lib/libvpx-simd/lib/libvpx.a"
    else
      if [ $ENABLE_ATOMIC == "1" ]; then
        DECODER_LIB="$PROJECT_ROOT_PATH/lib/libvpx-atomic/lib/libvpx.a"
      else
        DECODER_LIB="$PROJECT_ROOT_PATH/lib/libvpx/lib/libvpx.a"
      fi
    fi
  fi
elif [ $decode == "mpeg4" ]; then
  echo "#define CODEC_ID AV_CODEC_ID_MPEG4" >> $INCLUDE_PATH/config.h
elif [ $decode == "av1" ]; then
  if [ $ENABLE_WASM64 == "1" ]; then
    DECODER_LIB="$PROJECT_ROOT_PATH/lib/dav1d-64/lib/libdav1d.a"
  else
    if [ $ENABLE_SIMD == "1" ]; then
      DECODER_LIB="$PROJECT_ROOT_PATH/lib/dav1d-simd/lib/libdav1d.a"
    else
      if [ $ENABLE_ATOMIC == "1" ]; then
        DECODER_LIB="$PROJECT_ROOT_PATH/lib/dav1d-atomic/lib/libdav1d.a"
      else
        DECODER_LIB="$PROJECT_ROOT_PATH/lib/dav1d/lib/libdav1d.a"
      fi
    fi
  fi
elif [ $decode == "aac" ]; then
  echo "#define CODEC_ID AV_CODEC_ID_AAC" >> $INCLUDE_PATH/config.h
elif [ $decode == "mp3" ]; then
  echo "#define CODEC_ID AV_CODEC_ID_MP3" >> $INCLUDE_PATH/config.h
elif [ $decode == "opus" ]; then
  echo "#define CODEC_ID AV_CODEC_ID_OPUS" >> $INCLUDE_PATH/config.h
elif [ $decode == "speex" ]; then
  if [ $ENABLE_WASM64 == "1" ]; then
    DECODER_LIB="$PROJECT_ROOT_PATH/lib/speex-64/lib/libspeex.a"
  else
    if [ $ENABLE_SIMD == "1" ]; then
      DECODER_LIB="$PROJECT_ROOT_PATH/lib/speex-simd/lib/libspeex.a"
    else
      if [ $ENABLE_ATOMIC == "1" ]; then
        DECODER_LIB="$PROJECT_ROOT_PATH/lib/speex-atomic/lib/libspeex.a"
      else
        DECODER_LIB="$PROJECT_ROOT_PATH/lib/speex/lib/libspeex.a"
      fi
    fi
  fi
elif [ $decode == "flac" ]; then
  echo "#define CODEC_ID AV_CODEC_ID_FLAC" >> $INCLUDE_PATH/config.h
elif [ $decode == "vorbis" ]; then
  echo "#define CODEC_ID AV_CODEC_ID_VORBIS" >> $INCLUDE_PATH/config.h
fi

CFLAG="-O3"
EMCCFLAG=""
DIR_SUBFIX=""

if [ $ENABLE_DEBUG == "1" ]; then
  CFLAG="$CFLAG -g"
  echo "#define ENABLE_FFMPEG_LOG_LEVEL 1" >> $INCLUDE_PATH/config.h
fi

if [ $ENABLE_WASM64 == "1" ]; then
  DIR_SUBFIX="$DIR_SUBFIX-64"
  CFLAG="$CFLAG -msimd128 -fvectorize -fslp-vectorize -mbulk-memory"
  FFMPEG_AVUTIL_PATH=$PROJECT_ROOT_PATH/lib/ffmpeg-64/lib
else
  if [[ $ENABLE_SIMD == "1" ]]; then
    DIR_SUBFIX="$DIR_SUBFIX-simd"
    CFLAG="$CFLAG -msimd128 -fvectorize -fslp-vectorize -mbulk-memory"
    FFMPEG_AVUTIL_PATH=$PROJECT_ROOT_PATH/lib/ffmpeg-simd/lib
  else 
    if [ $ENABLE_ATOMIC == "1" ]; then
      DIR_SUBFIX="$DIR_SUBFIX-atomic"
      FFMPEG_AVUTIL_PATH=$PROJECT_ROOT_PATH/lib/ffmpeg-atomic/lib
      CFLAG="$CFLAG -mbulk-memory"
    else
      CFLAG="$CFLAG -mno-bulk-memory -no-pthread -mno-sign-ext"
    fi
  fi
fi



emcc $CFLAG --no-entry -Wl,--no-check-features $CLIB_PATH/decode.c $CLIB_PATH/logger/log.c $DECODER_LIB \
  $FFMPEG_AVUTIL_PATH/libavutil.a $FFMPEG_AVUTIL_PATH/libswresample.a $FFMPEG_DECODE_PATH/$decode$DIR_SUBFIX/libavcodec.a \
  -I "$FFMPEG_PATH/include" \
  -I "$PROJECT_ROOT_PATH/src/cheap/include" \
  -I "$INCLUDE_PATH" \
  -s WASM=1 \
  -s FILESYSTEM=0 \
  -s FETCH=0 \
  -s ASSERTIONS=0 \
  -s ALLOW_MEMORY_GROWTH=1 \
  -s IMPORTED_MEMORY=1 \
  -s INITIAL_MEMORY=17367040 \
  -s USE_PTHREADS=0 \
  -s MAIN_MODULE=2 \
  -s SIDE_MODULE=0 \
  -s MALLOC="none" \
  -s ERROR_ON_UNDEFINED_SYMBOLS=0 \
  $EMCCFLAG \
  $WASM64 \
  -o $PROJECT_OUTPUT_PATH/$FILE_NAME.wasm

if [ $ENABLE_SIMD != "1" ] && [ $ENABLE_ATOMIC != "1" ] && [ $ENABLE_WASM64 != "1" ]; then
  $EMSDK_PATH/upstream/bin/wasm-opt $PROJECT_OUTPUT_PATH/$FILE_NAME.wasm -o $PROJECT_OUTPUT_PATH/$FILE_NAME.wasm --signext-lowering
fi

node $PROJECT_SRC_PATH/cheap/build/wasm-opt.js $PROJECT_OUTPUT_PATH/$FILE_NAME.wasm --bss -o $PROJECT_OUTPUT_PATH/$FILE_NAME.wasm

echo "===== build decoder $decode finished  ====="
