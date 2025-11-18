const path = require('path')
const fs = require('fs')
const argv = require('yargs').argv

const files = {
  audioresample: path.resolve(__dirname, '../packages/audioresample/package.json'),
  audiostretchpitch: path.resolve(__dirname, '../packages/audiostretchpitch/package.json'),
  avcodec: path.resolve(__dirname, '../packages/avcodec/package.json'),
  avfilter: path.resolve(__dirname, '../packages/avfilter/package.json'),
  avformat: path.resolve(__dirname, '../packages/avformat/package.json'),
  avnetwork: path.resolve(__dirname, '../packages/avnetwork/package.json'),
  avpipeline: path.resolve(__dirname, '../packages/avpipeline/package.json'),
  avplayer: path.resolve(__dirname, '../packages/avplayer/package.json'),
  avprotocol: path.resolve(__dirname, '../packages/avprotocol/package.json'),
  avrender: path.resolve(__dirname, '../packages/avrender/package.json'),
  avtranscoder: path.resolve(__dirname, '../packages/avtranscoder/package.json'),
  avutil: path.resolve(__dirname, '../packages/avutil/package.json'),
  cheap: path.resolve(__dirname, '../packages/cheap/package.json'),
  'avplayer-ui': path.resolve(__dirname, '../packages/ui/avplayer/package.json'),
  videoscale: path.resolve(__dirname, '../packages/videoscale/package.json')
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
