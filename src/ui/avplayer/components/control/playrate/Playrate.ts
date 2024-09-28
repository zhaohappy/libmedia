import { ComponentOptions } from 'yox'
import AVPlayer from 'avplayer/AVPlayer'
import * as array from 'common/util/array'
import * as storage from '../../../../util/storage'

import template from './Playrate.hbs'
import style from './Playrate.styl'

const Playrate: ComponentOptions = {

  name: 'Playrate',

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
    const list = [2.0, 1.5, 1.25, 1.0, 0.75, 0.5]
    let index = array.indexOf(list, +storage.get(storage.LOCAL_STORAGE_KEY_PLAY_RATE, 1.0))
    if (index < 0) {
      index = 3
    }
    return {
      list,
      index,
      style
    }
  },

  watchers: {
    index: function (value) {
      storage.set(storage.LOCAL_STORAGE_KEY_PLAY_RATE, this.get('list')[value])
      const player = this.get('player') as AVPlayer
      player.setPlaybackRate(this.get('list')[value])
    }
  },

  methods: {
    change: function (index: number) {
      this.set('index', index)
    }
  },

  afterMount() {
    this.namespace = '.component_control_play_rate' + Math.random()
    const player = this.get('player') as AVPlayer
    player.setPlaybackRate(this.get('list')[this.get('index')])
  },

  beforeDestroy() {
    const player = this.get('player') as AVPlayer
    if (this.namespace) {
      player.off(this.namespace)
    }
  }
}

export default Playrate
