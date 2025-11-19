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
EXTRA_CFLAGS="-I$PROJECT_ROOT_PATH/packages/cheap/include -O3"
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

if [[ $decode == "png" ]]; then
  EXTRACOMPONENTS="$EXTRACOMPONENTS --enable-zlib"
  EXTRA_CFLAGS="$EXTRA_CFLAGS -I$PROJECT_ROOT_PATH/lib/zlib/include"
  if [[ $wasm64 == "1" ]]; then
    EXTRA_LDFLAGS="$EXTRA_LDFLAGS -L$PROJECT_ROOT_PATH/lib/zlib-64/lib -lz"
  else
    EXTRA_LDFLAGS="$EXTRA_LDFLAGS -L$PROJECT_ROOT_PATH/lib/zlib/lib -lz"
  fi
fi

if [[ $decode == "tiff" ]]; then
  EXTRACOMPONENTS="$EXTRACOMPONENTS --enable-zlib"
  EXTRA_CFLAGS="$EXTRA_CFLAGS -I$PROJECT_ROOT_PATH/lib/zlib/include"
  if [[ $wasm64 == "1" ]]; then
    EXTRA_LDFLAGS="$EXTRA_LDFLAGS -L$PROJECT_ROOT_PATH/lib/zlib-64/lib -lz"
  else
    EXTRA_LDFLAGS="$EXTRA_LDFLAGS -L$PROJECT_ROOT_PATH/lib/zlib/lib -lz"
  fi
fi

if [[ $decode == "h263" ]]; then
  realDecoder="h263"
  EXTRACOMPONENTS="$EXTRACOMPONENTS --enable-decoder=h263i --enable-decoder=h263p"
fi

if [[ $decode == "msmpeg4" ]]; then
  realDecoder="msmpeg4v1"
  EXTRACOMPONENTS="$EXTRACOMPONENTS --enable-decoder=msmpeg4v2 --enable-decoder=msmpeg4v3"
fi

if [[ $decode == "rv" ]]; then
  realDecoder="rv10"
  EXTRACOMPONENTS="$EXTRACOMPONENTS --enable-decoder=rv20 --enable-decoder=rv30 --enable-decoder=rv40"
fi

if [[ $decode == "ra" ]]; then
  realDecoder="cook"
  EXTRACOMPONENTS="$EXTRACOMPONENTS --enable-decoder=sipr --enable-decoder=ralf"
fi

if [[ $decode == "wmv" ]]; then
  realDecoder="wmv1"
  EXTRACOMPONENTS="$EXTRACOMPONENTS --enable-decoder=wmv2 --enable-decoder=wmv3"
fi

if [[ $decode == "wma" ]]; then
  realDecoder="wmav1"
  EXTRACOMPONENTS="$EXTRACOMPONENTS --enable-decoder=wmav2 --enable-decoder=wmapro --enable-decoder=wmavoice --enable-decoder=wmalossless"
fi

if [[ $decode == "pcm" ]]; then
  realDecoder="pcm_alaw"
  EXTRACOMPONENTS="
    $EXTRACOMPONENTS
    --enable-decoder=pcm_alaw_at
    --enable-decoder=pcm_bluray
    --enable-decoder=pcm_dvd
    --enable-decoder=pcm_f16le
    --enable-decoder=pcm_f24le
    --enable-decoder=pcm_f32be
    --enable-decoder=pcm_f32le
    --enable-decoder=pcm_f64be
    --enable-decoder=pcm_f64le
    --enable-decoder=pcm_lxf
    --enable-decoder=pcm_mulaw
    --enable-decoder=pcm_mulaw_at
    --enable-decoder=pcm_s16be
    --enable-decoder=pcm_s16be_planar
    --enable-decoder=pcm_s16le
    --enable-decoder=pcm_s16le_planar
    --enable-decoder=pcm_s24be
    --enable-decoder=pcm_s24daud
    --enable-decoder=pcm_s24le
    --enable-decoder=pcm_s24le_planar
    --enable-decoder=pcm_s32be
    --enable-decoder=pcm_s32le
    --enable-decoder=pcm_s32le_planar
    --enable-decoder=pcm_s64be
    --enable-decoder=pcm_s64le
    --enable-decoder=pcm_s8
    --enable-decoder=pcm_s8_planar
    --enable-decoder=pcm_sga
    --enable-decoder=pcm_u16be
    --enable-decoder=pcm_u16le
    --enable-decoder=pcm_u24be
    --enable-decoder=pcm_u24le
    --enable-decoder=pcm_u32be
    --enable-decoder=pcm_u32le
    --enable-decoder=pcm_u8
    --enable-decoder=pcm_vidc
    "
fi

if [[ $decode == "adpcm" ]]; then
  realDecoder="adpcm_4xm"
  EXTRACOMPONENTS="
    $EXTRACOMPONENTS
    --enable-decoder=adpcm_adx
    --enable-decoder=adpcm_afc
    --enable-decoder=adpcm_agm
    --enable-decoder=adpcm_aica
    --enable-decoder=adpcm_argo
    --enable-decoder=adpcm_ct
    --enable-decoder=adpcm_dtk
    --enable-decoder=adpcm_ea
    --enable-decoder=adpcm_ea_maxis_xa
    --enable-decoder=adpcm_ea_r1
    --enable-decoder=adpcm_ea_r2
    --enable-decoder=adpcm_ea_r3
    --enable-decoder=adpcm_ea_xas
    --enable-decoder=adpcm_g722
    --enable-decoder=adpcm_g726
    --enable-decoder=adpcm_g726le
    --enable-decoder=adpcm_ima_acorn
    --enable-decoder=adpcm_ima_alp
    --enable-decoder=adpcm_ima_amv
    --enable-decoder=adpcm_ima_apc
    --enable-decoder=adpcm_ima_apm
    --enable-decoder=adpcm_ima_cunning
    --enable-decoder=adpcm_ima_dat4
    --enable-decoder=adpcm_ima_dk3
    --enable-decoder=adpcm_ima_dk4
    --enable-decoder=adpcm_ima_ea_eacs
    --enable-decoder=adpcm_ima_ea_sead
    --enable-decoder=adpcm_ima_iss
    --enable-decoder=adpcm_ima_moflex
    --enable-decoder=adpcm_ima_mtf
    --enable-decoder=adpcm_ima_oki
    --enable-decoder=adpcm_ima_qt
    --enable-decoder=adpcm_ima_qt_at
    --enable-decoder=adpcm_ima_rad
    --enable-decoder=adpcm_ima_smjpeg
    --enable-decoder=adpcm_ima_ssi
    --enable-decoder=adpcm_ima_wav
    --enable-decoder=adpcm_ima_ws
    --enable-decoder=adpcm_ms
    --enable-decoder=adpcm_mtaf
    --enable-decoder=adpcm_psx
    --enable-decoder=adpcm_sbpro_2
    --enable-decoder=adpcm_sbpro_3
    --enable-decoder=adpcm_sbpro_4
    --enable-decoder=adpcm_swf
    --enable-decoder=adpcm_thp
    --enable-decoder=adpcm_thp_le
    --enable-decoder=adpcm_vima
    --enable-decoder=adpcm_xa
    --enable-decoder=adpcm_xmd
    --enable-decoder=adpcm_yamaha
    --enable-decoder=adpcm_zork
    "
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