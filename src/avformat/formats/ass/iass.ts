
/*
 * libmedia ass input util
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

import * as logger from 'common/util/logger'
import { AssEvent, AssEventsFormatList, AssEventType, AssStylesFormatList } from './ass'
import { hhColonDDColonSSDotMill2Int64 } from 'common/util/time'

import { parseEffect } from 'ass-compiler/src/parser/effect'
import { parseText } from 'ass-compiler/src/parser/text'

export function parseFormat(fields: string[], format: string) {
  const items = format.match(/Format\s*:\s*(.*)/i)[1].split(/\s*,\s*/)
  const result: string[] = []
  for (let i = 0; i < items.length; i++) {
    const field = fields.find((f) => f.toLowerCase() === items[i].toLowerCase())
    if (!field) {
      logger.warn(`not support ass field(${items[i]})`)
    }
    result.push(field || items[i])
  }
  return result
}

export function parseStyleFormat(format: string) {
  return parseFormat(AssStylesFormatList, format)
}

export function parseEventFormat(format: string) {
  return parseFormat(AssEventsFormatList, format)
}

export function parseEventLine(formats: string[], text: string) {
  let fields = text.split(',')
  if (fields.length > formats.length) {
    const textField = fields.slice(formats.length - 1).join(',')
    fields = fields.slice(0, formats.length - 1)
    fields.push(textField)
  }
  return fields
}

export function getEventLineTime(formats: string[], event: string, startIndex: number, endIndex: number) {
  const [ , , value ] = event.match(/^(\w+?)\s*:\s*(.*)/i)
  const fields = parseEventLine(formats, value)
  return {
    start: hhColonDDColonSSDotMill2Int64(fields[startIndex]),
    end: hhColonDDColonSSDotMill2Int64(fields[endIndex])
  }
}

export function parseDrawing(text: string) {
  if (!text) {
    return []
  }
  return text
    .toLowerCase()
    // numbers
    .replace(/([+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?)/g, ' $1 ')
    // commands
    .replace(/([mnlbspc])/g, ' $1 ')
    .trim()
    .replace(/\s+/g, ' ')
    .split(/\s(?=[mnlbspc])/)
    .map((cmd) => (
      cmd.split(' ').filter((x, i) => !(i && Number.isNaN(+x)))
    ))
}

export function parseStyle(styleFormat: string[], style: string) {
  const values = style.match(/Style\s*:\s*(.*)/i)[1].split(/\s*,\s*/)
  const result: Record<string, string> = {}
  for (let i = 0; i < values.length; i++) {
    result[styleFormat[i]] = values[i]
  }
  return result
}

export function parseEvent(formats: string[], event: string) {
  const [ , key, value ] = event.match(/^(\w+?)\s*:\s*(.*)/i)

  let type: AssEventType = AssEventType.NONE

  switch (key) {
    case 'Comment':
      type = AssEventType.Comment
      break
    case 'Dialogue':
      type = AssEventType.Dialogue
      break
    case 'Command':
      type = AssEventType.Command
      break
    case 'Movie':
      type = AssEventType.Movie
      break
    case 'Picture':
      type = AssEventType.Picture
      break
    case 'Sound':
      type = AssEventType.Sound
      break
  }

  const fields = parseEventLine(formats, value)

  const result: Partial<AssEvent> = {
    type
  }
  for (let i = 0; i < fields.length; i++) {
    result[formats[i]] = fields[i]

    const fmt = formats[i]
    const fld = fields[i].trim()
    switch (fmt) {
      case 'Layer':
      case 'MarginL':
      case 'MarginR':
      case 'MarginV':
        result[fmt] = +fld
        break
      case 'Start':
      case 'End':
        result[fmt] = hhColonDDColonSSDotMill2Int64(fld)
        break
      case 'Effect':
        result[fmt] = parseEffect(fld)
        break
      case 'Text':
        result[fmt] = parseText(fld)
        break
      default:
        result[fmt] = fld
    }
  }
  return result as AssEvent
}


