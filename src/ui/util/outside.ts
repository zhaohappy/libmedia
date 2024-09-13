
const outside = {
  on: function (element: HTMLElement, listener: Function, addEventListener: Function) {
    setTimeout(function () {
      document.addEventListener('click', (listener as any).onOutside = function (event: any) {
        let target: HTMLElement = event.target
        // 此时可能 DOM 已经被移除，无法进行判断包含关系，直接返回
        if (target.parentNode && !element.contains(target)) {
          listener(event)
        }
      })
    }, 0)
  },
  off: function (element: HTMLElement, listener: Function, removeEventListener: Function) {
    if ((listener as any).onOutside) {
      document.removeEventListener('click', (listener as any).onOutside)
      ;(listener as any).onOutside = null
    }
  }
}


export default outside
