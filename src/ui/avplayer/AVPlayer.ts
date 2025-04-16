
import AVPlayer, { AVPlayerOptions, AVPlayerStatus, AVPlayerSupportedCodecs } from 'avplayer/AVPlayer'
import { Component, ComponentOptions } from 'yox'
import Yox from 'yox/dist/standard/runtime/yox'
import * as object from 'common/util/object'
import * as eventType from 'avplayer/eventType'
import * as is from 'common/util/is'
import * as array from 'common/util/array'
import * as url from 'common/util/url'
import os from 'common/util/os'

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
import Loading from './components/loading/Loading'
import PcmVisualization from './components/pcmVisualization/PcmVisualization'
import LoadingTip from './components/loadingTip/LoadingTip'
import Info from './components/info/Info'
import Settings from './components/settings/Settings'

import template from './AVPlayer.hbs'
import style from './AVPlayer.styl'
import getLanguage from './i18n/getLanguage'
import debounce from 'common/function/debounce'
import { AVMediaType } from 'avutil/codec'
import { AVStreamInterface } from 'avutil/AVStream'
import Keyboard from './Keyboard'
import * as eventTypeUI from './eventType'

import outside from '../util/outside'

export const enum MenuAction {
  STATS
}

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
    },
    hasFolder: {
      type: 'boolean',
      value: true
    },
    hasHeader: {
      type: 'boolean',
      value: true
    },
    hasFooter: {
      type: 'boolean',
      value: true
    },
    folderFolded: {
      type: 'boolean',
      value: false
    }
  },

  data: function () {

    const language = getLanguage()

    const menu = [
      {
        name: language.MENU_STATS,
        action: MenuAction.STATS
      }
    ]

    return {
      style,
      title: '',
      error: '',
      showBar: true,
      played: false,
      folded: this.get('folderFolded'),
      loading: false,
      language,
      streams: [],
      videoList: [],
      audioList: [],
      subtitleList: [],
      isLive: false,
      menu,
      showMenu: false,
      menuTop: 0,
      menuLeft: 0,

      showInfo: false,
      showSettings: false
    }
  },

  events: {
    error: function (event, data) {
      console.log('error', data.message)
      this.set('error', data.message)
    },

    closeInfo: function () {
      this.set('showInfo', false)
    },

    openSettings: function () {
      this.set('showSettings', true)
    },

    closeSettings: function () {
      this.set('showSettings', false)
    },

    folderLoaded: function () {
      const player = this.get('player') as AVPlayer
      player.fire(eventTypeUI.FOLDER_LOADED)
    }
  },

  watchers: {
    played: function (value) {
      if (value) {
        if (this.showBarTimer) {
          clearTimeout(this.showBarTimer)
        }
        if (this.get('folded')) {
          this.showBarTimer = setTimeout(() => {
            this.set('showBar', false)
            this.showBarTimer = null
          }, 5000)
        }
      }
    },
    folded: function (value) {
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

  computed: {
    hasVideoTrack: function () {
      const streams: AVStreamInterface[] = this.get('streams')
      const videoList = this.get('videoList')
      return streams
        .filter((stream) => stream.codecpar.codecType === AVMediaType.AVMEDIA_TYPE_VIDEO)
        .filter((stream) => array.has(AVPlayerSupportedCodecs, stream.codecpar.codecId))
        .length > 1
        || videoList.length > 1
    },
    hasAudioTrack: function () {
      const streams: AVStreamInterface[] = this.get('streams')
      const audioList = this.get('audioList')
      return streams
        .filter((stream: AVStreamInterface) => stream.codecpar.codecType === AVMediaType.AVMEDIA_TYPE_AUDIO)
        .filter((stream) => array.has(AVPlayerSupportedCodecs, stream.codecpar.codecId))
        .length > 1
        || audioList.length > 1
    },
    hasSubtitleTrack: function () {
      const streams: AVStreamInterface[] = this.get('streams')
      const subtitleList = this.get('subtitleList')
      const isLive = this.get('isLive')
      return !isLive && streams
        .filter((stream: AVStreamInterface) => stream.codecpar.codecType === AVMediaType.AVMEDIA_TYPE_VIDEO)
        .filter((stream) => array.has(AVPlayerSupportedCodecs, stream.codecpar.codecId))
        .length > 0
        || subtitleList.length > 1
    },
    hasPip: function () {
      const streams: AVStreamInterface[] = this.get('streams')
      return streams
        .filter((stream: AVStreamInterface) => stream.codecpar.codecType === AVMediaType.AVMEDIA_TYPE_VIDEO)
        .filter((stream) => array.has(AVPlayerSupportedCodecs, stream.codecpar.codecId))
        .length > 0
    },
    hasPcmVisualization: function () {
      const streams: AVStreamInterface[] = this.get('streams')
      return streams
        .filter((stream: AVStreamInterface) => stream.codecpar.codecType === AVMediaType.AVMEDIA_TYPE_AUDIO)
        .filter((stream) => array.has(AVPlayerSupportedCodecs, stream.codecpar.codecId))
        .length > 0
        && streams
          .filter((stream: AVStreamInterface) => stream.codecpar.codecType === AVMediaType.AVMEDIA_TYPE_VIDEO)
          .filter((stream) => array.has(AVPlayerSupportedCodecs, stream.codecpar.codecId))
          .length === 0
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
      this.set('streams', player.getStreams())
      this.set('isLive', player.isLive())
      this.set('played', player.getStatus() === AVPlayerStatus.PLAYED)

      player.getVideoList().then((list) => {
        this.set('videoList', list.list)
      })
      player.getAudioList().then((list) => {
        this.set('audioList', list.list)
      })
      player.getSubtitleList().then((list) => {
        this.set('subtitleList', list.list)
      })
    },

    mousemove() {
      setTimeout(() => {
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
      })
    },

    playClick(container: boolean) {
      const player = this.get('player') as AVPlayer
      if (player.isSuspended()) {
        player.resume()
        if (player.getStatus() === AVPlayerStatus.PLAYED) {
          return
        }
      }
      if (os.ios || os.android || os.harmony && os.mobile) {
        return
      }
      if (this.$refs['play'] && ((!this.get('showMenu') && this.get('showBar')) || !container)) {
        this.$refs['play'].playClick()
      }
    },

    toggleFold() {
      this.set('folded', !this.get('folded'))
    },

    fold() {
      this.set('folded', true)
    },

    unfold() {
      this.set('folded', false)
    },

    toggleFolder() {
      this.set('folded', !this.get('folded'))
    },

    menuAction(action: MenuAction) {
      if (action === MenuAction.STATS) {
        this.set('showInfo', true)
      }
      this.set('showMenu', false)
    },

    menuOutside() {
      this.set('showMenu', false)
    },

    addUrl(url: string, isLive: boolean, playAfterAdded: boolean) {
      if (this.$refs.folder) {
        this.$refs.folder.openUrl(url, isLive, playAfterAdded)
      }
    }
  },

  afterMount() {
    this.namespace = '.avplayer' + Math.random()

    const player = this.get('player') as AVPlayer

    const container = (this.$el as HTMLDivElement).querySelectorAll('.avplayer-ui-player')[0] as HTMLDivElement

    // @ts-ignore
    player.options.container = container

    player.on(eventType.LOADING + this.namespace, () => {
      this.set('loading', true)
      this.set('error', '')
    })
    player.on(eventType.LOADED + this.namespace, () => {
      this.init(player)
    })
    player.on(eventType.PLAYED + this.namespace, () => {
      this.set('loading', false)
      this.set('played', true)
    })
    player.on(eventType.PAUSED + this.namespace, () => {
      this.set('played', false)
    })
    player.on(eventType.STOPPED + this.namespace, () => {
      this.set('title', '')
      this.set('streams', [])
      this.set('played', false)
    })
    if (player.getStatus() >= AVPlayerStatus.LOADED) {
      this.init(player)
    }

    this.onresize = debounce(() => {
      player.resize(container.offsetWidth, container.offsetHeight)
    }, 500)
    window.addEventListener('resize', this.onresize)

    this.oncontextmenu = (event: MouseEvent) => {
      if (this.$refs['playerContainer'].contains(event.target)) {
        this.set('showMenu', true)
        this.set('menuTop', event.clientY)
        this.set('menuLeft', event.clientX)
        event.preventDefault()
      }
    }
    window.addEventListener('contextmenu', this.oncontextmenu)
  },

  beforeDestroy() {
    const player = this.get('player') as AVPlayer
    if (this.namespace) {
      player.off(this.namespace)
    }

    window.removeEventListener('resize', this.onresize)
    window.removeEventListener('contextmenu', this.oncontextmenu)
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
    Folder,
    Loading,
    PcmVisualization,
    LoadingTip,
    Info,
    Settings
  }
}

export interface AVPlayerUIOptions extends AVPlayerOptions {
  container: HTMLDivElement
  indicatorUrl?: string
  pauseStateUrl?: string
  errorStateUrl?: string
  fullscreenDom?: HTMLElement
  ui?: {
    hasFolder?: boolean
    folderFolded?: boolean
    hasHeader?: boolean
    hasFooter?: boolean
  }
}

export default class AVPlayerUI extends AVPlayer {

  public ui: Component

  private keyboard: Keyboard

  constructor(options: AVPlayerUIOptions) {
    super(object.extend({}, options, { container: null }))
    Yox.dom.addSpecialEvent('outside', outside)
    this.ui = new Yox(object.extend({
      el: options.container,
      replace: false,
      props: {
        player: this,
        indicatorUrl: options.indicatorUrl,
        pauseStateUrl: options.pauseStateUrl,
        errorStateUrl: options.errorStateUrl,
        fullscreenDom: options.fullscreenDom,
        hasFolder: options.ui?.hasFolder,
        hasHeader: options.ui?.hasHeader,
        hasFooter: options.ui?.hasFooter,
        folderFolded: options.ui?.folderFolded,
      }
    }, AVPlayerUIComponentOptions))

    this.keyboard = new Keyboard(this)
  }

  public foldFolder() {
    // @ts-ignore
    this.ui.fold()
  }

  public unfoldFolder() {
    // @ts-ignore
    this.ui.unfold()
  }

  public toggleFolder() {
    // @ts-ignore
    this.ui.toggleFolder()
  }

  public addUrl(url: string, isLive: boolean, playAfterAdded: boolean) {
    // @ts-ignore
    this.ui.addUrl(url, isLive, playAfterAdded)
  }

  public async destroy() {
    await super.destroy()
    this.keyboard.destroy()
    // @ts-ignore
    this.ui.destroy()
  }
}
