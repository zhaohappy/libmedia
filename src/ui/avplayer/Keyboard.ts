
import { AVPlayerStatus } from 'avplayer/AVPlayer'
import * as keyboard from 'common/util/keyboard'
import AVPlayerUI from './AVPlayer'
import * as object from 'common/util/object'
import * as array from 'common/util/array'
import CommandQueue from 'common/helper/CommandQueue'
import * as bigint from 'common/util/bigint'
import { Timeout } from 'common/types/type'
import * as is from 'common/util/is'

export const enum KeyboardPlayerActionKey {
  PLAY_OR_PAUSE = 1,
  SEEK_BACK,
  SEEK_FORWARD,
  UPPER_PLAYRATE,
  STOP_UPPER_PLAYRATE,
  NEXT_FILE,
  PREV_FILE,
  NEXT_FRAME,
  SNAPSHOT,
  STOP,
  VOLUME_UP,
  VOLUME_DOWN,
  EXIT_FULLSCREEN,
  FOLD_FOLDER,
  UNFOLD_FOLDER,
  SUBTITLE_DELAY_ADD,
  SUBTITLE_DELAY_SUB
}

type ActionType = 'up' | 'down' | 'longDown'

export interface KeyboardPlayerAction {
  keyCode: number
  with: number[]
  action: ActionType
  playerStatus?: AVPlayerStatus[]
  longDownBefore?: boolean
}

const DefaultKeyboardMap: Record<KeyboardPlayerActionKey, KeyboardPlayerAction | KeyboardPlayerAction[]> = {
  [KeyboardPlayerActionKey.SUBTITLE_DELAY_ADD]: [
    {
      keyCode: keyboard.charKey['+'],
      with: [keyboard.combinationKey.ctrl],
      action: 'up',
      playerStatus: [AVPlayerStatus.PLAYED, AVPlayerStatus.PAUSED]
    },
    {
      keyCode: keyboard.charKey['+'],
      with: [keyboard.combinationKey.ctrl, keyboard.combinationKey.shift],
      action: 'up',
      playerStatus: [AVPlayerStatus.PLAYED, AVPlayerStatus.PAUSED]
    },
  ],
  [KeyboardPlayerActionKey.SUBTITLE_DELAY_SUB]: [
    {
      keyCode: keyboard.charKey['-'],
      with: [keyboard.combinationKey.ctrl],
      action: 'up',
      playerStatus: [AVPlayerStatus.PLAYED, AVPlayerStatus.PAUSED]
    },
    {
      keyCode: keyboard.charKey['-'],
      with: [keyboard.combinationKey.ctrl, keyboard.combinationKey.shift],
      action: 'up',
      playerStatus: [AVPlayerStatus.PLAYED, AVPlayerStatus.PAUSED]
    },
  ],
  [KeyboardPlayerActionKey.PLAY_OR_PAUSE]: {
    keyCode: keyboard.charKey.space,
    with: [],
    action: 'up',
    playerStatus: [AVPlayerStatus.PLAYED, AVPlayerStatus.PAUSED]
  },
  [KeyboardPlayerActionKey.SEEK_FORWARD]: {
    keyCode: keyboard.functionKey.right,
    with: [],
    action: 'up',
    playerStatus: [AVPlayerStatus.PLAYED]
  },
  [KeyboardPlayerActionKey.SEEK_BACK]: {
    keyCode: keyboard.functionKey.left,
    with: [],
    action: 'up',
    playerStatus: [AVPlayerStatus.PLAYED, AVPlayerStatus.PAUSED]
  },
  [KeyboardPlayerActionKey.UPPER_PLAYRATE]: {
    keyCode: keyboard.functionKey.right,
    with: [],
    action: 'longDown',
    playerStatus: [AVPlayerStatus.PLAYED]
  },
  [KeyboardPlayerActionKey.STOP_UPPER_PLAYRATE]: {
    keyCode: keyboard.functionKey.right,
    with: [],
    action: 'up',
    playerStatus: [AVPlayerStatus.PLAYED],
    longDownBefore: true
  },
  [KeyboardPlayerActionKey.NEXT_FILE]: {
    keyCode: keyboard.charKey.n,
    with: [keyboard.combinationKey.ctrl],
    action: 'up',
  },
  [KeyboardPlayerActionKey.PREV_FILE]: {
    keyCode: keyboard.charKey.p,
    with: [keyboard.combinationKey.ctrl],
    action: 'up',
  },
  [KeyboardPlayerActionKey.NEXT_FRAME]: {
    keyCode: keyboard.functionKey.right,
    with: [],
    action: 'up',
    playerStatus: [AVPlayerStatus.PAUSED]
  },
  [KeyboardPlayerActionKey.SNAPSHOT]: {
    keyCode: keyboard.charKey.p,
    with: [keyboard.combinationKey.ctrl, keyboard.combinationKey.shift],
    action: 'up',
    playerStatus: [AVPlayerStatus.PAUSED, AVPlayerStatus.PLAYED]
  },
  [KeyboardPlayerActionKey.STOP]: {
    keyCode: keyboard.charKey.s,
    with: [keyboard.combinationKey.ctrl],
    action: 'up',
    playerStatus: [AVPlayerStatus.PAUSED, AVPlayerStatus.PLAYED]
  },
  [KeyboardPlayerActionKey.VOLUME_DOWN]: {
    keyCode: keyboard.functionKey.down,
    with: [],
    action: 'up'
  },
  [KeyboardPlayerActionKey.VOLUME_UP]: {
    keyCode: keyboard.functionKey.up,
    with: [],
    action: 'up'
  },
  [KeyboardPlayerActionKey.EXIT_FULLSCREEN]: {
    keyCode: keyboard.functionKey.esc,
    with: [],
    action: 'up'
  },
  [KeyboardPlayerActionKey.FOLD_FOLDER]: {
    keyCode: keyboard.charKey.f,
    with: [keyboard.combinationKey.ctrl],
    action: 'up'
  },
  [KeyboardPlayerActionKey.UNFOLD_FOLDER]: {
    keyCode: keyboard.charKey.u,
    with: [keyboard.combinationKey.ctrl],
    action: 'up'
  }
}

export default class Keyboard {

  private onKeyDown_: (event: KeyboardEvent) => void
  private onKeyUp_: (event: KeyboardEvent) => void

  private player: AVPlayerUI

  private seekQueue: CommandQueue
  private lastPlayrate: number
  private longDownTimer: Map<KeyboardPlayerActionKey, Timeout>
  private longDownRunning: Map<number, KeyboardPlayerActionKey>

  constructor(player: AVPlayerUI) {
    this.player = player
    this.longDownTimer = new Map()
    this.longDownRunning = new Map()
    this.seekQueue = new CommandQueue()

    this.onKeyDown_ = (event: KeyboardEvent) => {
      this.onKeyDown(event)
    }
    this.onKeyUp_ = (event: KeyboardEvent) => {
      this.onKeyUp(event)
    }

    document.addEventListener('keydown', this.onKeyDown_)
    document.addEventListener('keyup', this.onKeyUp_)
  }

  private actionPlayOrPause() {
    if (this.player.getStatus() === AVPlayerStatus.PAUSED) {
      this.player.play()
    }
    else {
      this.player.pause()
    }
  }

  private actionSeekForward() {
    this.seekQueue.clearPadding()
    this.seekQueue.push(async () => {
      return this.player.seek(bigint.min(this.player.currentTime + 10000n, this.player.getDuration() - 10000n))
    })
  }

  private actionSeekBack() {
    this.seekQueue.clearPadding()
    this.seekQueue.push(async () => {
      return this.player.seek(bigint.max(this.player.currentTime - 10000n, 0n))
    })
  }

  private actionUpperPlayrate() {
    this.lastPlayrate = this.player.getPlaybackRate()
    this.player.setPlaybackRate(2)
  }

  private actionStopUpperPlayrate() {
    this.player.setPlaybackRate(this.lastPlayrate)
  }

  private actionNextFile() {

  }

  private actionPrevFile() {

  }

  private actionNextFrame() {
    this.player.playNextFrame()
  }

  private actionSnapshot() {

    if (!this.player.hasVideo()) {
      return
    }

    const base64Data = this.player.snapshot('png')
    const byteString = atob(base64Data.replace(/^data:image\/(png|jpeg|jpg);base64,/, ''))
    const mimeString = base64Data.split(',')[0].split(':')[1].split(';')[0]
    const ab = new ArrayBuffer(byteString.length)
    const ia = new Uint8Array(ab)

    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i)
    }

    const blob = new Blob([ab], { type: mimeString })
    const aLink = document.createElement('a')

    let source = this.player.getSource()
    let fileName = ''
    if (is.string(source)) {
      fileName = source
    }
    else {
      fileName = source.name
    }

    const list = fileName.split('.')
    list.pop()
    aLink.download = list.join('.') + '.png'
    aLink.href = URL.createObjectURL(blob)
    aLink.click()
  }

  private actionStop() {
    this.player.stop()
  }

  private actionVolumeUp() {
    this.player.setVolume(Math.min(this.player.getVolume() + 0.1, 1))
  }

  private actionVolumeDown() {
    this.player.setVolume(Math.max(this.player.getVolume() - 0.1, 0))
  }

  private actionExitFullscreen() {
    this.player.exitFullscreen()
  }

  private actionFoldFolder() {
    this.player.toggleFolder()
  }

  private actionUnFoldFolder() {
    this.player.unfoldFolder()
  }

  private actionSubtitleDelayAdd() {
    this.player.setSubtitleDelay(Math.min(5000, this.player.getSubtitleDelay() + 100))
  }

  private actionSubtitleDelaySub() {
    this.player.setSubtitleDelay(Math.max(-5000, this.player.getSubtitleDelay() - 100))
  }

  private runAction(key: KeyboardPlayerActionKey) {
    switch (key) {
      case KeyboardPlayerActionKey.PLAY_OR_PAUSE:
        this.actionPlayOrPause()
        break
      case KeyboardPlayerActionKey.NEXT_FRAME:
        this.actionNextFrame()
        break
      case KeyboardPlayerActionKey.EXIT_FULLSCREEN:
        this.actionExitFullscreen()
        break
      case KeyboardPlayerActionKey.NEXT_FILE:
        this.actionNextFile()
        break
      case KeyboardPlayerActionKey.PREV_FILE:
        this.actionPrevFile()
        break
      case KeyboardPlayerActionKey.SEEK_BACK:
        this.actionSeekBack()
        break
      case KeyboardPlayerActionKey.SEEK_FORWARD:
        this.actionSeekForward()
        break
      case KeyboardPlayerActionKey.SNAPSHOT:
        this.actionSnapshot()
        break
      case KeyboardPlayerActionKey.STOP:
        this.actionStop()
        break
      case KeyboardPlayerActionKey.FOLD_FOLDER:
        this.actionFoldFolder()
        break
      case KeyboardPlayerActionKey.UNFOLD_FOLDER:
        this.actionUnFoldFolder()
        break
      case KeyboardPlayerActionKey.UPPER_PLAYRATE:
        this.actionUpperPlayrate()
        break
      case KeyboardPlayerActionKey.STOP_UPPER_PLAYRATE:
        this.actionStopUpperPlayrate()
        break
      case KeyboardPlayerActionKey.VOLUME_DOWN:
        this.actionVolumeDown()
        break
      case KeyboardPlayerActionKey.VOLUME_UP:
        this.actionVolumeUp()
        break
      case KeyboardPlayerActionKey.SUBTITLE_DELAY_ADD:
        this.actionSubtitleDelayAdd()
        break
      case KeyboardPlayerActionKey.SUBTITLE_DELAY_SUB:
        this.actionSubtitleDelaySub()
        break
    }
  }

  private longDownAction(key: KeyboardPlayerActionKey, action: KeyboardPlayerAction) {
    if (this.longDownTimer.has(action.keyCode)) {
      return
    }
    this.longDownTimer.set(action.keyCode, setTimeout(() => {
      this.longDownTimer.delete(action.keyCode)
      this.runAction(key)
      this.longDownRunning.set(action.keyCode, key)
    }, 1000))
  }

  private getActionKeys(event: KeyboardEvent, type: ActionType, longDownBefore: boolean = false) {

    let resultKey: KeyboardPlayerActionKey
    let resultAction: KeyboardPlayerAction

    object.each(DefaultKeyboardMap, ((action, key_) => {
      const isAction = (action: KeyboardPlayerAction) => {
        if (action.keyCode === event.keyCode
          && type === action.action
          && (!action.playerStatus || array.has(action.playerStatus, this.player.getStatus()))
          && (!longDownBefore || action.longDownBefore)
        ) {
          const combinationKey: number[] = []
          if (event.shiftKey) {
            combinationKey.push(keyboard.combinationKey.shift)
          }
          if (event.ctrlKey) {
            combinationKey.push(keyboard.combinationKey.ctrl)
          }
          if (event.metaKey) {
            combinationKey.push(keyboard.combinationKey.meta)
          }
          if (event.altKey) {
            combinationKey.push(keyboard.combinationKey.alt)
          }
          if (combinationKey.length === action.with.length) {
            let checked = true
            for (let i = 0; i < combinationKey.length; i++) {
              if (!array.has(action.with, combinationKey[i])) {
                checked = false
                break
              }
            }
            if (checked) {
              resultKey = +key_
              resultAction = action
              return true
            }
          }
        }
      }

      if (is.array(action)) {
        let got = false
        array.each(action, (item) => {
          if (isAction(item)) {
            got = true
            return false
          }
        })
        if (got) {
          return false
        }
      }
      else {
        return !isAction(action)
      }
    }))

    if (resultAction) {
      return {
        key: resultKey,
        action: resultAction
      }
    }
  }

  private onKeyDown(event: KeyboardEvent) {
    let result = this.getActionKeys(event, 'down')
    if (result) {
      this.runAction(result.key)
      return
    }
    result = this.getActionKeys(event, 'longDown')
    if (result && !this.longDownRunning.has(result.action.keyCode)) {
      this.longDownAction(result.key, result.action)
    }
  }

  private onKeyUp(event: KeyboardEvent) {
    if (this.longDownTimer.has(event.keyCode)) {
      clearTimeout(this.longDownTimer.get(event.keyCode))
      this.longDownTimer.delete(event.keyCode)
    }
    let result = this.getActionKeys(event, 'up', this.longDownRunning.has(event.keyCode))
    if (result) {
      if (!result.action.longDownBefore || this.longDownRunning.has(event.keyCode)) {
        this.runAction(result.key)
      }
    }
    this.longDownRunning.delete(event.keyCode)
  }

  public destroy() {
    document.removeEventListener('keydown', this.onKeyDown_)
    document.removeEventListener('keyup', this.onKeyUp_)
  }
}
