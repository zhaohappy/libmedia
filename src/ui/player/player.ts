
import AVPlayer, { AVPlayerOptions, AVPlayerStatus } from 'avplayer/AVPlayer'
import { Component, ComponentOptions } from 'yox'
import Yox from 'yox/dist/standard/runtime/yox'
import * as object from 'common/util/object'
import * as eventType from 'avplayer/eventType'
import * as is from 'common/util/is'
import * as url from 'common/util/url'

import Progress from './components/progress/Progress'
import Play from './components/control/play/Play'
import Volume from './components/control/volume/Volume'
import Timer from './components/control/timer/Timer'
import Setting from './components/control/setting/Setting'
import Fullscreen from './components/control/fullscreen/Fullscreen'
import Playrate from './components/control/playrate/Playrate'
import AudioTrack from './components/control/audioTrack/AudioTrack'
import VideoTrack from './components/control/videoTrack/VideoTrack'
import SubtitleTrack from './components/control/subtitleTrack/SubtitleTrack'
import Loop from './components/control/loop/Loop'
import Pip from './components/control/pip/Pip'
import Folder from './components/folder/Folder'

import template from './player.hbs'
import style from './player.styl'
import getLanguage from './i18n/getLanguage'
import debounce from 'common/function/debounce'

const AVPlayerUIComponentOptions: ComponentOptions = {

  name: 'AVPlayer',

  template,

  propTypes: {
    player: {
      type: 'object',
      required: true
    },
    indicatorUrl: {
      type: 'string',
    },
    pauseStateUrl: {
      type: 'string',
    },
    errorStateUrl: {
      type: 'string'
    },
    fullscreenDom: {
      type: 'object'
    }
  },

  data: function () {
    return {
      style,
      title: '',
      error: '',
      showBar: true,
      played: false,
      folded: false,
      language: getLanguage()
    }
  },

  watchers: {
    played: function(value) {
      if (value) {
        if (this.showBarTimer) {
          clearTimeout(this.showBarTimer)
        }
        this.showBarTimer = setTimeout(() => {
          this.set('showBar', false)
          this.showBarTimer = null
        }, 5000)
      }
    },
    folded: function(value) {
      if (value) {
        if (this.showBarTimer) {
          clearTimeout(this.showBarTimer)
        }
        this.showBarTimer = setTimeout(() => {
          this.set('showBar', false)
          this.showBarTimer = null
        }, 5000)
      }
    }
  },

  methods: {
    init(player: AVPlayer) {
      const source = player.getSource()
      if (is.string(source)) {
        this.set('title', url.parse(decodeURI(source)).file)
      }
      else {
        this.set('title', source.name)
      }
    },

    mousemove() {
      this.set('showBar', true)
      if (this.showBarTimer) {
        clearTimeout(this.showBarTimer)
      }
      if (this.get('played') && this.get('folded')) {
        this.showBarTimer = setTimeout(() => {
          this.set('showBar', false)
          this.showBarTimer = null
        }, 5000)
      }
    },

    playClick() {
      if (this.$refs['play']) {
        this.$refs['play'].playClick()
      }
    },

    toggleFold() {
      this.set('folded', !this.get('folded'))
    }
  },

  afterMount() {
    this.namespace = '.avplayer' + Math.random()

    const player = this.get('player') as AVPlayer

    const container = (this.$el as HTMLDivElement).querySelectorAll('.avplayer-ui-player')[0] as HTMLDivElement

    // @ts-ignore
    player.options.container = container

    player.on(eventType.LOADED + this.namespace, () => {
      this.init(player)
    })
    if (player.getStatus() >= AVPlayerStatus.LOADED) {
      this.init(player)
    }

    this.onresize = debounce(() => {
      player.resize(container.offsetWidth, container.offsetHeight)
    }, 500)
    window.addEventListener('resize', this.onresize)
  },

  beforeDestroy() {
    const player = this.get('player') as AVPlayer
    if (this.namespace) {
      player.off(this.namespace)
    }

    window.removeEventListener('resize', this.onresize)
  },

  components: {
    Progress,
    Play,
    Volume,
    Timer,
    Setting,
    Fullscreen,
    Playrate,
    AudioTrack,
    VideoTrack,
    SubtitleTrack,
    Loop,
    Pip,
    Folder
  }
}

export interface AVPlayerUIOptions extends AVPlayerOptions {
  indicatorUrl?: string
  pauseStateUrl?: string
  errorStateUrl?: string
  fullscreenDom?: HTMLElement
}

export default class AVPlayerUI extends AVPlayer {

  public ui: Component

  constructor(options: AVPlayerUIOptions) {
    super(object.extend({}, options, { container: null }))
    this.ui = new Yox(object.extend({
      el: options.container,
      replace: false,
      props: {
        player: this,
        indicatorUrl: options.indicatorUrl,
        pauseStateUrl: options.pauseStateUrl,
        errorStateUrl: options.errorStateUrl,
        fullscreenDom: options.fullscreenDom
      }
    }, AVPlayerUIComponentOptions))
  }
}