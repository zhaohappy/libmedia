import { ComponentOptions } from 'yox'

import template from './Slider.hbs'
import CustomEvent from 'common/event/CustomEvent'

const Slider: ComponentOptions = {

  name: 'slider',

  model: 'value',

  template,

  propTypes: {
    value: {
      type: 'number',
      required: true
    },
    max: {
      type: 'number',
      value: 100
    },
    min: {
      type: 'number',
      value: 0
    },
    step: {
      type: 'number',
      value: 1
    },
    direction: {
      // 'vertical' | 'horizontal'
      type: 'string',
      value: 'vertical'
    }
  },

  data: function () {
    return {
      startX: 0,
      startY: 0,
      start: false
    }
  },

  computed: {
    offset: function () {
      return this.get('direction') === 'vertical' ? `top: ${(1 - this.get('value') / this.get('max')) * 100}%` : `right: ${(1 - this.get('value') / this.get('max')) * 100}%`
    }
  },

  methods: {
    mousedown: function (event: CustomEvent) {
      this.set('startX', (event.originalEvent as MouseEvent).screenX)
      this.set('startY', (event.originalEvent as MouseEvent).screenY)
      this.set('start', true)
    },

    mousemove: function (event: MouseEvent) {

      if (!this.get('start')) {
        return
      }

      const pageX = this.get('startX')
      const pageY = this.get('startY')

      let diff = 0

      const direction = this.get('direction')
      const step = this.get('step')

      if (direction === 'vertical') {
        const total = this.$refs['slider'].offsetHeight
        diff = -(event.screenY - pageY) / total * this.get('max') * step
      }
      else if (direction === 'horizontal') {
        const total = this.$refs['slider'].offsetWidth
        diff = (event.screenX - pageX) / total * this.get('max') * step
      }
      let value = this.get('value') + diff
      if (value < this.get('min')) {
        value = this.get('min')
      }
      if (value > this.get('max')) {
        value = this.get('max')
      }
      this.set('value', Math.round(value))
      this.set('startX', event.screenX)
      this.set('startY', event.screenY)
    },

    mouseup: function () {
      if (this.get('start')) {
        this.set('start', false)
      }
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
  },

  beforeDestroy() {
    document.removeEventListener('mouseup', this.onmouseup)
    document.removeEventListener('mousemove', this.onmousemove)
  }
}

export default Slider
