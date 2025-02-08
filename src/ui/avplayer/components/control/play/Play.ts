import { ComponentOptions } from 'yox'
import AVPlayer, { AVPlayerStatus } from 'avplayer/AVPlayer'
import * as eventType from 'avplayer/eventType'

import template from './Play.hbs'
import style from './Play.styl'

const Play: ComponentOptions = {

  name: 'Play',

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
          player.load(player.getSource(), {
            externalSubtitles: player.getExternalSubtitle()
          }).then(() => {
            player.play()
          })
        }
        else {
          player.play()
        }
      }
      this.set('played', !this.get('played'))
    },
  },
}

export default Play
