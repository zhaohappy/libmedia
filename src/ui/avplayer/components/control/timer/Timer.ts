import { ComponentOptions } from 'yox'
import AVPlayer, { AVPlayerStatus } from 'avplayer/AVPlayer'
import * as eventType from 'avplayer/eventType'
import * as string from 'common/util/string'

import template from './Timer.hbs'
import style from './Timer.styl'

const Timer: ComponentOptions = {

  name: 'Time',

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
      totalTime: 0n,
      currentTime: 0n,
      style
    }
  },

  filters: {
    formatTime(time: int64) {
      if (time < 0) {
        time = 0n
      }
      const secs = static_cast<int32>(time / 1000n % 60n)
      const mins = static_cast<int32>(time / 1000n / 60n % 60n)
      const hours = static_cast<int32>(time / 1000n / 3600n)
      return string.format('%02d:%02d:%02d', hours, mins, secs)
    }
  },

  methods: {
    init(player: AVPlayer) {
      this.set('currentTime', player.currentTime)
      this.set('totalTime', player.getDuration())
    }
  },

  afterMount() {
    this.namespace = '.component_control_timer' + Math.random()
    const player = this.get('player') as AVPlayer
    player.on(eventType.LOADED + this.namespace, () => {
      this.init(player)
    })
    player.on(eventType.TIME + this.namespace, (pts: int64) => {
      this.set('currentTime', pts)
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

export default Timer
