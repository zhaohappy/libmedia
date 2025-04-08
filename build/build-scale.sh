#!/bin/bash

ENABLE_SIMD=$1
ENABLE_ATOMIC=$2
ENABLE_WASM64=$3

echo "===== start scale build====="

NOW_PATH=$(cd $(dirname $0); pwd)

PROJECT_ROOT_PATH=$(cd $NOW_PATH/../; pwd)

PROJECT_SRC_PATH=$PROJECT_ROOT_PATH/src

PROJECT_OUTPUT_PATH=$PROJECT_ROOT_PATH/dist/scale

FFMPEG_PATH=$PROJECT_ROOT_PATH/lib/ffmpeg
FFMPEG_AVUTIL_PATH=$FFMPEG_PATH/lib
FFMPEG_SCALE_PATH=$FFMPEG_PATH/lib
EMSDK_PATH=$PROJECT_ROOT_PATH/../emsdk

CLIB_PATH=$PROJECT_SRC_PATH/videoscale/clib

source $EMSDK_PATH/emsdk_env.sh

if ! [ -n "$1" ]; then
  ENABLE_SIMD=`sed '/^enable_simd=/!d;s/.*=//' $NOW_PATH/config`
fi
if ! [ -n "$2" ]; then
  ENABLE_ATOMIC=`sed '/^enable_atomic=/!d;s/.*=//' $NOW_PATH/config`
fi
ENABLE_DEBUG=`sed '/^enable_debug=/!d;s/.*=//' $NOW_PATH/config` 

FILE_NAME=scale

if [ $ENABLE_WASM64 == "1" ]; then
  FILE_NAME=scale-64
else
  if [ $ENABLE_SIMD == "1" ]; then
    FILE_NAME=scale-simd
  else
    if [ $ENABLE_ATOMIC == "1" ]; then
      FILE_NAME=scale-atomic
    fi
  fi
fi


if [ ! -d $PROJECT_OUTPUT_PATH ]; then
  mkdir $PROJECT_OUTPUT_PATH
fi

rm $PROJECT_OUTPUT_PATH/$FILE_NAME.js
rm $PROJECT_OUTPUT_PATH/$FILE_NAME.wasm
rm $PROJECT_OUTPUT_PATH/$FILE_NAME.debug.wasm

CFLAG="-O3"
EMCCFLAG=""
DIR_SUBFIX=""

if [ $ENABLE_DEBUG == "1" ]; then
  CFLAG="$CFLAG -g"
fi

if [ $ENABLE_WASM64 == "1" ]; then
  DIR_SUBFIX="$DIR_SUBFIX-64"
  CFLAG="$CFLAG -pthread -mbulk-memory -msimd128 -fvectorize -fslp-vectorize"
  FFMPEG_AVUTIL_PATH=$PROJECT_ROOT_PATH/lib/ffmpeg-64/lib
  FFMPEG_SCALE_PATH=$PROJECT_ROOT_PATH/lib/ffmpeg-64/lib
else
  if [[ $ENABLE_SIMD == "1" ]]; then
    DIR_SUBFIX="$DIR_SUBFIX-simd"
    CFLAG="$CFLAG -pthread -mbulk-memory -msimd128 -fvectorize -fslp-vectorize"
    FFMPEG_AVUTIL_PATH=$PROJECT_ROOT_PATH/lib/ffmpeg-simd/lib
    FFMPEG_SCALE_PATH=$PROJECT_ROOT_PATH/lib/ffmpeg-simd/lib
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

WASM64=""
if [ $ENABLE_WASM64 == "1" ]; then
  WASM64="-s MEMORY64"
fi

emcc $CFLAG --no-entry -Wl,--no-check-features $CLIB_PATH/scale.c $FFMPEG_AVUTIL_PATH/libavutil.a $FFMPEG_SCALE_PATH/libswscale.a \
  -I "$FFMPEG_PATH/include" \
  -I "$PROJECT_ROOT_PATH/src/cheap/include" \
  -s WASM=1 \
  -s FILESYSTEM=0 \
  -s FETCH=0 \
  -s ASSERTIONS=0 \
  -s ALLOW_MEMORY_GROWTH=1 \
  -s IMPORTED_MEMORY=1 \
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

echo "===== build scale finished  ====="
