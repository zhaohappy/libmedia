import { ComponentOptions } from 'yox'
import AVPlayer, { AVPlayerStatus } from 'avplayer/AVPlayer'
import * as eventType from 'avplayer/eventType'

import template from './Loading.hbs'
import style from './Loading.styl'

const Loading: ComponentOptions = {

  name: 'Loading',

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
      loading: false
    }
  },

  methods: {

  },

  afterMount() {
    this.namespace = '.component_loading' + Math.random()

    const player = this.get('player') as AVPlayer

    player.on(eventType.PLAYED + this.namespace, () => {
      if (this.timer) {
        clearTimeout(this.timer)
        this.timer = null
      }
      this.set('loading', false)
    })
    player.on(eventType.LOADING + this.namespace, () => {
      if (this.timer) {
        clearTimeout(this.timer)
      }
      this.timer = setTimeout(() => {
        this.set('loading', true)
        this.timer = null
      }, 500)
    })
    this.set('loading', player.getStatus() === AVPlayerStatus.LOADING)
  },

  beforeDestroy() {
    const player = this.get('player') as AVPlayer
    if (this.namespace) {
      player.off(this.namespace)
    }
  }
}

export default Loading
