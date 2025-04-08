#!/bin/bash

simd=$1
atomic=$2
wasm64=$3

NOW_PATH=$(cd $(dirname $0); pwd)

PROJECT_ROOT_PATH=$(cd $NOW_PATH/../; pwd)

X264_PATH=$(cd $PROJECT_ROOT_PATH/../x264; pwd)

LIB_OUTPUT_PATH=$PROJECT_ROOT_PATH/lib/x264
LIB_BUILD_PATH=$PROJECT_ROOT_PATH/dist/x264

CFLAG=""
EXTRA_CFLAGS="-I$PROJECT_ROOT_PATH/src/cheap/include -O3"

if [[ $wasm64 == "1" ]]; then
  EXTRA_CFLAGS="$EXTRA_CFLAGS -pthread -mbulk-memory -msimd128 -fvectorize -fslp-vectorize"
  LIB_OUTPUT_PATH="$LIB_OUTPUT_PATH-64"
  LIB_BUILD_PATH="$LIB_BUILD_PATH-64"
else
  if [[ $simd == "1" ]]; then
    EXTRA_CFLAGS="$EXTRA_CFLAGS -pthread -mbulk-memory -msimd128 -fvectorize -fslp-vectorize"
    LIB_OUTPUT_PATH="$LIB_OUTPUT_PATH-simd"
    LIB_BUILD_PATH="$LIB_BUILD_PATH-simd"
  else
    if [[ $atomic == "1" ]]; then
      EXTRA_CFLAGS="$EXTRA_CFLAGS -pthread -mbulk-memory"
      LIB_OUTPUT_PATH="$LIB_OUTPUT_PATH-atomic"
      LIB_BUILD_PATH="$LIB_BUILD_PATH-atomic"
    else 
      EXTRA_CFLAGS="$EXTRA_CFLAGS -mno-bulk-memory -no-pthread -mno-sign-ext"
    fi
  fi
fi

source $PROJECT_ROOT_PATH/../emsdk/emsdk_env.sh

cd $X264_PATH

emmake make clean

emconfigure ./configure \
  --prefix=$LIB_OUTPUT_PATH \
  --host=i686-gnu \
  --disable-cli \
  --disable-asm \
  --enable-pic \
  --enable-static \
  --disable-shared  \
  --enable-thread \
  --disable-win32thread \
  --disable-opencl \
  --extra-cflags="$EXTRA_CFLAGS" \
  $CFLAG

emmake make

emmake make install

emmake make clean
