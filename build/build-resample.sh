ENABLE_SIMD=$1
ENABLE_ATOMIC=$2

echo "===== start resample build====="

NOW_PATH=$(cd $(dirname $0); pwd)

PROJECT_ROOT_PATH=$(cd $NOW_PATH/../; pwd)

PROJECT_SRC_PATH=$PROJECT_ROOT_PATH/src

PROJECT_OUTPUT_PATH=$PROJECT_ROOT_PATH/dist/resample

FFMPEG_PATH=$PROJECT_ROOT_PATH/lib/ffmpeg
FFMPEG_AVUTIL_PATH=$FFMPEG_PATH/lib
FFMPEG_RESAMPLE_PATH=$FFMPEG_PATH/lib

CLIB_PATH=$PROJECT_SRC_PATH/audioresample/clib

source $PROJECT_ROOT_PATH/../emsdk/emsdk_env.sh

if ! [ -n "$1" ]; then
  ENABLE_SIMD=`sed '/^enable_simd=/!d;s/.*=//' $NOW_PATH/config`
fi
if ! [ -n "$2" ]; then
  ENABLE_ATOMIC=`sed '/^enable_atomic=/!d;s/.*=//' $NOW_PATH/config`
fi
ENABLE_DEBUG=`sed '/^enable_debug=/!d;s/.*=//' $NOW_PATH/config` 

FILE_NAME=resample

if [ $ENABLE_SIMD == "1" ]; then
  FILE_NAME=resample-simd
else
  if [ $ENABLE_ATOMIC == "1" ]; then
    FILE_NAME=resample-atomic
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

if [[ $ENABLE_SIMD == "1" ]]; then
  DIR_SUBFIX="$DIR_SUBFIX-simd"
  CFLAG="$CFLAG -msimd128 -mbulk-memory"
  FFMPEG_AVUTIL_PATH=$PROJECT_ROOT_PATH/lib/ffmpeg-simd/lib
  FFMPEG_RESAMPLE_PATH=$PROJECT_ROOT_PATH/lib/ffmpeg-simd/lib
else 
  if [ $ENABLE_ATOMIC == "1" ]; then
    DIR_SUBFIX="$DIR_SUBFIX-atomic"
    FFMPEG_AVUTIL_PATH=$PROJECT_ROOT_PATH/lib/ffmpeg-atomic/lib
    CFLAG="$CFLAG -mbulk-memory"
  else
    CFLAG="$CFLAG -mno-bulk-memory"
  fi
fi

emcc $CFLAG --no-entry -Wl,--no-check-features $CLIB_PATH/resample.c $FFMPEG_AVUTIL_PATH/libavutil.a $FFMPEG_RESAMPLE_PATH/libswresample.a \
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
  -o $PROJECT_OUTPUT_PATH/$FILE_NAME.wasm

echo "===== build resample finished  ====="
