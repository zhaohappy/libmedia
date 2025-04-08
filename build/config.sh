#!/bin/bash

path=$1

NOW_PATH=$(cd $(dirname $0); pwd)

PROJECT_ROOT_PATH=$(cd $NOW_PATH/../; pwd)

# 写入 config.h 配置
echo "#include <libavcodec/avcodec.h>" > $path/config.h

echo "" >> $path/config.h

echo "#define ENABLE_FFMPEG_LOG_LEVEL 0" >> $path/config.h
echo "#define ENABLE_DEBUG 0" >> $path/config.h