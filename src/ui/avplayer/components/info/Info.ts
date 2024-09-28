import { ComponentOptions } from 'yox'
import AVPlayer, { AVPlayerStatus } from 'avplayer/AVPlayer'
import * as eventType from 'avplayer/eventType'
import * as is from 'common/util/is'

import template from './Info.hbs'
import style from './Info.styl'
import dump from 'avformat/dump'

const statsKeys = [
  'jitter',
  'bandwidth'
]
const audioStatsKeys = [
  'audioStutter',
  'audioBitrate',
  'audioEncodeFramerate',
  'audioDecodeFramerate',
  'audioRenderFramerate',
  'audioFrameDecodeIntervalMax',
  'audioFrameRenderIntervalMax',
]
const videoStatsKeys = [
  'videoStutter',
  'videoBitrate',
  'videoEncodeFramerate',
  'videoDecodeFramerate',
  'videoRenderFramerate',
  'keyFrameInterval',
  'videoFrameDecodeIntervalMax',
  'videoFrameRenderIntervalMax',
]

const Info: ComponentOptions = {

  name: 'Info',

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
      style,
      info: '',
      list: []
    }
  },

  methods: {

    getStats: function (player: AVPlayer) {
      const stats = player.getStats()
      this.set('list', [])

      let keys = statsKeys
      if (player.hasVideo()) {
        keys = keys.concat(videoStatsKeys)
      }
      if (player.hasAudio()) {
        keys = keys.concat(audioStatsKeys)
      }

      keys.forEach((key) => {
        let value = stats[key]
        if (key === 'audioBitrate' || key === 'videoBitrate' || key === 'bandwidth') {
          value = (value * 8 / 1000) + ' kbps'
        }
        this.append('list', {
          key: key.replace(/([A-Z])/g, ' $1').replace(/^[a-z]/, (s) => s.toUpperCase()),
          value
        })
      })
    },

    init(player: AVPlayer) {
      const source = player.getSource()
      const info = dump([player.getFormatContext()], [{
        from: is.string(source) ? source : source.name,
        tag: 'Input'
      }])

      this.set('info', info.replace(/\n/g, '<br>').replace(/\s/g, '&nbsp;'))
      this.set('list', [])

      this.getStats(player)

      if (!this.timer) {
        this.timer = setInterval(() => {
          this.getStats(player)
        }, 1000)
      }
    },

    close() {
      this.fire('closeInfo')
      return false
    },

    preventDefault(event: CustomEvent) {
      event.preventDefault()
    }
  },

  afterMount() {
    this.namespace = '.component_info' + Math.random()

    const player = this.get('player') as AVPlayer

    player.on(eventType.LOADED + this.namespace, () => {
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
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
  }
}

export default Info
