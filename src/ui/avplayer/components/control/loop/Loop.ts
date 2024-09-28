import { ComponentOptions } from 'yox'
import AVPlayer from 'avplayer/AVPlayer'
import * as storage from '../../../../util/storage'

import template from './Loop.hbs'
import style from './Loop.styl'

const Loop: ComponentOptions = {

  name: 'Loop',

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
      loop: !!(+storage.get(storage.LOCAL_STORAGE_KEY_LOOP, 0))
    }
  },

  watchers: {
    loop: function (value) {
      const player = this.get('player') as AVPlayer
      player.setLoop(value)
      storage.set(storage.LOCAL_STORAGE_KEY_LOOP, value ? 1 : 0)
    }
  },


  methods: {
    init(player: AVPlayer) {

    },

    change() {
      this.set('loop', !this.get('loop'))
    }
  },

  afterMount() {
    this.namespace = '.component_control_loop' + Math.random()

    const player = this.get('player') as AVPlayer

    player.setLoop(this.get('loop'))
  },

  beforeDestroy() {
    const player = this.get('player') as AVPlayer
    if (this.namespace) {
      player.off(this.namespace)
    }
  }
}

export default Loop
