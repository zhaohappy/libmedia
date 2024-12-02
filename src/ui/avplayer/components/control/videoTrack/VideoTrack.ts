import { ComponentOptions } from 'yox'
import AVPlayer, { AVPlayerStatus } from 'avplayer/AVPlayer'
import * as eventType from 'avplayer/eventType'

import template from './VideoTrack.hbs'
import style from './VideoTrack.styl'
import { AVStreamInterface } from 'avutil/AVStream'
import { AVMediaType } from 'avutil/codec'
import { IOLoaderVideoStreamInfo } from 'avnetwork/ioLoader/IOLoader'

const VideoTrack: ComponentOptions = {

  name: 'VideoTrack',

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
      streams: [],
      videoInfo: null,
      selectIndex: 0,
      style
    }
  },

  computed: {
    list: function () {
      const player = this.get('player') as AVPlayer
      const stream: AVStreamInterface[] = this.get('streams')
      const videoInfo: IOLoaderVideoStreamInfo = this.get('videoInfo')
      if (videoInfo) {
        if (videoInfo.list.length) {
          const codecs = videoInfo.list[videoInfo.selectedIndex].codecs
          const list = videoInfo.list
            .map((item, index) => {
              return {
                value: index,
                name: `${item.width}*${item.height}${item.frameRate ? `@${item.frameRate}` : ''}`,
                codecs: item.codecs
              }
            })
            .filter((item) => {
              return item.codecs.split('.')[0] === codecs.split('.')[0]
            })
          return list
        }
      }
      else {
        return stream.map((item, index) => {
          if (item.id === player.getSelectedVideoStreamId()) {
            this.set('selectIndex', index)
          }
          return {
            value: item.id,
            name: item.metadata['title'] || item.metadata['languageString'] || item.metadata['language'] || item.metadata['name'] || 'default'
          }
        })
      }
      return []
    }
  },

  methods: {
    change: function (index: number) {
      const old = this.get('selectIndex')
      if (old !== index) {
        const player = this.get('player') as AVPlayer
        player.selectVideo(this.get('list')[index].value).then(() => {
          this.set('selectIndex', index)
        })
      }
    },

    init: function (player: AVPlayer) {
      if (player.isDash() || player.isHls()) {
        player.getVideoList().then((info) => {
          this.set('videoInfo', info)
          this.set('selectIndex', info.selectedIndex)
        })
      }
      else {
        this.set('streams', player.getStreams().filter((stream) => stream.codecpar.codecType === AVMediaType.AVMEDIA_TYPE_VIDEO))
      }
    }
  },

  afterMount() {
    this.namespace = '.component_control_video_track' + Math.random()
    const player = this.get('player') as AVPlayer

    player.on(eventType.LOADED + this.namespace, () => {
      this.init(player)
    })
    player.on(eventType.STREAM_UPDATE + this.namespace, () => {
      this.init(player)
    })
    if (player.getStatus() >= AVPlayerStatus.LOADED) {
      this.init(player)
    }
  },

  beforeDestroy() {
    const player = this.get('player') as AVPlayer
    if (this.namespace) {
      player.off(this.namespace)
    }
  }
}

export default VideoTrack
