const path = require('path')
const fs = require('fs')
const argv = require('yargs').argv

const files = {
  audioresample: path.resolve(__dirname, '../src/audioresample/package.json'),
  audiostretchpitch: path.resolve(__dirname, '../src/audiostretchpitch/package.json'),
  avcodec: path.resolve(__dirname, '../src/avcodec/package.json'),
  avfilter: path.resolve(__dirname, '../src/avfilter/package.json'),
  avformat: path.resolve(__dirname, '../src/avformat/package.json'),
  avnetwork: path.resolve(__dirname, '../src/avnetwork/package.json'),
  avpipeline: path.resolve(__dirname, '../src/avpipeline/package.json'),
  avplayer: path.resolve(__dirname, '../src/avplayer/package.json'),
  avprotocol: path.resolve(__dirname, '../src/avprotocol/package.json'),
  avrender: path.resolve(__dirname, '../src/avrender/package.json'),
  avtranscoder: path.resolve(__dirname, '../src/avtranscoder/package.json'),
  avutil: path.resolve(__dirname, '../src/avutil/package.json'),
  cheap: path.resolve(__dirname, '../src/cheap/package.json'),
  'avplayer-ui': path.resolve(__dirname, '../src/ui/avplayer/package.json'),
  videoscale: path.resolve(__dirname, '../src/videoscale/package.json')
}

const json = JSON.parse(fs.readFileSync(files[argv.package], 'utf8'))

if (json.dependencies) {
  const keys = Object.keys(json.dependencies)
  for (let i = 0; i < keys.length; i++) {
    if (/^workspace:\*$/.test(json.dependencies[keys[i]])) {
      console.error(`dependencies ${keys[i]} not set real version`)
      process.exit(1)
    }
  }
}
process.exit(0)
