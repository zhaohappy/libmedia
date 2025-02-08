import { ComponentOptions } from 'yox'
import AVPlayer from 'avplayer/AVPlayer'
import * as storage from '../../../../util/storage'
import Slider from '../../../../components/slider/Slider'
import * as eventType from 'avplayer/eventType'

import template from './Volume.hbs'
import style from './Volume.styl'

const Volume: ComponentOptions = {

  name: 'Volume',

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
      lastVolume: 50,
      volume: +storage.get(storage.LOCAL_STORAGE_KEY_VOLUME, 50),
      style
    }
  },

  watchers: {
    volume: function (volume) {
      const player = this.get('player') as AVPlayer
      player.setVolume(volume / 100)
      if (!(player.isSuspended() && volume === 0)) {
        storage.set(storage.LOCAL_STORAGE_KEY_VOLUME, volume)
      }
    },
  },

  methods: {
    volumeClick() {
      if (this.get('volume')) {
        this.set('lastVolume', this.get('volume'))
        this.set('volume', 0)
      }
      else {
        this.set('volume', this.get('lastVolume'))
        const player = this.get('player') as AVPlayer
        if (player.isSuspended()) {
          player.resume()
        }
      }
    }
  },

  afterMount() {
    this.namespace = '.component_control_volume' + Math.random()
    const player = this.get('player') as AVPlayer

    player.on(eventType.VOLUME_CHANGE + this.namespace, (volume) => {
      this.set('volume', Math.floor(volume * 100))
    })
    player.on(eventType.PLAYED + this.namespace, () => {
      if (player.isSuspended() && this.get('volume')) {
        this.volumeClick()
      }
    })
    player.on(eventType.AUDIO_CONTEXT_RUNNING + this.namespace, () => {
      if (!this.get('volume')) {
        this.volumeClick()
      }
    })
    player.setVolume(this.get('volume') / 100)
  },

  beforeDestroy() {
    const player = this.get('player') as AVPlayer
    if (this.namespace) {
      player.off(this.namespace)
    }
  },

  components: {
    Slider
  }
}

export default Volume
