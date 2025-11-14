import type { ComponentOptions } from 'yox'
import type AVPlayer from '@libmedia/avplayer'
import { AVPlayerStatus, Events as eventType } from '@libmedia/avplayer'
import template from './AudioTrack.hbs'
import style from './AudioTrack.styl'
import { AVMediaType, type AVStreamInterface } from '@libmedia/avutil'
import type { IOLoaderAudioStreamInfo } from '@libmedia/avnetwork'

const AudioTrack: ComponentOptions = {

  name: 'AudioTrack',

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
      audioInfo: null,
      selectIndex: 0,
      style
    }
  },

  computed: {
    list: function () {
      const player = this.get('player') as AVPlayer
      const stream: AVStreamInterface[] = this.get('streams')
      const audioInfo: IOLoaderAudioStreamInfo = this.get('audioInfo')
      if (audioInfo) {
        if (audioInfo.list.length) {
          const list = audioInfo.list
            .map((item, index) => {
              let name = ''
              if (item.bandwidth) {
                name = item.bandwidth > 1000 ? `${Math.round(item.bandwidth / 1000)} kbps` : `${item.bandwidth} bps`
              }
              if (item.codec) {
                name += name ? ` (${item.codec})` : item.codec
              }
              if (item.lang) {
                name += name ? ` ${item.lang}` : item.lang
              }
              return {
                value: index,
                name,
                codec: item.codec
              }
            })
          return list
        }
      }
      else {
        return stream.map((item, index) => {
          if (item.id === player.getSelectedAudioStreamId()) {
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
        player.selectAudio(this.get('list')[index].value).then(() => {
          this.set('selectIndex', index)
        })
      }
    },

    init: function (player: AVPlayer) {
      if (player.isDash() || player.isHls()) {
        player.getAudioList().then((info) => {
          this.set('audioInfo', info)
          this.set('selectIndex', info.selectedIndex)
        })
      }
      else {
        this.set('streams', player.getStreams().filter((stream) => stream.codecpar.codecType === AVMediaType.AVMEDIA_TYPE_AUDIO))
      }
    }
  },

  afterMount() {
    this.namespace = '.component_control_audio_track' + Math.random()
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

export default AudioTrack
