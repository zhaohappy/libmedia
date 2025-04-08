#!/bin/bash

simd=$1
atomic=$2
wasm64=$3

NOW_PATH=$(cd $(dirname $0); pwd)

PROJECT_ROOT_PATH=$(cd $NOW_PATH/../; pwd)

LIBVPX_PATH=$(cd $PROJECT_ROOT_PATH/../libvpx; pwd)

LIB_OUTPUT_PATH=$PROJECT_ROOT_PATH/lib/libvpx
LIB_BUILD_PATH=$PROJECT_ROOT_PATH/dist/libvpx


EXTRA_CFLAGS="-I$PROJECT_ROOT_PATH/src/cheap/include -O3"

if [[ $wasm64 == "1" ]]; then
  EXTRA_CFLAGS="$EXTRA_CFLAGS -fPIC -pthread -mbulk-memory -msimd128 -fvectorize -fslp-vectorize"
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

if [ ! -d $LIB_OUTPUT_PATH ]; then
  mkdir $LIB_OUTPUT_PATH
fi

source $PROJECT_ROOT_PATH/../emsdk/emsdk_env.sh

echo $LIBVPX_PATH

cd $LIBVPX_PATH

emmake make clean

emconfigure ./configure \
  --prefix=$LIB_OUTPUT_PATH \
  --libc=$LIB_OUTPUT_PATH \
  --target=wasm64 \
  --cpu=i686-gnu \
  --enable-pic \
  --enable-vp8 \
  --enable-vp9 \
  --disable-tools \
  --disable-docs \
  --disable-examples \
  --disable-examples \
  --disable-unit-tests \
  --disable-libyuv \
  --disable-webm-io \
  --extra-cflags="$EXTRA_CFLAGS"

emmake make

emmake make install

emmake make clean
