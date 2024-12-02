import { ComponentOptions } from 'yox'
import AVPlayer, { AVPlayerStatus } from 'avplayer/AVPlayer'
import * as eventType from 'avplayer/eventType'

import template from './SubtitleTrack.hbs'
import style from './SubtitleTrack.styl'
import { AVStreamInterface } from 'avutil/AVStream'
import { AVMediaType } from 'avutil/codec'
import { IOLoaderSubtitleStreamInfo } from 'avnetwork/ioLoader/IOLoader'
import { subtitleExt } from '../../folder/Node'

const SubtitleTrack: ComponentOptions = {

  name: 'SubtitleTrack',

  template,

  propTypes: {
    player: {
      type: 'object',
      required: true
    },
    language: {
      type: 'object',
      required: true
    }
  },

  data: function () {
    return {
      streams: [],
      subtitleInfo: null,
      selectIndex: 0,
      style,
      accept: subtitleExt.map((i) => '.' + i).join(', '),
      // @ts-ignore
      canUseFilePicker: typeof showOpenFilePicker === 'function'
    }
  },

  computed: {
    list: function () {
      const player = this.get('player') as AVPlayer
      const stream: AVStreamInterface[] = this.get('streams')
      const subtitleInfo: IOLoaderSubtitleStreamInfo = this.get('subtitleInfo')
      if (subtitleInfo) {
        if (subtitleInfo.list.length) {
          const list = subtitleInfo.list
            .map((item, index) => {
              return {
                value: index,
                name: item.lang,
                codecs: item.codecs
              }
            })
          return list
        }
      }
      else {
        return stream.map((item, index) => {
          if (item.id === player.getSelectedSubtitleStreamId()) {
            this.set('selectIndex', index)
          }
          return {
            value: item.id,
            name: item.metadata['title'] || item.metadata['languageString'] || item.metadata['language'] || item.metadata['name'] || 'default'
          }
        })
      }
      return []
    }
  },

  methods: {
    change: function (index: number) {
      const old = this.get('selectIndex')
      if (old !== index) {
        const player = this.get('player') as AVPlayer
        player.selectSubtitle(this.get('list')[index].value).then(() => {
          this.set('selectIndex', index)
        })
      }
    },

    openFile() {
      const pickerOpts = {
        startIn: 'videos',
        types: [
          {
            description: 'Subtitles',
            accept: {
              'application/octet-stream': subtitleExt.map((ext) => {
                return '.' + ext
              })
            },
          }
        ],
        excludeAcceptAllOption: true,
        multiple: true
      }
      const player = this.get('player') as AVPlayer
      // @ts-ignore
      showOpenFilePicker(pickerOpts).then(async (fileHandles: FileHandle[]) => {
        for (let i = 0; i < fileHandles.length; i++) {
          const file: File = await fileHandles[i].getFile()
          const nameList = file.name.split('.')
          nameList.pop()
          player.loadExternalSubtitle({
            title: nameList.join('.'),
            source: file
          })
        }
      })
    },

    fileChange(event) {
      const file: File = event.originalEvent.target.files[0]
      const player = this.get('player') as AVPlayer
      const nameList = file.name.split('.')
      nameList.pop()
      player.loadExternalSubtitle({
        title: nameList.join('.'),
        source: file
      })
    },

    init: function (player: AVPlayer) {
      if (player.isDash() || player.isHls()) {
        player.getSubtitleList().then((info) => {
          this.set('subtitleInfo', info)
          this.set('selectIndex', info.selectedIndex)
        })
      }
      else {
        this.set('streams', player.getStreams().filter((stream) => stream.codecpar.codecType === AVMediaType.AVMEDIA_TYPE_SUBTITLE))
      }
    }
  },

  afterMount() {
    this.namespace = '.component_control_subtitle_track' + Math.random()
    const player = this.get('player') as AVPlayer

    player.on(eventType.LOADED + this.namespace, () => {
      this.init(player)
    })
    player.on(eventType.STREAM_UPDATE + this.namespace, () => {
      this.init(player)
    })
    if (player.getStatus() >= AVPlayerStatus.LOADED) {
      this.init(player)
    }
  },

  beforeDestroy() {
    const player = this.get('player') as AVPlayer
    if (this.namespace) {
      player.off(this.namespace)
    }
  }
}

export default SubtitleTrack
