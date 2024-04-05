decode="speex"
ENABLE_SIMD=$1
ENABLE_ATOMIC=$2

echo "===== start decoder $decode build====="

NOW_PATH=$(cd $(dirname $0); pwd)

PROJECT_ROOT_PATH=$(cd $NOW_PATH/../; pwd)

PROJECT_SRC_PATH=$PROJECT_ROOT_PATH/src

SPEEX_PATH=$(cd $PROJECT_ROOT_PATH/../speex; pwd)

PROJECT_OUTPUT_PATH=$PROJECT_ROOT_PATH/dist/decode

FFMPEG_PATH=$PROJECT_ROOT_PATH/lib/ffmpeg
FFMPEG_AVUTIL_PATH=$FFMPEG_PATH/lib
FFMPEG_RESAMPLE_PATH=$FFMPEG_PATH/lib
FFMPEG_DECODE_PATH=$PROJECT_ROOT_PATH/lib/decode

CLIB_PATH=$PROJECT_SRC_PATH/avcodec/clib
INCLUDE_PATH=$PROJECT_ROOT_PATH/dist/include

source $PROJECT_ROOT_PATH/../emsdk/emsdk_env.sh

if ! [ -n "$1" ]; then
  ENABLE_SIMD=`sed '/^enable_simd=/!d;s/.*=//' $NOW_PATH/config`
fi
if ! [ -n "$2" ]; then
  ENABLE_ATOMIC=`sed '/^enable_atomic=/!d;s/.*=//' $NOW_PATH/config`
fi
ENABLE_DEBUG=`sed '/^enable_debug=/!d;s/.*=//' $NOW_PATH/config` 

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
echo "#define CODEC_ID AV_CODEC_ID_SPEEX" >> $INCLUDE_PATH/config.h

CFLAG="-O3"
EMCCFLAG=""
DIR_SUBFIX=""

if [ $ENABLE_DEBUG == "1" ]; then
  CFLAG="$CFLAG -g"
  echo "#define ENABLE_FFMPEG_LOG_LEVEL 1" >> $CLIB_PATH/config.h
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
  $FFMPEG_AVUTIL_PATH/libavutil.a $FFMPEG_RESAMPLE_PATH/libswresample.a $FFMPEG_DECODE_PATH/$decode$DIR_SUBFIX/libavcodec.a --js-library $PROJECT_ROOT_PATH/dist/jsLib.js \
  $SPEEX_PATH/libspeex/bits.c \
  $SPEEX_PATH/libspeex/speex.c \
  $SPEEX_PATH/libspeex/speex_header.c \
  $SPEEX_PATH/libspeex/modes_wb.c \
  $SPEEX_PATH/libspeex/stereo.c \
  $SPEEX_PATH/libspeex/hexc_10_32_table.c \
  $SPEEX_PATH/libspeex/hexc_table.c \
  $SPEEX_PATH/libspeex/quant_lsp.c \
  $SPEEX_PATH/libspeex/sb_celp.c \
  $SPEEX_PATH/libspeex/cb_search.c \
  $SPEEX_PATH/libspeex/modes.c \
  $SPEEX_PATH/libspeex/vbr.c \
  $SPEEX_PATH/libspeex/speex_callbacks.c \
  $SPEEX_PATH/libspeex/vq.c \
  $SPEEX_PATH/libspeex/filters.c \
  $SPEEX_PATH/libspeex/lsp_tables_nb.c \
  $SPEEX_PATH/libspeex/gain_table.c \
  $SPEEX_PATH/libspeex/gain_table_lbr.c \
  $SPEEX_PATH/libspeex/high_lsp_tables.c \
  $SPEEX_PATH/libspeex/kiss_fft.c \
  $SPEEX_PATH/libspeex/kiss_fftr.c \
  $SPEEX_PATH/libspeex/lpc.c \
  $SPEEX_PATH/libspeex/lsp.c \
  $SPEEX_PATH/libspeex/ltp.c \
  $SPEEX_PATH/libspeex/nb_celp.c \
  $SPEEX_PATH/libspeex/smallft.c \
  $SPEEX_PATH/libspeex/vorbis_psy.c \
  $SPEEX_PATH/libspeex/exc_5_64_table.c \
  $SPEEX_PATH/libspeex/exc_5_256_table.c \
  $SPEEX_PATH/libspeex/exc_8_128_table.c \
  $SPEEX_PATH/libspeex/exc_10_16_table.c \
  $SPEEX_PATH/libspeex/exc_10_32_table.c \
  $SPEEX_PATH/libspeex/exc_20_32_table.c \
  $SPEEX_PATH/libspeex/window.c \
  -I "$FFMPEG_PATH/include" \
  -I "$PROJECT_ROOT_PATH/src/cheap/include" \
  -I "$SPEEX_PATH/include" \
  -I "$INCLUDE_PATH" \
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


echo "===== build decoder $decode finished  ====="
