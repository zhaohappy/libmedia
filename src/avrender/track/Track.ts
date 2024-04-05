/*
 * libmedia Track
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

import * as object from 'common/util/object'
import * as logger from 'common/util/logger'

enum Operator {
  ADD,
  REMOVE,
  UPDATE_TIMESTAMP_OFFSET
}

export type TrackOptions = {
  mediaBufferMax?: number
}

const defaultTrackOptions = {
  mediaBufferMax: 10
}

export default class Track {

  protected sourceBuffer: SourceBuffer

  private operatorQueue: {
    operator: Operator
    buffer?: Uint8Array
    start?: number
    end?: number
    timestampOffset?: number
    callback?: (...args: any[]) => void
  }[]

  private updating: boolean

  private lastRemoveTime: number

  private paddingCallback: (...args: any[]) => void

  protected options: TrackOptions

  private ending: boolean

  public onQuotaExceededError?: () => void

  public onEnded?: () => void

  constructor(options: TrackOptions = {}) {
    this.options = object.extend({}, defaultTrackOptions, options)

    this.operatorQueue = []
    this.updating = false

    this.lastRemoveTime = 0
    this.ending = false
  }

  public setSourceBuffer(sourceBuffer: SourceBuffer) {
    this.sourceBuffer = sourceBuffer
    this.sourceBuffer.addEventListener('updateend', () => {

      if (this.paddingCallback) {
        this.paddingCallback()
        this.paddingCallback = null
      }

      if (this.operatorQueue && this.operatorQueue.length) {
        this.enqueue()
      }
      else {
        this.updating = false
        if (this.ending) {
          if (this.onEnded) {
            this.onEnded()
          }
        }
      }
    })
    this.sourceBuffer.addEventListener('error', (error) => {
      logger.error('track update buffer error')
    })
  }

  public changeMimeType(type: string) {
    if (this.sourceBuffer) {
      this.sourceBuffer.changeType(type)
    }
  }

  public addBuffer(buffer: Uint8Array, callback?: (...args: any[]) => void) {

    if (!buffer) {
      if (callback) {
        callback()
      }
      return
    }

    if (!this.updating && !this.operatorQueue.length) {
      try {
        this.sourceBuffer.appendBuffer(buffer)
        this.updating = true
        if (callback) {
          this.paddingCallback = callback
        }
      }
      catch (error) {
        if (error instanceof DOMException && error.name === 'QuotaExceededError') {
          // buffer 满了，返回队列重新操作
          this.operatorQueue.push({
            operator: Operator.ADD,
            buffer,
            callback
          })
          if (this.onQuotaExceededError) {
            this.onQuotaExceededError()
          }
        }
        else {
          throw error
        }
      }
    }
    else {
      this.operatorQueue.push({
        operator: Operator.ADD,
        buffer,
        callback
      })
    }
  }

  public updateTimestampOffset(timestampOffset: number, callback?: (...args: any[]) => void) {
    if (!this.updating && !this.operatorQueue.length) {
      this.sourceBuffer.timestampOffset = timestampOffset
      if (callback) {
        callback()
      }
      this.enqueue()
    }
    else {
      this.operatorQueue.push({
        operator: Operator.UPDATE_TIMESTAMP_OFFSET,
        timestampOffset,
        callback
      })
    }
  }

  public end() {
    this.ending = true
    if (!this.updating && !this.operatorQueue.length) {
      if (this.onEnded) {
        this.onEnded()
      }
    }
  }

  public isPaused() {
    return !this.updating && this.operatorQueue.length
  }

  public getQueueLength() {
    return this.operatorQueue.length
  }

  public enqueue() {
    if (this.operatorQueue.length) {
      const operator = this.operatorQueue.shift()
      if (operator.operator === Operator.ADD) {
        try {
          this.sourceBuffer.appendBuffer(operator.buffer)
          this.updating = true
          if (operator.callback) {
            this.paddingCallback = operator.callback
          }
        }
        catch (error) {
          if (error instanceof DOMException && error.name === 'QuotaExceededError') {
            // buffer 满了，返回队列重新操作
            this.operatorQueue.unshift(operator)
            if (this.onQuotaExceededError) {
              this.onQuotaExceededError()
            }
            this.updating = false
          }
          else {
            throw error
          }
        }
      }
      else if (operator.operator === Operator.REMOVE) {
        this.sourceBuffer.remove(operator.start, operator.end)
        this.updating = true
        if (operator.callback) {
          this.paddingCallback = operator.callback
        }
      }
      else if (operator.operator === Operator.UPDATE_TIMESTAMP_OFFSET) {
        this.sourceBuffer.timestampOffset = operator.timestampOffset
        if (operator.callback) {
          operator.callback()
        }
        this.enqueue()
      }
    }
  }

  public removeBuffer(time: number, callback?: (...args: any[]) => void) {

    if (this.ending) {
      return
    }

    time = Math.floor(time)

    if (time - this.lastRemoveTime < this.options.mediaBufferMax << 1) {
      return
    }

    if (!this.updating && !this.operatorQueue.length) {
      this.sourceBuffer.remove(this.lastRemoveTime, time - this.options.mediaBufferMax)
      this.updating = true
      if (callback) {
        this.paddingCallback = callback
      }
    }
    else {
      this.operatorQueue.push({
        operator: Operator.REMOVE,
        start: this.lastRemoveTime,
        end: time - this.options.mediaBufferMax,
        callback
      })
    }

    this.lastRemoveTime = time - this.options.mediaBufferMax
  }

  public stop() {
    if (this.sourceBuffer) {
      try {
        this.sourceBuffer.abort()
        this.updating = false
      }
      catch (error) {}
      try {
        if (this.sourceBuffer.buffered.length) {
          if (!this.updating) {
            this.sourceBuffer.remove(this.sourceBuffer.buffered.start(0), this.sourceBuffer.buffered.end(this.sourceBuffer.buffered.length - 1))
            this.updating = true
          }
          else {
            this.operatorQueue.push({
              operator: Operator.REMOVE,
              start: this.sourceBuffer.buffered.start(0),
              end: this.sourceBuffer.buffered.end(this.sourceBuffer.buffered.length - 1)
            })
          }
        }
        if (this.paddingCallback) {
          this.paddingCallback()
          this.paddingCallback = null
        }
      }
      catch (error) {}
    }
  }

  public removeAllBuffer(callback?: (...args: any[]) => void) {
    if (this.sourceBuffer.buffered.length) {
      if (!this.updating) {
        this.sourceBuffer.remove(this.sourceBuffer.buffered.start(0), this.sourceBuffer.buffered.end(this.sourceBuffer.buffered.length - 1))
        this.updating = true
        if (callback) {
          this.paddingCallback = callback
        }
      }
      else {
        this.operatorQueue.push({
          operator: Operator.REMOVE,
          start: this.sourceBuffer.buffered.start(0),
          end: this.sourceBuffer.buffered.end(this.sourceBuffer.buffered.length - 1),
          callback
        })
      }
    }
    else if (callback) {
      callback()
    }
  }

  public reset() {
    this.stop()
    this.operatorQueue.length = 0
    this.ending = false
  }

  public getBufferedTime() {
    if (this.sourceBuffer && this.sourceBuffer.buffered.length) {
      return this.sourceBuffer.buffered.end(this.sourceBuffer.buffered.length - 1) - this.sourceBuffer.buffered.start(0)
    }
    return 0
  }

  public getBufferedStart() {
    if (this.sourceBuffer && this.sourceBuffer.buffered.length) {
      return this.sourceBuffer.buffered.start(0)
    }
    return 0
  }

  public getBufferedEnd() {
    if (this.sourceBuffer && this.sourceBuffer.buffered.length) {
      return this.sourceBuffer.buffered.end(this.sourceBuffer.buffered.length - 1)
    }
    return 0
  }

  public getSourceBuffer() {
    return this.sourceBuffer
  }

  public destroy() {
    this.stop()
    this.operatorQueue = null
    this.sourceBuffer = null
  }
}
