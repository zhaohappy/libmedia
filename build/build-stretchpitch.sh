#!/bin/bash

ENABLE_SIMD=$1
ENABLE_ATOMIC=$2
ENABLE_WASM64=$3

echo "===== start audiostretchpitch build====="

NOW_PATH=$(cd $(dirname $0); pwd)

PROJECT_ROOT_PATH=$(cd $NOW_PATH/../; pwd)

PROJECT_SRC_PATH=$PROJECT_ROOT_PATH/src

PROJECT_OUTPUT_PATH=$PROJECT_ROOT_PATH/dist/stretchpitch

CLIB_PATH=$PROJECT_SRC_PATH/audiostretchpitch/clib
EMSDK_PATH=$PROJECT_ROOT_PATH/../emsdk

source $EMSDK_PATH/emsdk_env.sh

if ! [ -n "$1" ]; then
  ENABLE_SIMD=`sed '/^enable_simd=/!d;s/.*=//' $NOW_PATH/config`
fi
if ! [ -n "$2" ]; then
  ENABLE_ATOMIC=`sed '/^enable_atomic=/!d;s/.*=//' $NOW_PATH/config`
fi
ENABLE_DEBUG=`sed '/^enable_debug=/!d;s/.*=//' $NOW_PATH/config` 

FILE_NAME=stretchpitch


if [ $ENABLE_WASM64 == "1" ]; then
  FILE_NAME=stretchpitch-64
  EXTRA_CFLAGS="$EXTRA_CFLAGS -pthread -mbulk-memory -msimd128 -fvectorize -fslp-vectorize"
else
  if [ $ENABLE_SIMD == "1" ]; then
    FILE_NAME=stretchpitch-simd
    EXTRA_CFLAGS="$EXTRA_CFLAGS -pthread -mbulk-memory -msimd128 -fvectorize -fslp-vectorize"
  else
    if [ $ENABLE_ATOMIC == "1" ]; then
      FILE_NAME=stretchpitch-atomic
      CFLAG="$CFLAG -mbulk-memory"
    else 
      CFLAG="$CFLAG -mno-bulk-memory -no-pthread -mno-sign-ext"
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

WASM64=""
if [ $ENABLE_WASM64 == "1" ]; then
  WASM64="-s MEMORY64"
fi

emcc $CFLAG --no-entry -Wl,--no-check-features $CLIB_PATH/stretchpitch.cpp \
  $CLIB_PATH/soundtouch/SoundTouch.cpp \
  $CLIB_PATH/soundtouch/FIFOSampleBuffer.cpp \
  $CLIB_PATH/soundtouch/RateTransposer.cpp \
  $CLIB_PATH/soundtouch/TDStretch.cpp \
  $CLIB_PATH/soundtouch/InterpolateLinear.cpp \
  $CLIB_PATH/soundtouch/InterpolateCubic.cpp \
  $CLIB_PATH/soundtouch/InterpolateShannon.cpp \
  $CLIB_PATH/soundtouch/AAFilter.cpp \
  $CLIB_PATH/soundtouch/FIRFilter.cpp \
  -I "$PROJECT_ROOT_PATH/src/cheap/include" \
  -I "$CLIB_PATH/soundtouch/include" \
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

echo "===== build audiostretchpitch finished  ====="
