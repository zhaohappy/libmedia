import { ComponentOptions } from 'yox'
import template from './Progress.hbs'
import style from './Progress.styl'
import CustomEvent from 'common/event/CustomEvent'
import * as eventType from 'avplayer/eventType'
import AVPlayer, { AVPlayerStatus } from 'avplayer/AVPlayer'
import { avRescaleQ } from 'avutil/util/rational'
import * as string from 'common/util/string'
import * as is from 'common/util/is'
import { AV_MILLI_TIME_BASE_Q } from 'avutil/constant'

const Progress: ComponentOptions = {

  name: 'Progress',

  template,

  propTypes: {
    player: {
      type: 'object',
      required: true
    },
    indicatorUrl: {
      type: 'string',
    }
  },

  data: function () {
    return {
      style,
      startX: 0,
      start: false,
      seekTime: 0,
      currentTime: 0,
      totalTime: 0,
      loadedTime: 0,
      hoverX: 0,
      indicatorSize: 0,
      showTip: false,
      isFileSource: false,
      chapters: [],
      hoverChapter: ''
    }
  },

  computed: {
    playedWidth: function () {
      const seekTime = this.get('seekTime')
      const currentTime = this.get('currentTime')
      const totalTime = this.get('totalTime')
      if (this.get('start')) {
        return seekTime / totalTime * 100
      }
      else {
        return currentTime / totalTime * 100
      }
    },

    loadedWidth: function () {
      const isFileSource = this.get('isFileSource')
      if (isFileSource) {
        return 0
      }
      return (this.get('currentTime') + this.get('loadedTime')) / this.get('totalTime') * 100
    },

    hoverWidth: function () {
      const hoverX = this.get('hoverX')

      if (this.$refs && this.$refs['slider']) {
        const parentX = this.$refs['slider'].getBoundingClientRect().left
        let width = hoverX - parentX
        if (width < 0) {
          width = 0
        }
        if (width > this.$refs['slider'].offsetWidth) {
          width = this.$refs['slider'].offsetWidth
        }
        return width / this.$refs['slider'].offsetWidth * 100
      }
      return 0
    },

    hoverTime: function () {
      const hoverWidth = this.get('hoverWidth')
      return Math.round(hoverWidth / 100 * this.get('totalTime'))
    }
  },

  filters: {
    formatTime(time: number) {
      if (time < 0) {
        time = 0
      }
      const secs = static_cast<int32>(time / 1000 % 60)
      const mins = static_cast<int32>(time / 1000 / 60 % 60)
      const hours = static_cast<int32>(time / 1000 / 3600)
      if (hours) {
        return string.format('%02d:%02d:%02d', hours, mins, secs)
      }
      return string.format('%02d:%02d', mins, secs)
    }
  },

  methods: {

    mousemove: function (event: MouseEvent) {

      if (!this.get('start')) {
        return
      }

      const screenX = this.get('startX')
      const total = this.$refs['slider'].offsetWidth

      let diff = 0

      diff = (event.screenX - screenX) / total * this.get('totalTime')

      let value = this.get('seekTime') + diff
      if (value < 0) {
        value = 0
      }
      if (value > this.get('totalTime')) {
        value = this.get('totalTime')
      }

      this.set('seekTime', value)
      this.set('startX', event.screenX)
    },

    mouseup: function () {
      if (this.get('start')) {
        this.set('start', false)
        const player = this.get('player') as AVPlayer
        this.seeking = true
        player.seek(static_cast<int64>(this.get('seekTime') as double)).then(() => {
          this.seeking = false
        })
        this.set('currentTime', this.get('seekTime'))
      }
    },

    hoverEnter: function (event: CustomEvent) {
      this.set('hoverX', (event.originalEvent as MouseEvent).clientX)
      this.set('showTip', true)
    },

    hoverMove: function (event: CustomEvent) {
      this.set('hoverX', (event.originalEvent as MouseEvent).clientX)
    },

    hoverLeave: function (event: CustomEvent) {
      this.set('hoverX', this.$refs['slider'].offsetLeft)
      this.set('showTip', false)
    },

    hoverClick: function (event: CustomEvent) {
      const player = this.get('player') as AVPlayer

      const status = player.getStatus()
      if (status !== AVPlayerStatus.PLAYED && status !== AVPlayerStatus.PAUSED) {
        return
      }

      this.seeking = true
      player.seek(static_cast<int64>(this.get('hoverTime') as double)).then(() => {
        this.seeking = false
      })
      this.set('currentTime', this.get('hoverTime'))
    },

    indicatorDown: function (event: CustomEvent) {
      this.set('startX', (event.originalEvent as MouseEvent).screenX)
      this.set('start', true)
      this.set('seekTime', this.get('currentTime'))
    },

    chapterEnter(chapter) {
      this.set('hoverChapter', chapter.text)
      this.set('showTip', true)
    },

    chapterLeave(chapter) {
      this.set('hoverChapter', '')
      this.set('showTip', true)
    },

    chapterClick(chapter) {
      const player = this.get('player') as AVPlayer
      this.seeking = true
      player.seek(chapter.start).then(() => {
        this.seeking = false
      })
      this.set('currentTime', static_cast<double>(chapter.start as int64))
    },

    init(player: AVPlayer) {
      this.set('currentTime', static_cast<double>(player.currentTime))
      this.set('totalTime', static_cast<double>(player.getDuration()))
      this.set('isFileSource', !is.string(player.getSource()))
      this.set('chapters', player.getChapters().map((chapter) => {
        const start = avRescaleQ(chapter.start, chapter.timeBase, AV_MILLI_TIME_BASE_Q)
        return {
          text: chapter.metadata['title'],
          start,
          left: static_cast<double>(start) / static_cast<double>(this.get('totalTime')) * 100
        }
      }))
    }
  },

  afterMount() {
    this.onmouseup = (event: MouseEvent) => {
      this.mouseup()
    }
    this.onmousemove = (event: MouseEvent) => {
      this.mousemove(event)
    }
    document.addEventListener('mouseup', this.onmouseup)
    document.addEventListener('mousemove', this.onmousemove)

    this.namespace = '.Progress' + Math.random()

    const player = this.get('player') as AVPlayer

    player.on(eventType.LOADED + this.namespace, () => {
      this.init(player)
    })
    player.on(eventType.STOPPED + this.namespace, () => {
      this.set('currentTime', 0)
      this.set('loadedTime', 0)
    })
    player.on(eventType.SEEKED + this.namespace, () => {
      this.set('currentTime', static_cast<double>(player.currentTime))
    })
    player.on(eventType.TIME + this.namespace, (pts: int64) => {

      if (this.seeking) {
        return
      }

      this.set('currentTime', static_cast<double>(pts))

      const stats = player.getStats()

      if (stats.audioEncodeFramerate) {
        this.set('loadedTime', stats.audioPacketQueueLength / stats.audioEncodeFramerate * 1000)
      }
      else if (stats.videoEncodeFramerate) {
        this.set('loadedTime', stats.videoPacketQueueLength / stats.videoEncodeFramerate * 1000)
      }
    })

    if (player.getStatus() >= AVPlayerStatus.LOADED) {
      this.init(player)
    }

    const box = document.querySelector('#avplayer-ui-container')
    const boxStyles = getComputedStyle(box)
    const size = boxStyles.getPropertyValue('--libmedia-ui-indicator-size').trim()
    this.set('indicatorSize', parseInt(size))
  },

  beforeDestroy() {
    document.removeEventListener('mouseup', this.onmouseup)
    document.removeEventListener('mousemove', this.onmousemove)

    const player = this.get('player') as AVPlayer
    player.off(this.namespace)
  }
}

export default Progress
