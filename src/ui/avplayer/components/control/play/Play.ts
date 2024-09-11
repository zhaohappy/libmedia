import { ComponentOptions } from 'yox'
import AVPlayer, { AVPlayerStatus } from 'avplayer/AVPlayer'
import * as eventType from 'avplayer/eventType'

import template from './Play.hbs'
import style from './Play.styl'

const Play: ComponentOptions = {

  name: 'Play',

  model: 'played',

  template,

  propTypes: {
    player: {
      type: 'object',
      required: true
    },
    language: {
      type: 'object',
      required: true
    },
    played: {
      type: 'boolean',
      required: true
    }
  },

  data: function () {
    return {
      style
    }
  },


  methods: {
    playClick() {
      const player = this.get('player') as AVPlayer

      if (!player.getSource()) {
        return
      }

      if (this.get('played')) {
        if (player.isLive()) {
          return
        }
        player.pause()
      }
      else {
        if (player.getStatus() === AVPlayerStatus.STOPPED) {
          player.load(player.getSource(), player.getExternalSubtitle()).then(() => {
            player.play()
          })
        }
        else {
          player.play()
        }
      }
      this.set('played', !this.get('played'))
    },

    init(player: AVPlayer) {
      this.set('played', player.getStatus() === AVPlayerStatus.PLAYED)
    }
  },

  afterMount() {
    this.namespace = '.component_play' + Math.random()

    const player = this.get('player') as AVPlayer

    player.on(eventType.ENDED + this.namespace, () => {
      this.set('played', false)
    })
    player.on(eventType.STOPPED + this.namespace, () => {
      this.set('played', false)
    })
    player.on(eventType.PAUSED + this.namespace, () => {
      this.set('played', false)
    })
    player.on(eventType.PLAYED + this.namespace, () => {
      this.set('played', true)
    })
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
  }
}

export default Play