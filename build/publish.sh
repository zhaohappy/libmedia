#!/bin/bash

NOW_PATH=$(cd $(dirname $0); pwd)

PROJECT_ROOT_PATH=$(cd $NOW_PATH/../; pwd)

node $PROJECT_ROOT_PATH/scripts/update-dependencies.js

cd $PROJECT_ROOT_PATH/packages/common
npm publish --access=public

cd $PROJECT_ROOT_PATH/packages/cheap
npm publish --access=public

cd $PROJECT_ROOT_PATH/packages/audioresample
npm publish --access=public

cd $PROJECT_ROOT_PATH/packages/audiostretchpitch
npm publish --access=public

cd $PROJECT_ROOT_PATH/packages/avcodec
npm publish --access=public

cd $PROJECT_ROOT_PATH/packages/avfilter
npm publish --access=public

cd $PROJECT_ROOT_PATH/packages/avformat
npm publish --access=public

cd $PROJECT_ROOT_PATH/packages/avnetwork
npm publish --access=public

cd $PROJECT_ROOT_PATH/packages/avpipeline
npm publish --access=public

cd $PROJECT_ROOT_PATH/packages/avplayer
npm publish --access=public

cd $PROJECT_ROOT_PATH/packages/avprotocol
npm publish --access=public

cd $PROJECT_ROOT_PATH/packages/avrender
npm publish --access=public

cd $PROJECT_ROOT_PATH/packages/avtranscoder
npm publish --access=public

cd $PROJECT_ROOT_PATH/packages/avutil
npm publish --access=public

cd $PROJECT_ROOT_PATH/packages/videoscale
npm publish --access=public

cd $PROJECT_ROOT_PATH/packages/ui/avplayer
npm publish --access=public

cd $PROJECT_ROOT_PATH
git checkout -- .

cd $PROJECT_ROOT_PATH/packages/cheap
git checkout -- .
