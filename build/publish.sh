NOW_PATH=$(cd $(dirname $0); pwd)

PROJECT_ROOT_PATH=$(cd $NOW_PATH/../; pwd)

node $NOW_PATH/update-dependencies.js

cd $PROJECT_ROOT_PATH/src/common
npm publish

cd $PROJECT_ROOT_PATH/src/cheap
npm publish

cd $PROJECT_ROOT_PATH/src/audioresample
npm publish

cd $PROJECT_ROOT_PATH/src/audiostretchpitch
npm publish

cd $PROJECT_ROOT_PATH/src/avcodec
npm publish

cd $PROJECT_ROOT_PATH/src/avfilter
npm publish

cd $PROJECT_ROOT_PATH/src/avformat
npm publish

cd $PROJECT_ROOT_PATH/src/avnetwork
npm publish

cd $PROJECT_ROOT_PATH/src/avpipeline
npm publish

cd $PROJECT_ROOT_PATH/src/avplayer
npm publish

cd $PROJECT_ROOT_PATH/src/avprotocol
npm publish

cd $PROJECT_ROOT_PATH/src/avrender
npm publish

cd $PROJECT_ROOT_PATH/src/avtranscoder
npm publish

cd $PROJECT_ROOT_PATH/src/avutil
npm publish

cd $PROJECT_ROOT_PATH/src/videoscale
npm publish

cd $PROJECT_ROOT_PATH/src/ui/avplayer
npm publish

cd $PROJECT_ROOT_PATH
git checkout -- .

cd $PROJECT_ROOT_PATH/src/cheap
git checkout -- .
