#!/bin/bash

simd=$1
atomic=$2
wasm64=$3

NOW_PATH=$(cd $(dirname $0); pwd)

PROJECT_ROOT_PATH=$(cd $NOW_PATH/../; pwd)

DAV1D_PATH=$(cd $PROJECT_ROOT_PATH/../dav1d; pwd)

LIB_OUTPUT_PATH=$PROJECT_ROOT_PATH/lib/dav1d
LIB_BUILD_PATH=$PROJECT_ROOT_PATH/dist/libdav1d
OPTIONS="-Denable_asm=false -Denable_wasm_atomic=true"

if [[ $wasm64 == "1" ]]; then
  LIB_OUTPUT_PATH="$LIB_OUTPUT_PATH-64"
  LIB_BUILD_PATH="$LIB_BUILD_PATH-64"
  OPTIONS="-Denable_asm=false -Denable_wasm_atomic=false -Denable_wasm_simd=true"
else
  if [[ $simd == "1" ]]; then
    LIB_OUTPUT_PATH="$LIB_OUTPUT_PATH-simd"
    LIB_BUILD_PATH="$LIB_BUILD_PATH-simd"
    OPTIONS="-Denable_asm=false -Denable_wasm_atomic=false -Denable_wasm_simd=true"
  else
    if [[ $atomic == "1" ]]; then
      LIB_OUTPUT_PATH="$LIB_OUTPUT_PATH-atomic"
      LIB_BUILD_PATH="$LIB_BUILD_PATH-atomic"
      OPTIONS="-Denable_asm=false -Denable_wasm_atomic=false"
    fi
  fi
fi

source $PROJECT_ROOT_PATH/../emsdk/emsdk_env.sh

meson $DAV1D_PATH $LIB_BUILD_PATH \
  --prefix="$LIB_OUTPUT_PATH" \
  --cross-file=$NOW_PATH/meson-cross-file.txt \
  --default-library=static \
  --buildtype=release \
  -Dbitdepths="['8', '16']" \
  -Denable_tools=false \
  -Dlogging=false \
  -Denable_tests=false \
  -Denable_docs=false \
  $OPTIONS \
&& ninja -C $LIB_BUILD_PATH install