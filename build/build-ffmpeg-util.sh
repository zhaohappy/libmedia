#!/bin/bash

echo "===== start build ffmpeg-emcc ====="

simd=$1
atomic=$2
wasm64=$3

NOW_PATH=$(cd $(dirname $0); pwd)

PROJECT_ROOT_PATH=$(cd $NOW_PATH/../; pwd)

FFMPEG_PATH=$(cd $PROJECT_ROOT_PATH/../FFmpeg; pwd)
EMSDK_PATH=$(cd $PROJECT_ROOT_PATH/../emsdk; pwd)

source $EMSDK_PATH/emsdk_env.sh

dir=$PROJECT_ROOT_PATH/lib/ffmpeg

EXTRA_CFLAGS="-I$PROJECT_ROOT_PATH/src/cheap/include -O3"

COMPONENTS=""

if [[ $wasm64 == "1" ]]; then
  COMPONENTS="$COMPONENTS --enable-websimd128 --disable-wasmatomic"
  EXTRA_CFLAGS="$EXTRA_CFLAGS -msimd128 -fvectorize -fslp-vectorize -pthread -mbulk-memory"
  dir="$dir-64"
else
  if [[ $simd == "1" ]]; then
    COMPONENTS="$COMPONENTS --enable-websimd128 --disable-wasmatomic"
    EXTRA_CFLAGS="$EXTRA_CFLAGS -msimd128 -fvectorize -fslp-vectorize -pthread -mbulk-memory"
    dir="$dir-simd"
  else
    COMPONENTS="$COMPONENTS --disable-websimd128"
    if [[ $atomic == "1" ]]; then
      COMPONENTS="$COMPONENTS --disable-wasmatomic"
      EXTRA_CFLAGS="$EXTRA_CFLAGS -pthread -mbulk-memory"
      dir="$dir-atomic"
    else
      COMPONENTS="$COMPONENTS --enable-wasmatomic"
      EXTRA_CFLAGS="$EXTRA_CFLAGS -mno-bulk-memory -no-pthread -mno-sign-ext"
    fi
  fi
fi

rm -rf $dir

mkdir $dir

cd $FFMPEG_PATH

emmake make clean

emconfigure ./configure \
  --prefix=$dir \
  --cc="emcc" \
  --cxx="em++" \
  --ar="emar" \
  --ranlib="emranlib" \
  --cpu=generic \
  --target-os=none \
  --arch=webassembly \
  --enable-gpl \
  --enable-version3 \
  --enable-cross-compile \
  --disable-logging \
  --disable-programs \
  --disable-ffmpeg \
  --disable-ffplay \
  --disable-ffprobe \
  --disable-doc \
  --disable-postproc  \
  --disable-avfilter \
  --enable-pthreads \
  --disable-w32threads \
  --disable-os2threads \
  --disable-runtime-cpudetect \
  --disable-network \
  --disable-everything \
  --disable-protocols \
  --disable-devices \
  --disable-filters \
  --enable-asm \
  --disable-debug \
  --disable-avdevice \
  --enable-pic \
  --extra-cflags="$EXTRA_CFLAGS" \
  $COMPONENTS

emmake make

emmake make install

emmake make clean

echo "===== build ffmpeg-emcc finished  ====="