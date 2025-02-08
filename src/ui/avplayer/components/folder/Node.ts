import { ComponentOptions } from 'yox'

import * as is from 'common/util/is'
import * as array from 'common/util/array'
import template from './Node.hbs'

export const musicExt: string[] = ['mp3', 'aac', 'flac', 'ogg', 'ogg', 'wav', 'm4a', 'mka', 'opus']
export const movExt: string[] = ['mp4', 'webm', 'mkv', 'flv', 'ts', 'mov', 'm4s', 'h264', '264', 'avc',
  'h265', '265', 'hevc', 'h266', '266', 'vvc', 'ivf', 'mpeg'
]
export const subtitleExt: string[] = ['ass', 'ssa', 'vvt', 'srt', 'xml', 'ttml']

const Node: ComponentOptions = {

  name: 'Node',

  template,

  propTypes: {
    node: {
      type: 'object'
    },
    language: {
      type: 'object',
      required: true
    }
  },

  data: function () {
    return {
    }
  },

  filters: {
    isFolder: function (node) {
      return node.type === 'folder'
    },

    paddingStart: function (node) {
      return node.depth * 24
    },

    isUrl: function (node) {
      return is.string(node.source)
    },

    isMusic: function (node) {
      const ext = (node.source as File).name.split('.').pop()
      return array.has(musicExt, ext)
    }
  },

  methods: {
    toggle() {
      this.set('node.opened', !this.get('node.opened'))
    },

    play() {
      this.fire('play', this)
    },

    delete() {
      this.fire('delete', this.get('node'))
    },

    mouseenter() {
      if (this.$refs['name'].scrollWidth > this.$refs['name'].clientWidth) {
        this.fire('tip', {
          top: this.$el.offsetTop,
          text: is.string(this.get('node.source')) ? this.get('node.source') : this.get('node.name')
        })
      }
      else if (is.string(this.get('node.source')) && is.string(this.get('node.source')) !== this.get('node.name')) {
        this.fire('tip', {
          top: this.$el.offsetTop,
          text: this.get('node.source')
        })
      }
    },

    mouseleave() {
      this.fire('tip', '')
    }
  },

  afterMount() {
    this.get('node').ref = this
  },

  beforeDestroy() {
    this.get('node').ref = null
  },

  components: {

  }
}

Node.components['FolderNode'] = Node

export default Node
