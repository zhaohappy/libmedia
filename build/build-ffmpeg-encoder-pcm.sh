#!/bin/bash

encode=pcm
simd=$1
atomic=$2
wasm64=$3

echo "===== start build ffmpeg encoder $encode ====="

NOW_PATH=$(cd $(dirname $0); pwd)

PROJECT_ROOT_PATH=$(cd $NOW_PATH/../; pwd)

FFMPEG_PATH=$(cd $PROJECT_ROOT_PATH/../FFmpeg; pwd)
EMSDK_PATH=$(cd $PROJECT_ROOT_PATH/../emsdk; pwd)

source $EMSDK_PATH/emsdk_env.sh

DIRNAME=$PROJECT_ROOT_PATH/lib/encode/$encode


if [[ $wasm64 == "1" ]]; then
  DIRNAME="$DIRNAME-64"
else
  if [[ $simd == "1" ]]; then
    DIRNAME="$DIRNAME-simd"
  else
    if [[ $atomic == "1" ]]; then
      DIRNAME="$DIRNAME-atomic"
    fi
  fi
fi


if [ ! -d $PROJECT_ROOT_PATH/lib/encode ]; then
  mkdir $PROJECT_ROOT_PATH/lib/encode
fi

rm -rf $DIRNAME
rm -rf $PROJECT_ROOT_PATH/ffmpeg-cache

mkdir $DIRNAME
mkdir $PROJECT_ROOT_PATH/ffmpeg-cache

cd $FFMPEG_PATH

CFLAG=""
EXTRA_CFLAGS="-I$PROJECT_ROOT_PATH/src/cheap/include -O3"
EXTRA_LDFLAGS=""

COMPONENTS=""

if [[ $wasm64 == "1" ]]; then
  COMPONENTS="$COMPONENTS --enable-websimd128 --disable-wasmatomic"
  EXTRA_CFLAGS="$EXTRA_CFLAGS -msimd128 -fvectorize -fslp-vectorize -pthread -mbulk-memory"
else
  if [[ $simd == "1" ]]; then
    COMPONENTS="$COMPONENTS --enable-websimd128 --disable-wasmatomic"
    EXTRA_CFLAGS="$EXTRA_CFLAGS -msimd128 -fvectorize -fslp-vectorize -pthread -mbulk-memory"
  else
    COMPONENTS="$COMPONENTS --disable-websimd128"
    if [[ $atomic == "1" ]]; then
      COMPONENTS="$COMPONENTS --disable-wasmatomic"
      EXTRA_CFLAGS="$EXTRA_CFLAGS -pthread -mbulk-memory"
    else
      EXTRA_CFLAGS="$EXTRA_CFLAGS -mno-bulk-memory -mno-sign-ext -no-pthread"
      COMPONENTS="$COMPONENTS --enable-wasmatomic"
    fi
  fi
fi

COMPONENTS="
  $COMPONENTS
  --enable-encoder=pcm_alaw
  --enable-encoder=pcm_alaw_at
  --enable-encoder=pcm_bluray
  --enable-encoder=pcm_dvd
  --enable-encoder=pcm_f16le
  --enable-encoder=pcm_f24le
  --enable-encoder=pcm_f32be
  --enable-encoder=pcm_f32le
  --enable-encoder=pcm_f64be
  --enable-encoder=pcm_f64le
  --enable-encoder=pcm_lxf
  --enable-encoder=pcm_mulaw
  --enable-encoder=pcm_mulaw_at
  --enable-encoder=pcm_s16be
  --enable-encoder=pcm_s16be_planar
  --enable-encoder=pcm_s16le
  --enable-encoder=pcm_s16le_planar
  --enable-encoder=pcm_s24be
  --enable-encoder=pcm_s24daud
  --enable-encoder=pcm_s24le
  --enable-encoder=pcm_s24le_planar
  --enable-encoder=pcm_s32be
  --enable-encoder=pcm_s32le
  --enable-encoder=pcm_s32le_planar
  --enable-encoder=pcm_s64be
  --enable-encoder=pcm_s64le
  --enable-encoder=pcm_s8
  --enable-encoder=pcm_s8_planar
  --enable-encoder=pcm_sga
  --enable-encoder=pcm_u16be
  --enable-encoder=pcm_u16le
  --enable-encoder=pcm_u24be
  --enable-encoder=pcm_u24le
  --enable-encoder=pcm_u32be
  --enable-encoder=pcm_u32le
  --enable-encoder=pcm_u8
  --enable-encoder=pcm_vidc
  "

emmake make clean

emconfigure ./configure \
  --prefix=$PROJECT_ROOT_PATH/ffmpeg-cache \
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
  --disable-network \
  --disable-protocols \
  --disable-devices \
  --disable-filters \
  --disable-runtime-cpudetect \
  --enable-asm \
  --disable-debug \
  --disable-avdevice \
  --disable-swresample \
  --disable-swscale \
  --disable-pixelutils \
  --disable-everything \
  --disable-avformat \
  --disable-demuxers \
  --enable-pic \
  --extra-cflags="$EXTRA_CFLAGS" \
  --extra-ldflags="$EXTRA_LDFLAGS" \
  $COMPONENTS \
  $EXTRACOMPONENTS \
  $CFLAG

emmake make

emmake make install

emmake make clean

mv $PROJECT_ROOT_PATH/ffmpeg-cache/lib/libavcodec.a $DIRNAME

echo "===== build ffmpeg encoder $encode finished  ====="