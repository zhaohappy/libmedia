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
  'avplayer-ui': path.resolve(__dirname, '../src/ui/avplayer/package.json'),
  videoscale: path.resolve(__dirname, '../src/videoscale/package.json')
}

const packages = {
  audioresample: JSON.parse(fs.readFileSync(files['audioresample'], 'utf8')),
  audiostretchpitch: JSON.parse(fs.readFileSync(files['audiostretchpitch'], 'utf8')),
  avcodec: JSON.parse(fs.readFileSync(files['avcodec'], 'utf8')),
  avfilter: JSON.parse(fs.readFileSync(files['avfilter'], 'utf8')),
  avformat: JSON.parse(fs.readFileSync(files['avformat'], 'utf8')),
  avnetwork: JSON.parse(fs.readFileSync(files['avnetwork'], 'utf8')),
  avpipeline: JSON.parse(fs.readFileSync(files['avpipeline'], 'utf8')),
  avplayer: JSON.parse(fs.readFileSync(files['avplayer'], 'utf8')),
  avprotocol: JSON.parse(fs.readFileSync(files['avprotocol'], 'utf8')),
  avrender: JSON.parse(fs.readFileSync(files['avrender'], 'utf8')),
  avtranscoder: JSON.parse(fs.readFileSync(files['avtranscoder'], 'utf8')),
  avutil: JSON.parse(fs.readFileSync(files['avutil'], 'utf8')),
  'avplayer-ui': JSON.parse(fs.readFileSync(files['avplayer-ui'], 'utf8')),
  videoscale: JSON.parse(fs.readFileSync(files['videoscale'], 'utf8')),
}

function update(name) {
  const file = files[name]
  const json = packages[name]
  if (argv.pubVersion) {
    json.version = argv.pubVersion
  }
  else if (argv.feature) {
    const list = json.version.split('.')
    list[1] = (+list[1] + 1) + ''
    list[2] = '0'
    json.version = list.join('.')
  }
  else {
    const list = json.version.split('.')
    list[2] = (+list[2] + 1) + ''
    json.version = list.join('.')
  }
  fs.writeFileSync(file, JSON.stringify(json, null, 2), 'utf8')
}

const keys = Object.keys(files)
for (let i = 0; i < keys.length; i++) {
  update(keys[i])
}
