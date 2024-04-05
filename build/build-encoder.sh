encode=$1

echo "===== start encoder $encode build====="

NOW_PATH=$(cd $(dirname $0); pwd)

PROJECT_ROOT_PATH=$(cd $NOW_PATH/../; pwd)

PROJECT_SRC_PATH=$PROJECT_ROOT_PATH/src

PROJECT_OUTPUT_PATH=$PROJECT_ROOT_PATH/dist/encode

FFMPEG_PATH=$PROJECT_ROOT_PATH/lib/ffmpeg
FFMPEG_DECODE_PATH=$PROJECT_ROOT_PATH/lib/encode

CLIB_PATH=$PROJECT_SRC_PATH/avcodec/clib
INCLUDE_PATH=$PROJECT_ROOT_PATH/dist/include

source $PROJECT_ROOT_PATH/../emsdk/emsdk_env.sh

FILE_NAME=encode-$encode

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
if [ $encode == "h264" ]; then
  echo "#define CODEC_ID AV_CODEC_ID_H264" >> $INCLUDE_PATH/config.h
elif [ $encode == "hevc" ]; then
  echo "#define CODEC_ID AV_CODEC_ID_HEVC" >> $INCLUDE_PATH/config.h
elif [ $encode == "vp8" ]; then
  echo "#define CODEC_ID AV_CODEC_ID_VP8" >> $INCLUDE_PATH/config.h
elif [ $encode == "vp9" ]; then
  echo "#define CODEC_ID AV_CODEC_ID_VP9" >> $INCLUDE_PATH/config.h
elif [ $encode == "mpeg4" ]; then
  echo "#define CODEC_ID AV_CODEC_ID_MPEG4" >> $INCLUDE_PATH/config.h
elif [ $encode == "aac" ]; then
  echo "#define CODEC_ID AV_CODEC_ID_AAC" >> $INCLUDE_PATH/config.h
elif [ $encode == "mp3" ]; then
  echo "#define CODEC_ID AV_CODEC_ID_MP3" >> $INCLUDE_PATH/config.h
fi

CFLAG=""
EMCCFLAG=""
ENABLE_DEBUG=`sed '/^enable_debug=/!d;s/.*=//' $NOW_PATH/config` 
if [ $ENABLE_DEBUG == "1" ]; then
  CFLAG="$CFLAG -g"
  echo "#define ENABLE_FFMPEG_LOG_LEVEL 1" >> $INCLUDE_PATH/config.h
fi

emcc $CFLAG $CLIB_PATH/encode.c $CLIB_PATH/logger/log.c \
  $FFMPEG_PATH/lib/libavutil.a $FFMPEG_DECODE_PATH/$encode/libavcodec.a --js-library $PROJECT_ROOT_PATH/dist/build.js \
  -I "$FFMPEG_PATH/include" \
  -I "$PROJECT_ROOT_PATH/src/cheap/include" \
  -I "$INCLUDE_PATH" \
  -s WASM=1 \
  -s FILESYSTEM=0 \
  -s FETCH=0 \
  -s ASSERTIONS=0 \
  -s ALLOW_MEMORY_GROWTH=1 \
  -s IMPORTED_MEMORY=1 \
  -s USE_PTHREADS=0 \
  -s MAIN_MODULE=2 \
  -s MALLOC="none" \
  $EMCCFLAG \
  -o $PROJECT_OUTPUT_PATH/$FILE_NAME.js


echo "===== build encoder $encode finished  ====="
