import { ComponentOptions } from 'yox'
import AVPlayer from 'avplayer/AVPlayer'

import template from './Settings.hbs'
import style from './Settings.styl'

enum TAB {
  DECODER,
  PLAY,
  SUBTITLE,
  VIDEO,
  AUDIO,
  FILTER,
  KEYBOARD,
  LANGUAGE,
  SKIN
}

const Settings: ComponentOptions = {

  name: 'Settings',

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

    const language = this.get('language')

    const list = [
      {
        id: TAB.DECODER,
        name: language.SETTING_TAB_DECODER
      },
      {
        id: TAB.PLAY,
        name: language.SETTING_TAB_PLAY
      },
      {
        id: TAB.SUBTITLE,
        name: language.SETTING_TAB_SUBTITLE
      },
      {
        id: TAB.VIDEO,
        name: language.SETTING_TAB_VIDEO
      },
      {
        id: TAB.AUDIO,
        name: language.SETTING_TAB_AUDIO
      },
      {
        id: TAB.FILTER,
        name: language.SETTING_TAB_FILTER
      },
      {
        id: TAB.KEYBOARD,
        name: language.SETTING_TAB_KEYBOARD
      },
      {
        id: TAB.LANGUAGE,
        name: language.SETTING_TAB_LANGUAGE
      },
      {
        id: TAB.SKIN,
        name: language.SETTING_TAB_SKIN
      }
    ]

    return {
      style,
      tab: TAB.DECODER,
      list
    }
  },

  methods: {
    close: function () {
      this.fire('closeSettings')
    }
  },

  afterMount() {
    this.namespace = '.component_settings' + Math.random()
  },

  beforeDestroy() {
    const player = this.get('player') as AVPlayer
    if (this.namespace) {
      player.off(this.namespace)
    }
  }
}

export default Settings
