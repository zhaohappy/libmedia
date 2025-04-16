import { ComponentOptions } from 'yox'
import AVPlayer, { AVPlayerStatus } from 'avplayer/AVPlayer'

import template from './Fullscreen.hbs'
import style from './Fullscreen.styl'

const Fullscreen: ComponentOptions = {

  name: 'Fullscreen',

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
    dom: {
      type: 'object'
    }
  },

  data: function () {
    return {
      style,
      fullscreen: false
    }
  },


  methods: {
    init(player: AVPlayer) {

    },

    fullscreenClick() {
      const player = this.get('player') as AVPlayer
      if (this.get('fullscreen')) {
        if (document.exitFullscreen) {
          document.exitFullscreen()
        }
        else if (document.mozExitFullScreen) {
          document.mozExitFullScreen()
        }
        else if (document.webkitExitFullscreen) {
          document.webkitExitFullscreen()
        }
      }
      else {
        const element: HTMLElement = this.get('dom') || (player.getOptions().container as HTMLDivElement).parentElement
        if (element.requestFullscreen) {
          element.requestFullscreen()
        }
        else if (element.mozRequestFullScreen) {
          element.mozRequestFullScreen()
        }
        else if (element.webkitRequestFullscreen) {
          element.webkitRequestFullscreen()
        }
        else if (element.msRequestFullscreen) {
          element.msRequestFullscreen()
        }
      }
    }
  },

  afterMount() {
    this.namespace = '.component_control_fullscreen' + Math.random()

    const player = this.get('player') as AVPlayer

    this.onfullscreenchange = () => {
      if (document.fullscreenElement == null) {
        const container = player.getOptions().container as HTMLDivElement
        player.resize(container.offsetWidth, container.offsetHeight)
        this.set('fullscreen', false)
      }
      else {
        player.resize(screen.width, screen.height)
        this.set('fullscreen', true)
      }
    }
    document.addEventListener('fullscreenchange', this.onfullscreenchange)
  },

  beforeDestroy() {
    const player = this.get('player') as AVPlayer
    if (this.namespace) {
      player.off(this.namespace)
    }
    document.removeEventListener('fullscreenchange', this.onfullscreenchange)
  }
}

export default Fullscreen
