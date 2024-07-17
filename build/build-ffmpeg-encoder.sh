encode=$1
simd=$2
atomic=$3

echo "===== start build ffmpeg encoder $encode ====="

NOW_PATH=$(cd $(dirname $0); pwd)

PROJECT_ROOT_PATH=$(cd $NOW_PATH/../; pwd)

FFMPEG_PATH=$(cd $PROJECT_ROOT_PATH/../FFmpeg; pwd)

source $PROJECT_ROOT_PATH/../emsdk/emsdk_env.sh

DIRNAME=$PROJECT_ROOT_PATH/lib/encode/$encode

if [[ $simd == "1" ]]; then
  DIRNAME="$DIRNAME-simd"
else
  if [[ $atomic == "1" ]]; then
    DIRNAME="$DIRNAME-atomic"
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

COMPONENTS=""

if [[ $simd == "1" ]]; then
  COMPONENTS="$COMPONENTS --enable-websimd128 --disable-wasmatomic"
  EXTRA_CFLAGS="$EXTRA_CFLAGS -msimd128 -fvectorize -fslp-vectorize -pthread -mbulk-memory"
else
  COMPONENTS="$COMPONENTS --disable-websimd128"
  if [[ $atomic == "1" ]]; then
    COMPONENTS="$COMPONENTS --disable-wasmatomic"
    EXTRA_CFLAGS="$EXTRA_CFLAGS -pthread -mbulk-memory"
  else
    EXTRA_CFLAGS="$EXTRA_CFLAGS -mno-bulk-memory"
    COMPONENTS="$COMPONENTS --enable-wasmatomic"
  fi
fi

EXTRACOMPONENTS=""

realEncoder=$encode
if [[ $encode == "kvazaar" ]]; then
  realEncoder="libkvazaar"
  EXTRACOMPONENTS="$EXTRACOMPONENTS --enable-libkvazaar"

  if [[ $simd == "1" ]]; then
    EXTRA_CFLAGS="$EXTRA_CFLAGS -I$PROJECT_ROOT_PATH/lib/kvazaar-simd/include"
    EXTRA_LDFLAGS="$EXTRA_LDFLAGS -L$PROJECT_ROOT_PATH/lib/kvazaar-simd/lib -lkvazaar"
  else
    EXTRA_CFLAGS="$EXTRA_CFLAGS -I$PROJECT_ROOT_PATH/lib/kvazaar-atomic/include"
    EXTRA_LDFLAGS="$EXTRA_LDFLAGS -L$PROJECT_ROOT_PATH/lib/kvazaar-atomic/lib -lkvazaar"
  fi
elif [ $encode == "x264" ]; then
  realEncoder="libx264"
  EXTRACOMPONENTS="$EXTRACOMPONENTS --enable-libx264"

  if [[ $simd == "1" ]]; then
    EXTRA_CFLAGS="$EXTRA_CFLAGS -I$PROJECT_ROOT_PATH/lib/x264-simd/include"
    EXTRA_LDFLAGS="$EXTRA_LDFLAGS -L$PROJECT_ROOT_PATH/lib/x264-simd/lib -lx264"
  else
    EXTRA_CFLAGS="$EXTRA_CFLAGS -I$PROJECT_ROOT_PATH/lib/x264/include"
    EXTRA_LDFLAGS="$EXTRA_LDFLAGS -L$PROJECT_ROOT_PATH/lib/x264/lib -lx264"
  fi
elif [ $encode == "x265" ]; then
  realEncoder="libx265"
  EXTRACOMPONENTS="$EXTRACOMPONENTS --enable-libx265"

  if [[ $simd == "1" ]]; then
    EXTRA_CFLAGS="$EXTRA_CFLAGS -I$PROJECT_ROOT_PATH/lib/x265-simd/include"
    EXTRA_LDFLAGS="$EXTRA_LDFLAGS -L$PROJECT_ROOT_PATH/lib/x265-simd/lib -lx265"
  else
    EXTRA_CFLAGS="$EXTRA_CFLAGS -I$PROJECT_ROOT_PATH/lib/x265-atomic/include"
    EXTRA_LDFLAGS="$EXTRA_LDFLAGS -L$PROJECT_ROOT_PATH/lib/x265-atomic/lib -lx265"
  fi
elif [ $encode == "mp3lame" ]; then
  realEncoder="libmp3lame"
  EXTRACOMPONENTS="$EXTRACOMPONENTS --enable-libmp3lame"

  if [[ $simd == "1" ]]; then
    EXTRA_CFLAGS="$EXTRA_CFLAGS -I$PROJECT_ROOT_PATH/lib/mp3lame-simd/include"
    EXTRA_LDFLAGS="$EXTRA_LDFLAGS -L$PROJECT_ROOT_PATH/lib/mp3lame-simd/lib -lmp3lame"
  else
    EXTRA_CFLAGS="$EXTRA_CFLAGS -I$PROJECT_ROOT_PATH/lib/mp3lame/include"
    EXTRA_LDFLAGS="$EXTRA_LDFLAGS -L$PROJECT_ROOT_PATH/lib/mp3lame/lib -lmp3lame"
  fi
elif [[ $encode == "vp8" ]]; then
  realEncoder="libvpx_vp8"
  EXTRACOMPONENTS="$EXTRACOMPONENTS --enable-libvpx"

  if [[ $simd == "1" ]]; then
    EXTRA_CFLAGS="$EXTRA_CFLAGS -I$PROJECT_ROOT_PATH/lib/libvpx-simd/include"
    EXTRA_LDFLAGS="$EXTRA_LDFLAGS -L$PROJECT_ROOT_PATH/lib/libvpx-simd/lib -lvpx"
  else
    EXTRA_CFLAGS="$EXTRA_CFLAGS -I$PROJECT_ROOT_PATH/lib/libvpx/include"
    EXTRA_LDFLAGS="$EXTRA_LDFLAGS -L$PROJECT_ROOT_PATH/lib/libvpx/lib -lvpx"
  fi
elif [[ $encode == "vp9" ]]; then
  realEncoder="libvpx_vp9"
  EXTRACOMPONENTS="$EXTRACOMPONENTS --enable-libvpx"

  if [[ $simd == "1" ]]; then
    EXTRA_CFLAGS="$EXTRA_CFLAGS -I$PROJECT_ROOT_PATH/lib/libvpx-simd/include"
    EXTRA_LDFLAGS="$EXTRA_LDFLAGS -L$PROJECT_ROOT_PATH/lib/libvpx-simd/lib -lvpx"
  else
    EXTRA_CFLAGS="$EXTRA_CFLAGS -I$PROJECT_ROOT_PATH/lib/libvpx/include"
    EXTRA_LDFLAGS="$EXTRA_LDFLAGS -L$PROJECT_ROOT_PATH/lib/libvpx/lib -lvpx"
  fi
elif [[ $encode == "virbos" ]]; then
  realEncoder="libvorbis"
  EXTRACOMPONENTS="$EXTRACOMPONENTS --enable-libvorbis"

  if [[ $simd == "1" ]]; then
    EXTRA_CFLAGS="$EXTRA_CFLAGS -I$PROJECT_ROOT_PATH/lib/vorbis-simd/include"
    EXTRA_LDFLAGS="$EXTRA_LDFLAGS -L$PROJECT_ROOT_PATH/lib/vorbis-simd/lib -lvorbisenc"
  else
    EXTRA_CFLAGS="$EXTRA_CFLAGS -I$PROJECT_ROOT_PATH/lib/vorbis/include"
    EXTRA_LDFLAGS="$EXTRA_LDFLAGS -L$PROJECT_ROOT_PATH/lib/vorbis/lib -lvorbisenc"
  fi
elif [[ $encode == "speex" ]]; then
  realEncoder="libspeex"
  EXTRACOMPONENTS="$EXTRACOMPONENTS --enable-libspeex"

  if [[ $simd == "1" ]]; then
    EXTRA_CFLAGS="$EXTRA_CFLAGS -I$PROJECT_ROOT_PATH/lib/speex-simd/include"
    EXTRA_LDFLAGS="$EXTRA_LDFLAGS -L$PROJECT_ROOT_PATH/lib/speex-simd/lib -lspeex"
  else
    EXTRA_CFLAGS="$EXTRA_CFLAGS -I$PROJECT_ROOT_PATH/lib/speex/include"
    EXTRA_LDFLAGS="$EXTRA_LDFLAGS -L$PROJECT_ROOT_PATH/lib/speex/lib -lspeex"
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
  --enable-encoder=$realEncoder \
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