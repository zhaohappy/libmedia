encode=$1
ENABLE_SIMD=$2
ENABLE_ATOMIC=$3

echo "===== start encoder $encode build====="

NOW_PATH=$(cd $(dirname $0); pwd)

PROJECT_ROOT_PATH=$(cd $NOW_PATH/../; pwd)

PROJECT_SRC_PATH=$PROJECT_ROOT_PATH/src

PROJECT_OUTPUT_PATH=$PROJECT_ROOT_PATH/dist/encode

FFMPEG_PATH=$PROJECT_ROOT_PATH/lib/ffmpeg
FFMPEG_ENCODE_PATH=$PROJECT_ROOT_PATH/lib/encode

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

FILE_NAME=$encode
DIR_SUBFIX=""

if [ $ENABLE_SIMD == "1" ]; then
  FILE_NAME=$encode-simd
else
  if [ $ENABLE_ATOMIC == "1" ]; then
    FILE_NAME=$encode-atomic
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

ENCODER_LIB=""

# 写入 config.h 配置
sh $NOW_PATH/config.sh $INCLUDE_PATH
if [ $encode == "x264" ]; then
  echo "#define MEDIA_TYPE_VIDEO 1" >> $INCLUDE_PATH/config.h
  if [ $ENABLE_SIMD == "1" ]; then
    ENCODER_LIB="$PROJECT_ROOT_PATH/lib/x264-simd/lib/libx264.a"
  else
    if [ $ENABLE_ATOMIC == "1" ]; then
      ENCODER_LIB="$PROJECT_ROOT_PATH/lib/x264-atomic/lib/libx264.a"
    else
      ENCODER_LIB="$PROJECT_ROOT_PATH/lib/x264/lib/libx264.a"
    fi
  fi
elif [ $encode == "x265" ]; then
  echo "#define MEDIA_TYPE_VIDEO 1" >> $INCLUDE_PATH/config.h
  if [ $ENABLE_SIMD == "1" ]; then
    ENCODER_LIB="$PROJECT_ROOT_PATH/lib/x265-simd/lib/libx265.a"
  else
    if [ $ENABLE_ATOMIC == "1" ]; then
      ENCODER_LIB="$PROJECT_ROOT_PATH/lib/x265-atomic/lib/libx265.a"
    else
      ENCODER_LIB="$PROJECT_ROOT_PATH/lib/x265/lib/libx265.a"
    fi
  fi
elif [ $encode == "kvazaar" ]; then
  echo "#define MEDIA_TYPE_VIDEO 1" >> $INCLUDE_PATH/config.h
  if [ $ENABLE_SIMD == "1" ]; then
    ENCODER_LIB="$PROJECT_ROOT_PATH/lib/kvazaar-simd/lib/libkvazaar.a"
  else
    if [ $ENABLE_ATOMIC == "1" ]; then
      ENCODER_LIB="$PROJECT_ROOT_PATH/lib/kvazaar-atomic/lib/libkvazaar.a"
    else
      ENCODER_LIB="$PROJECT_ROOT_PATH/lib/kvazaar/lib/libkvazaar.a"
    fi
  fi
elif [ $encode == "vp8" ]; then
  echo "#define MEDIA_TYPE_VIDEO 1" >> $INCLUDE_PATH/config.h
  if [ $ENABLE_SIMD == "1" ]; then
    ENCODER_LIB="$PROJECT_ROOT_PATH/lib/libvpx-simd/lib/libvpx.a"
  else
    if [ $ENABLE_ATOMIC == "1" ]; then
      ENCODER_LIB="$PROJECT_ROOT_PATH/lib/libvpx-atomic/lib/libvpx.a"
    else
      ENCODER_LIB="$PROJECT_ROOT_PATH/lib/libvpx/lib/libvpx.a"
    fi
  fi
elif [ $encode == "vp9" ]; then
  echo "#define MEDIA_TYPE_VIDEO 1" >> $INCLUDE_PATH/config.h
  if [ $ENABLE_SIMD == "1" ]; then
    ENCODER_LIB="$PROJECT_ROOT_PATH/lib/libvpx-simd/lib/libvpx.a"
  else
    if [ $ENABLE_ATOMIC == "1" ]; then
      ENCODER_LIB="$PROJECT_ROOT_PATH/lib/libvpx-atomic/lib/libvpx.a"
    else
      ENCODER_LIB="$PROJECT_ROOT_PATH/lib/libvpx/lib/libvpx.a"
    fi
  fi
elif [ $encode == "mpeg4" ]; then
  echo "#define MEDIA_TYPE_VIDEO 1" >> $INCLUDE_PATH/config.h
elif [ $encode == "aac" ]; then
  echo "#define MEDIA_TYPE_AUDIO 1" >> $INCLUDE_PATH/config.h
elif [ $encode == "mp3lame" ]; then
  echo "#define MEDIA_TYPE_AUDIO 1" >> $INCLUDE_PATH/config.h
  if [ $ENABLE_SIMD == "1" ]; then
    ENCODER_LIB="$PROJECT_ROOT_PATH/lib/mp3lame-simd/lib/libmp3lame.a"
  else
    if [ $ENABLE_ATOMIC == "1" ]; then
      ENCODER_LIB="$PROJECT_ROOT_PATH/lib/mp3lame-atomic/lib/libmp3lame.a"
    else
      ENCODER_LIB="$PROJECT_ROOT_PATH/lib/mp3lame/lib/libmp3lame.a"
    fi
  fi
elif [ $encode == "speex" ]; then
  echo "#define MEDIA_TYPE_AUDIO 1" >> $INCLUDE_PATH/config.h
  if [ $ENABLE_SIMD == "1" ]; then
    ENCODER_LIB="$PROJECT_ROOT_PATH/lib/speex-simd/lib/libspeex.a"
  else
    if [ $ENABLE_ATOMIC == "1" ]; then
      ENCODER_LIB="$PROJECT_ROOT_PATH/lib/speex-atomic/lib/libspeex.a"
    else
      ENCODER_LIB="$PROJECT_ROOT_PATH/lib/speex/lib/libspeex.a"
    fi
  fi
elif [ $encode == "pcm" ]; then
  echo "#define MEDIA_TYPE_AUDIO 1" >> $INCLUDE_PATH/config.h
fi

CFLAG="-O3"
EMCCFLAG=""
if [ $ENABLE_DEBUG == "1" ]; then
  CFLAG="$CFLAG -g"
  echo "#define ENABLE_FFMPEG_LOG_LEVEL 1" >> $INCLUDE_PATH/config.h
fi

if [[ $ENABLE_SIMD == "1" ]]; then
  DIR_SUBFIX="$DIR_SUBFIX-simd"
  CFLAG="$CFLAG -msimd128 -fvectorize -fslp-vectorize -mbulk-memory"
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

emcc $CFLAG $CLIB_PATH/encode.c $CLIB_PATH/logger/log.c \
  $FFMPEG_AVUTIL_PATH/libavutil.a $FFMPEG_ENCODE_PATH/$encode$DIR_SUBFIX/libavcodec.a $ENCODER_LIB --no-entry \
  --js-library $PROJECT_ROOT_PATH/dist/jsLib.js  \
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


echo "===== build encoder $encode finished  ====="
