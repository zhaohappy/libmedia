
/*
 * libmedia ass render
 *
 * 版权所有 (C) 2024 赵高兴
 * Copyright (C) 2024 Gaoxing Zhao
 *
 * 此文件是 libmedia 的一部分
 * This file is part of libmedia.
 * 
 * libmedia 是自由软件；您可以根据 GNU Lesser General Public License（GNU LGPL）3.1
 * 或任何其更新的版本条款重新分发或修改它
 * libmedia is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; either
 * version 3.1 of the License, or (at your option) any later version.
 * 
 * libmedia 希望能够为您提供帮助，但不提供任何明示或暗示的担保，包括但不限于适销性或特定用途的保证
 * 您应自行承担使用 libmedia 的风险，并且需要遵守 GNU Lesser General Public License 中的条款和条件。
 * libmedia is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * Lesser General Public License for more details.
 *
 */

import { setKeyframes } from 'assjs/src/renderer/animation'
import { $fixFontSize } from 'assjs/src/renderer/font-size'
import { clear, createResize } from 'assjs/src/internal'
import { createSVGEl, batchAnimate } from 'assjs/src/utils'
import generateUUID from 'common/function/generateUUID'
import { compile, CompiledASSStyle, Dialogue } from 'ass-compiler'
import { compileDialogues } from 'ass-compiler/src/compiler/dialogues'
import { compileStyles } from 'ass-compiler/src/compiler/styles'
import { AssEvent, AssEventType } from 'avformat/formats/ass/ass'
import { renderer } from 'assjs/src/renderer/renderer'
import * as object from 'common/util/object'

const GLOBAL_CSS = '.ASS-box{font-family:Arial;overflow:hidden;pointer-events:none;position:absolute}.ASS-dialogue{font-size:0;position:absolute;z-index:0}.ASS-dialogue span{display:inline-block}.ASS-dialogue [data-text]{display:inline-block;color:var(--ass-fill-color);font-size:calc(var(--ass-scale)*var(--ass-real-fs)*1px);line-height:calc(var(--ass-scale)*var(--ass-tag-fs)*1px);letter-spacing:calc(var(--ass-scale)*var(--ass-tag-fsp)*1px)}.ASS-dialogue [data-wrap-style="0"],.ASS-dialogue [data-wrap-style="3"]{text-wrap:balance}.ASS-dialogue [data-wrap-style="1"]{word-break:break-word;white-space:normal}.ASS-dialogue [data-wrap-style="2"]{word-break:normal;white-space:nowrap}.ASS-dialogue [data-border-style="1"]{position:relative}.ASS-dialogue [data-border-style="1"]::after,.ASS-dialogue [data-border-style="1"]::before{content:attr(data-text);position:absolute;top:0;left:0;z-index:-1;filter:blur(calc(var(--ass-tag-blur)*1px))}.ASS-dialogue [data-border-style="1"]::before{color:var(--ass-shadow-color);transform:translate(calc(var(--ass-scale-stroke)*var(--ass-tag-xshad)*1px),calc(var(--ass-scale-stroke)*var(--ass-tag-yshad)*1px));-webkit-text-stroke:var(--ass-border-width) var(--ass-shadow-color);text-shadow:var(--ass-shadow-delta);opacity:var(--ass-shadow-opacity)}.ASS-dialogue [data-border-style="1"]::after{color:transparent;-webkit-text-stroke:var(--ass-border-width) var(--ass-border-color);text-shadow:var(--ass-border-delta);opacity:var(--ass-border-opacity)}.ASS-dialogue [data-border-style="3"]{padding:calc(var(--ass-scale-stroke)*var(--ass-tag-xbord)*1px) calc(var(--ass-scale-stroke)*var(--ass-tag-ybord)*1px);position:relative;filter:blur(calc(var(--ass-tag-blur)*1px))}.ASS-dialogue [data-border-style="3"]::after,.ASS-dialogue [data-border-style="3"]::before{content:"";width:100%;height:100%;position:absolute;z-index:-1}.ASS-dialogue [data-border-style="3"]::before{background-color:var(--ass-shadow-color);left:calc(var(--ass-scale-stroke)*var(--ass-tag-xshad)*1px);top:calc(var(--ass-scale-stroke)*var(--ass-tag-yshad)*1px)}.ASS-dialogue [data-border-style="3"]::after{background-color:var(--ass-border-color);left:0;top:0}@container style(--ass-tag-xbord: 0) and style(--ass-tag-ybord: 0){.ASS-dialogue [data-border-style="3"]::after{background-color:transparent}}@container style(--ass-tag-xshad: 0) and style(--ass-tag-yshad: 0){.ASS-dialogue [data-border-style="3"]::before{background-color:transparent}}.ASS-dialogue [data-rotate]{transform:perspective(312.5px) rotateY(calc(var(--ass-tag-fry)*1deg)) rotateX(calc(var(--ass-tag-frx)*1deg)) rotateZ(calc(var(--ass-tag-frz)*-1deg))}.ASS-dialogue [data-text][data-rotate]{transform-style:preserve-3d;word-break:normal;white-space:nowrap}.ASS-dialogue [data-scale],.ASS-dialogue [data-skew]{display:inline-block;transform:scale(var(--ass-tag-fscx),var(--ass-tag-fscy)) skew(calc(var(--ass-tag-fax)*1rad),calc(var(--ass-tag-fay)*1rad));transform-origin:var(--ass-align-h) var(--ass-align-v)}.ASS-fix-font-size{font-size:2048px;font-family:Arial;line-height:normal;width:0;height:0;position:absolute;visibility:hidden;overflow:hidden}.ASS-clip-area,.ASS-fix-font-size span{position:absolute}.ASS-clip-area{width:100%;height:100%;top:0;left:0}.ASS-scroll-area{position:absolute;width:100%;overflow:hidden}'

function addGlobalStyle(container: any) {
  const rootNode = container.getRootNode() || document
  let isDocument = rootNode instanceof Document
  if (!isDocument && typeof documentPictureInPicture === 'object' && documentPictureInPicture.window) {
    isDocument = rootNode === documentPictureInPicture.window.document
  }
  const styleRoot = isDocument ? rootNode.head : rootNode
  let $style = styleRoot.querySelector('#ASS-global-style')
  if (!$style) {
    $style = document.createElement('style')
    $style.type = 'text/css'
    $style.id = 'ASS-global-style'
    $style.append(document.createTextNode(GLOBAL_CSS))
    styleRoot.append($style)
  }
  if (!document.head.querySelector('#ASS-global-style')) {
    $style = document.createElement('style')
    $style.type = 'text/css'
    $style.id = 'ASS-global-style'
    $style.append(document.createTextNode(GLOBAL_CSS))
    document.head.append($style)
  }
}

interface Store {
  video: HTMLElement
  box: HTMLDivElement
  svg: SVGAElement
  defs: SVGAElement
  observer: ResizeObserver
  scale: number
  width: number
  height: number
  scriptRes: {
    width: number
    height: number
  }
  layoutRes: {
    width: number
    height: number
  }
  resampledRes: {
    width: number
    height: number
  }
  sbas: boolean
  styles: Record<string, CompiledASSStyle>
  space: any[]
  actives: any[]
  dialogues: (Dialogue & { id: string, align: { h: number, v: number }})[]
  index: 0,
  delay: number
}

export interface AssRenderOptions {
  container: HTMLElement
  videoWidth?: number
  videoHeight?: number
  header?: string
  resampling?: 'video_width' | 'video_height' | 'script_width' | 'script_height'
}

export const defaultStyle = {
  Name: 'Default',
  Fontname: 'Arial',
  Fontsize: '16',
  PrimaryColour: '&Hffffff',
  SecondaryColour: '&Hffffff',
  OutlineColour: '&H0',
  BackColour: '&H0',
  Bold: '0',
  Italic: '0',
  Underline: '0',
  StrikeOut: '0',
  ScaleX: '100',
  ScaleY: '100',
  Spacing: '0',
  Angle: '0',
  BorderStyle: '1',
  Outline: '1',
  Shadow: '0',
  Alignment: '2',
  MarginL: '10',
  MarginR: '10',
  MarginV: '10',
  Encoding: '0',
}


export default class AssRender {
  private store: Store

  private resampling_ = 'video_height'

  private resize_: Function

  private options: AssRenderOptions

  constructor(dom: HTMLElement, options: AssRenderOptions = { container: dom.parentNode as HTMLElement }) {
    this.options = object.extend({}, options)
    this.store = {
      video: dom,
      box: document.createElement('div'),
      svg: createSVGEl('svg'),
      defs: createSVGEl('defs'),
      observer: null,
      scale: 1,
      width: 0,
      height: 0,
      scriptRes: {
        width: options.videoWidth || dom.clientWidth,
        height: options.videoHeight || dom.clientHeight
      },
      layoutRes: {
        width: options.videoWidth || dom.clientWidth,
        height: options.videoHeight || dom.clientHeight
      },
      resampledRes: {
        width: 0,
        height: 0
      },
      sbas: true,
      styles: null,
      space: [],
      actives: [],
      delay: 0,
      index: 0,
      dialogues: []
    }

    if (options.videoWidth == null) {
      // @ts-ignore
      dom.videoWidth = options.videoWidth
    }
    if (options.videoHeight == null) {
      // @ts-ignore
      dom.videoHeight = options.videoHeight
    }

    if (!options.container) {
      throw new Error('Missing container.')
    }

    this.resize_ = createResize(this, this.store)

    this.updateHeader(options.header)

    options.container.append($fixFontSize)

    const { svg, defs, scriptRes, box } = this.store
    svg.setAttributeNS(null, 'viewBox', `0 0 ${scriptRes.width} ${scriptRes.height}`)

    svg.append(defs)
    options.container.append(svg)

    box.className = 'ASS-box'
    options.container.append(box)

    addGlobalStyle(options.container)

    this.resampling_ = options.resampling || 'video_height'

    const observer = new ResizeObserver(this.resize.bind(this) as ResizeObserverCallback)
    observer.observe(dom)
    this.store.observer = observer

    return this
  }

  private framing(dialogue: any) {
    const dia = renderer(dialogue, this.store)
    batchAnimate(dia, 'play')
    dia.__dialogue = dialogue
    this.store.actives.push(dia)
  }

  public updateHeader(header: string) {
    if (header) {
      const { info, width, height, styles } = compile(header, {
        defaultStyle
      })
      this.store.sbas = /yes/i.test(info.ScaledBorderAndShadow)
      this.store.layoutRes = {
        width: +info.LayoutResX || this.options.videoWidth || this.store.video.clientWidth,
        height: +info.LayoutResY || this.options.videoHeight || this.store.video.clientHeight,
      }
      this.store.scriptRes = {
        width: width || this.store.layoutRes.width,
        height: height || this.store.layoutRes.height,
      }

      this.store.styles = styles
    }
    else {
      this.store.styles = compileStyles({
        info: {
          WrapStyle: ''
        },
        style: [],
        defaultStyle
      })
      this.store.scriptRes = {
        width: 384,
        height: 288
      }
    }

    this.resize_()
    this.options.header = header
  }

  public updateVideoResolution(videoWidth: number, videoHeight: number) {
    if (this.options.header) {
      const { info, width, height } = compile(this.options.header, {
        defaultStyle
      })
      this.store.layoutRes = {
        width: +info.LayoutResX || videoWidth || this.store.video.clientWidth,
        height: +info.LayoutResY || videoHeight || this.store.video.clientHeight,
      }
      this.store.scriptRes = {
        width: width || this.store.layoutRes.width,
        height: height || this.store.layoutRes.height,
      }
    }
    else {
      this.store.layoutRes = {
        width: videoWidth,
        height: videoHeight
      }
    }
  }

  public render(event: AssEvent) {
    if (event.type === AssEventType.Dialogue) {
      // @ts-ignore
      event.Start = Number(event.Start) / 1000
      // @ts-ignore
      event.End = Number(event.End) / 1000
      const dialogue = compileDialogues({
        styles: this.store.styles,
        dialogues: [event]
      })[0]
      object.extend(
        dialogue,
        {
          d: `ASS-${generateUUID()}`,
          align: {
            h: (dialogue.alignment + 2) % 3,
            v: Math.trunc((dialogue.alignment - 1) / 3)
          }
        }
      )
      setKeyframes(dialogue, this.store)
      this.framing(dialogue)
    }
  }

  public clear(pts: int64) {
    const now = static_cast<int32>(pts) / 1000
    for (let i = this.store.actives.length - 1; i >= 0; i -= 1) {
      const dia = this.store.actives[i]
      const { end } = dia
      if (end < now) {
        dia.$div.remove()
        this.store.actives.splice(i, 1)
      }
    }
  }

  public clearAll() {
    for (let i = this.store.actives.length - 1; i >= 0; i -= 1) {
      const dia = this.store.actives[i]
      dia.$div.remove()
    }
    this.store.actives.length = 0
    this.store.space.length = 0
  }

  public resize() {
    const actions = this.store.actives.slice()
    this.resize_()
    for (let i = 0; i < actions.length; i++) {
      this.framing(actions[i].__dialogue)
    }
  }

  public destroy() {
    const { video, box, svg, observer } = this.store
    clear(this.store)

    $fixFontSize.remove()
    svg.remove()
    box.remove()
    observer.unobserve(video)

    this.store.styles = {}

    return this
  }

  public show() {
    this.store.box.style.visibility = 'visible'
    return this
  }

  public hide() {
    this.store.box.style.visibility = 'hidden'
    return this
  }

  get resampling() {
    return this.resampling_
  }

  set resampling(r) {
    if (r === this.resampling_) {
      return
    }
    if (/^(video|script)_(width|height)$/.test(r)) {
      this.resampling_ = r
      this.resize()
    }
  }

}
