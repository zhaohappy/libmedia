import type { ComponentOptions } from 'yox'
import type AVPlayer from '@libmedia/avplayer'

import template from './Setting.hbs'
import style from './Setting.styl'

const Setting: ComponentOptions = {

  name: 'Setting',

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
      style
    }
  },


  methods: {
    init(player: AVPlayer) {

    },

    click() {
      this.fire('openSettings')
    }
  },

  afterMount() {
    this.namespace = '.component_control_setting' + Math.random()

    const player = this.get('player') as AVPlayer

  },

  beforeDestroy() {
    const player = this.get('player') as AVPlayer
    if (this.namespace) {
      player.off(this.namespace)
    }
  }
}

export default Setting
