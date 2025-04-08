#!/bin/bash

NOW_PATH=$(cd $(dirname $0); pwd)

PROJECT_ROOT_PATH=$(cd $NOW_PATH/../; pwd)

node $PROJECT_ROOT_PATH/scripts/update-dependencies.js

cd $PROJECT_ROOT_PATH/src/common
npm publish --access=public

cd $PROJECT_ROOT_PATH/src/cheap
npm publish --access=public

cd $PROJECT_ROOT_PATH/src/audioresample
npm publish --access=public

cd $PROJECT_ROOT_PATH/src/audiostretchpitch
npm publish --access=public

cd $PROJECT_ROOT_PATH/src/avcodec
npm publish --access=public

cd $PROJECT_ROOT_PATH/src/avfilter
npm publish --access=public

cd $PROJECT_ROOT_PATH/src/avformat
npm publish --access=public

cd $PROJECT_ROOT_PATH/src/avnetwork
npm publish --access=public

cd $PROJECT_ROOT_PATH/src/avpipeline
npm publish --access=public

cd $PROJECT_ROOT_PATH/src/avplayer
npm publish --access=public

cd $PROJECT_ROOT_PATH/src/avprotocol
npm publish --access=public

cd $PROJECT_ROOT_PATH/src/avrender
npm publish --access=public

cd $PROJECT_ROOT_PATH/src/avtranscoder
npm publish --access=public

cd $PROJECT_ROOT_PATH/src/avutil
npm publish --access=public

cd $PROJECT_ROOT_PATH/src/videoscale
npm publish --access=public

cd $PROJECT_ROOT_PATH/src/ui/avplayer
npm publish --access=public

cd $PROJECT_ROOT_PATH
git checkout -- .

cd $PROJECT_ROOT_PATH/src/cheap
git checkout -- .
