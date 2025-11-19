import path from 'path'
import fs from 'fs'

const files: Record<string, string> = {
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
  common: path.resolve(__dirname, '../packages/common/package.json'),
  'avplayer-ui': path.resolve(__dirname, '../packages/ui/avplayer/package.json'),
  videoscale: path.resolve(__dirname, '../packages/videoscale/package.json')
}

const packages: Record<string, Record<string, any>> = {
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
  cheap: JSON.parse(fs.readFileSync(files['cheap'], 'utf8')),
  common: JSON.parse(fs.readFileSync(files['common'], 'utf8')),
  'avplayer-ui': JSON.parse(fs.readFileSync(files['avplayer-ui'], 'utf8')),
  videoscale: JSON.parse(fs.readFileSync(files['videoscale'], 'utf8'))
}

function update(name: string) {
  const file = files[name]
  const json = packages[name]
  if (json.dependencies) {
    const keys = Object.keys(json.dependencies)
    for (let i = 0; i < keys.length; i++) {
      if (/^@libmedia\/.*/.test(keys[i])) {
        const dependency = keys[i].replace('@libmedia/', '')
        let version = packages[dependency].version
        if (dependency === 'common'
          || dependency === 'cheap'
        ) {
          version = '~' + version
        }
        json.dependencies[keys[i]] = version
      }
    }
  }
  fs.writeFileSync(file, JSON.stringify(json, null, 2), 'utf8')
}

const keys = Object.keys(files)
for (let i = 0; i < keys.length; i++) {
  update(keys[i])
}
