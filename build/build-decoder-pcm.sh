decode=pcm
ENABLE_SIMD=$1
ENABLE_ATOMIC=$2

echo "===== start decoder $decode build====="

NOW_PATH=$(cd $(dirname $0); pwd)

PROJECT_ROOT_PATH=$(cd $NOW_PATH/../; pwd)

PROJECT_SRC_PATH=$PROJECT_ROOT_PATH/src

PROJECT_OUTPUT_PATH=$PROJECT_ROOT_PATH/dist/decode

FFMPEG_PATH=$PROJECT_ROOT_PATH/lib/ffmpeg
FFMPEG_AVUTIL_PATH=$FFMPEG_PATH/lib
FFMPEG_DECODE_PATH=$PROJECT_ROOT_PATH/lib/decode

CLIB_PATH=$PROJECT_SRC_PATH/avcodec/clib

INCLUDE_PATH=$PROJECT_ROOT_PATH/dist/include

source $PROJECT_ROOT_PATH/../emsdk/emsdk_env.sh

if ! [ -n "$2" ]; then
  ENABLE_SIMD=`sed '/^enable_simd=/!d;s/.*=//' $NOW_PATH/config`
fi
if ! [ -n "$3" ]; then
  ENABLE_ATOMIC=`sed '/^enable_atomic=/!d;s/.*=//' $NOW_PATH/config`
fi
ENABLE_DEBUG=`sed '/^enable_debug=/!d;s/.*=//' $NOW_PATH/config` 

echo $ENABLE_SIMD
echo $ENABLE_ATOMIC
echo $INCLUDE_PATH

FILE_NAME=$decode

if [ $ENABLE_SIMD == "1" ]; then
  FILE_NAME=$decode-simd
else
  if [ $ENABLE_ATOMIC == "1" ]; then
    FILE_NAME=$decode-atomic
  fi
fi

if [ ! -d $PROJECT_OUTPUT_PATH ]; then
  mkdir $PROJECT_OUTPUT_PATH
fi

if [ ! -d $INCLUDE_PATH ]; then
  mkdir $INCLUDE_PATH
fi

rm $PROJECT_OUTPUT_PATH/$FILE_NAME.js
rm $PROJECT_OUTPUT_PATH/$FILE_NAME.wasm
rm $PROJECT_OUTPUT_PATH/$FILE_NAME.debug.wasm
rm $INCLUDE_PATH/config.h

# 写入 config.h 配置
sh $NOW_PATH/config.sh $INCLUDE_PATH

CFLAG="-O3"
EMCCFLAG=""
DIR_SUBFIX=""

if [ $ENABLE_DEBUG == "1" ]; then
  CFLAG="$CFLAG -g"
  echo "#define ENABLE_FFMPEG_LOG_LEVEL 1" >> $INCLUDE_PATH/config.h
fi

if [[ $ENABLE_SIMD == "1" ]]; then
  DIR_SUBFIX="$DIR_SUBFIX-simd"
  CFLAG="$CFLAG -msimd128 -mbulk-memory"
  FFMPEG_AVUTIL_PATH=$PROJECT_ROOT_PATH/lib/ffmpeg-simd/lib
else 
  if [ $ENABLE_ATOMIC == "1" ]; then
    DIR_SUBFIX="$DIR_SUBFIX-atomic"
    FFMPEG_AVUTIL_PATH=$PROJECT_ROOT_PATH/lib/ffmpeg-atomic/lib
    CFLAG="$CFLAG -mbulk-memory"
  else
    CFLAG="$CFLAG -mno-bulk-memory"
  fi
fi

emcc $CFLAG --no-entry -Wl,--no-check-features $CLIB_PATH/decode.c $CLIB_PATH/logger/log.c \
  $FFMPEG_AVUTIL_PATH/libavutil.a $FFMPEG_AVUTIL_PATH/libswresample.a $FFMPEG_DECODE_PATH/$decode$DIR_SUBFIX/libavcodec.a \
  -I "$FFMPEG_PATH/include" \
  -I "$PROJECT_ROOT_PATH/src/cheap/include" \
  -I "$INCLUDE_PATH" \
  -s WASM=1 \
  -s FILESYSTEM=0 \
  -s FETCH=0 \
  -s ASSERTIONS=0 \
  -s ALLOW_MEMORY_GROWTH=1 \
  -s IMPORTED_MEMORY=1 \
  -s INITIAL_MEMORY=17367040 \
  -s USE_PTHREADS=0 \
  -s MAIN_MODULE=2 \
  -s SIDE_MODULE=0 \
  -s MALLOC="none" \
  -s ERROR_ON_UNDEFINED_SYMBOLS=0 \
  $EMCCFLAG \
  -o $PROJECT_OUTPUT_PATH/$FILE_NAME.wasm


echo "===== build decoder $decode finished  ====="
