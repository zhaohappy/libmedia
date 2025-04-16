import { ComponentOptions } from 'yox'
import AVPlayer from 'avplayer/AVPlayer'

import template from './Pip.hbs'
import style from './Pip.styl'

const Pip: ComponentOptions = {

  name: 'Pip',

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
      pip: false
    }
  },


  methods: {
    init(player: AVPlayer) {

    },

    async pipClick() {
      const player = this.get('player') as AVPlayer
      if (this.get('pip')) {
        this.set('pip', false)
        if (player.isMSE()) {
          document.exitPictureInPicture()
        }
        else {
          const pipPlayer = this.pipWindow.document.body.children[0]
          if (pipPlayer) {
            this.playerContainer.prepend(pipPlayer)
            player.resize(pipPlayer.offsetWidth, pipPlayer.offsetHeight)
          }
          this.pipWindow.close()
        }
      }
      else {
        if (player.isMSE()) {
          // @ts-ignore
          player.video.requestPictureInPicture()
        }
        else {
          this.playerContainer = (player.getOptions().container as HTMLDivElement).parentElement
          this.pipWindow = await documentPictureInPicture.requestWindow({
            disallowReturnToOpener: true,
            width: 320,
            height: 180
          })
          this.pipWindow.addEventListener('pagehide', (event) => {
            if (this.get('pip')) {
              const pipPlayer = event.target.body.children[0]
              if (pipPlayer) {
                this.playerContainer.prepend(pipPlayer)
                player.resize(pipPlayer.offsetWidth, pipPlayer.offsetHeight)
              }
              this.set('pip', false)
            }
          })
          this.pipWindow.addEventListener('resize', (event) => {
            if (this.pipWindow.document) {
              const pipPlayer = this.pipWindow.document.children[0]
              player.resize(pipPlayer.offsetWidth, pipPlayer.offsetHeight)
            }
          })
          // @ts-ignore
          ;[...document.styleSheets].forEach((styleSheet) => {
            try {
              const cssRules = [...styleSheet.cssRules].map((rule) => rule.cssText).join('')
              const style = document.createElement('style')
              style.textContent = cssRules
              this.pipWindow.document.head.appendChild(style)
            }
            catch (e) {
              const link = document.createElement('link')
              link.rel = 'stylesheet'
              link.type = styleSheet.type
              link.media = styleSheet.media
              link.href = styleSheet.href
              this.pipWindow.document.head.appendChild(link)
            }
          })
          this.pipWindow.document.body.append(player.getOptions().container)
        }
      }
    }
  },

  afterMount() {
    this.namespace = '.component_control_pip' + Math.random()

    this.onenter = (event) => {
      this.pipWindow = event.window
      this.set('pip', true)
    }
    // @ts-ignore
    if (typeof documentPictureInPicture === 'object') {
      // @ts-ignore
      documentPictureInPicture.addEventListener('enter', this.onenter)
    }
  },

  beforeDestroy() {
    const player = this.get('player') as AVPlayer
    // @ts-ignore
    if (typeof documentPictureInPicture === 'object') {
      // @ts-ignore
      documentPictureInPicture.removeEventListener('enter', this.onenter)
    }
    if (this.namespace) {
      player.off(this.namespace)
    }
  }
}

export default Pip
