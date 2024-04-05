encode=$1
simd=$2

echo "===== start build ffmpeg encoder $encode ====="

NOW_PATH=$(cd $(dirname $0); pwd)

PROJECT_ROOT_PATH=$(cd $NOW_PATH/../; pwd)

FFMPEG_PATH=$(cd $PROJECT_ROOT_PATH/../FFmpeg; pwd)

source $PROJECT_ROOT_PATH/../emsdk/emsdk_env.sh

DIRNAME=$PROJECT_ROOT_PATH/lib/encode/$encode

if [[ $simd == "1" ]]; then
  DIRNAME="$DIRNAME-simd"
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
COMPONENTS="--disable-websimd128"

if [[ $simd == "1" ]]; then
  COMPONENTS="--enable-websimd128"
  EXTRA_CFLAGS="-msimd128 $EXTRA_CFLAGS"
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
  --disable-logging \
  --disable-programs \
  --disable-ffmpeg \
  --disable-ffplay \
  --disable-ffprobe \
  --disable-doc \
  --disable-postproc  \
  --disable-avfilter \
  --disable-pthreads \
  --disable-w32threads \
  --disable-os2threads \
  --enable-webpthreads \
  --disable-network \
  --disable-protocols \
  --disable-devices \
  --disable-runtime-cpudetect \
  --disable-filters \
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
  --enable-encoder=$encode \
  --extra-cflags="$EXTRA_CFLAGS" \
  $COMPONENTS \
  $CFLAG

emmake make

emmake make install

emmake make clean

mv $PROJECT_ROOT_PATH/ffmpeg-cache/lib/libavcodec.a $DIRNAME

echo "===== build ffmpeg encoder $encode finished  ====="