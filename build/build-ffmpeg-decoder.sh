#!/bin/bash

decode=$1
simd=$2
atomic=$3
wasm64=$4

echo "===== start build ffmpeg decoder $decode ====="

NOW_PATH=$(cd $(dirname $0); pwd)

PROJECT_ROOT_PATH=$(cd $NOW_PATH/../; pwd)

FFMPEG_PATH=$(cd $PROJECT_ROOT_PATH/../FFmpeg; pwd)
EMSDK_PATH=$(cd $PROJECT_ROOT_PATH/../emsdk; pwd)

source $EMSDK_PATH/emsdk_env.sh

DIRNAME=$PROJECT_ROOT_PATH/lib/decode/$decode

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

if [ ! -d $PROJECT_ROOT_PATH/lib/decode ]; then
  mkdir $PROJECT_ROOT_PATH/lib/decode
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
      EXTRA_CFLAGS="$EXTRA_CFLAGS -mno-bulk-memory -no-pthread -mno-sign-ext"
      COMPONENTS="$COMPONENTS --enable-wasmatomic"
    fi
  fi
fi

EXTRACOMPONENTS=""

if [[ $decode == "opus" ]]; then
  EXTRACOMPONENTS="$EXTRACOMPONENTS --enable-swresample"
fi

realDecoder=$decode
if [[ $decode == "speex" ]]; then
  realDecoder="libspeex"
  EXTRACOMPONENTS="$EXTRACOMPONENTS --enable-libspeex"
  EXTRA_CFLAGS="$EXTRA_CFLAGS -I$PROJECT_ROOT_PATH/lib/speex/include"
  if [[ $wasm64 == "1" ]]; then
    EXTRA_LDFLAGS="$EXTRA_LDFLAGS -L$PROJECT_ROOT_PATH/lib/speex-64/lib -lspeex"
  else
    EXTRA_LDFLAGS="$EXTRA_LDFLAGS -L$PROJECT_ROOT_PATH/lib/speex/lib -lspeex"
  fi
fi

if [[ $decode == "av1" ]]; then
  realDecoder="libdav1d"
  EXTRACOMPONENTS="$EXTRACOMPONENTS --enable-libdav1d"
  EXTRA_CFLAGS="$EXTRA_CFLAGS -I$PROJECT_ROOT_PATH/lib/dav1d/include"
  if [[ $wasm64 == "1" ]]; then
    EXTRA_LDFLAGS="$EXTRA_LDFLAGS -L$PROJECT_ROOT_PATH/lib/dav1d-64/lib -ldav1d"
  else
    EXTRA_LDFLAGS="$EXTRA_LDFLAGS -L$PROJECT_ROOT_PATH/lib/dav1d/lib -ldav1d"
  fi
fi

if [[ $decode == "vp8" ]]; then
  realDecoder="libvpx_vp8"
  EXTRACOMPONENTS="$EXTRACOMPONENTS --enable-libvpx"
  EXTRA_CFLAGS="$EXTRA_CFLAGS -I$PROJECT_ROOT_PATH/lib/libvpx/include"
  if [[ $wasm64 == "1" ]]; then
    EXTRA_LDFLAGS="$EXTRA_LDFLAGS -L$PROJECT_ROOT_PATH/lib/libvpx-64/lib -lvpx"
  else
    EXTRA_LDFLAGS="$EXTRA_LDFLAGS -L$PROJECT_ROOT_PATH/lib/libvpx/lib -lvpx"
  fi
fi

if [[ $decode == "vp9" ]]; then
  realDecoder="libvpx_vp9"
  EXTRACOMPONENTS="$EXTRACOMPONENTS --enable-libvpx"
  EXTRA_CFLAGS="$EXTRA_CFLAGS -I$PROJECT_ROOT_PATH/lib/libvpx/include"
  if [[ $wasm64 == "1" ]]; then
    EXTRA_LDFLAGS="$EXTRA_LDFLAGS -L$PROJECT_ROOT_PATH/lib/libvpx-64/lib -lvpx"
  else
    EXTRA_LDFLAGS="$EXTRA_LDFLAGS -L$PROJECT_ROOT_PATH/lib/libvpx/lib -lvpx"
  fi
fi

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
  --enable-decoder=$realDecoder \
  --extra-cflags="$EXTRA_CFLAGS" \
  --extra-ldflags="$EXTRA_LDFLAGS" \
  $COMPONENTS \
  $EXTRACOMPONENTS \
  $CFLAG

emmake make

emmake make install

emmake make clean

mv $PROJECT_ROOT_PATH/ffmpeg-cache/lib/libavcodec.a $DIRNAME

echo "===== build ffmpeg decoder $decode finished  ====="