
/*
 * libmedia ass defined
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

export const enum AssStylesFormat {
  Name = 'Name',
  FontName = 'Fontname',
  FontSize = 'Fontsize',
  PrimaryColour = 'PrimaryColour',
  SecondaryColour = 'SecondaryColour',
  OutlineColour = 'OutlineColour',
  BackColour = 'BackColour',
  Bold = 'Bold',
  Italic = 'Italic',
  Underline = 'Underline',
  StrikeOut = 'StrikeOut',
  ScaleX = 'ScaleX',
  ScaleY = 'ScaleY',
  Spacing = 'Spacing',
  Angle = 'Angle',
  BorderStyle = 'BorderStyle',
  Outline = 'Outline',
  Shadow = 'Shadow',
  Alignment = 'Alignment',
  MarginL = 'MarginL',
  MarginR = 'MarginR',
  MarginV = 'MarginV',
  Encoding = 'Encoding'
}

export const enum AssEventsFormat {
  ReadOrder = 'ReadOrder',
  Layer = 'Layer',
  Start = 'Start',
  End = 'End',
  Style = 'Style',
  Name = 'Name',
  MarginL = 'MarginL',
  MarginR = 'MarginR',
  MarginV = 'MarginV',
  Effect = 'Effect',
  Text = 'Text'
}

export const AssStylesFormatList = [
  AssStylesFormat.Name,
  AssStylesFormat.FontName,
  AssStylesFormat.FontSize,
  AssStylesFormat.PrimaryColour,
  AssStylesFormat.SecondaryColour,
  AssStylesFormat.OutlineColour,
  AssStylesFormat.BackColour,
  AssStylesFormat.Bold,
  AssStylesFormat.Italic,
  AssStylesFormat.Underline,
  AssStylesFormat.StrikeOut,
  AssStylesFormat.ScaleX,
  AssStylesFormat.ScaleY,
  AssStylesFormat.Spacing,
  AssStylesFormat.Angle,
  AssStylesFormat.BorderStyle,
  AssStylesFormat.Outline,
  AssStylesFormat.Shadow,
  AssStylesFormat.Alignment,
  AssStylesFormat.MarginL,
  AssStylesFormat.MarginR,
  AssStylesFormat.MarginV,
  AssStylesFormat.Encoding
]

export const AssEventsFormatList = [
  AssEventsFormat.ReadOrder,
  AssEventsFormat.Layer,
  AssEventsFormat.Start,
  AssEventsFormat.End,
  AssEventsFormat.Style,
  AssEventsFormat.Name,
  AssEventsFormat.MarginL,
  AssEventsFormat.MarginR,
  AssEventsFormat.MarginV,
  AssEventsFormat.Effect,
  AssEventsFormat.Text
]

export const enum AssEventType {
  NONE,
  Dialogue,
  Comment,
  Picture,
  Sound,
  Movie,
  Command
}

export interface AssEffect {
  name: string
}

export interface AssEffectBanner extends AssEffect {
  delay: number
  fadeAwayWidth: number
  leftToRight: number
}

export interface AssEffectScroll extends AssEffect {
  delay: number
  fadeAwayHeight: number
  y1: number
  y2: number
}

export interface AssEventTextParsed {
  tags: AssTag[]
  text: string
  drawing: string[][]
}

export interface AssEventText {
  raw: string;
  combined: string;
  parsed: AssEventTextParsed[]
}

export interface AssEvent {
  type: AssEventType
  ReadOrder: number
  Layer: number
  Start: int64
  End: int64
  Style: string
  Name: string
  MarginL: number
  MarginR: number
  MarginV: number
  Effect?: AssEffect
  Text: AssEventText
}

export interface AssTag {
  a?: 0 | 1 | 2 | 3 | 5 | 6 | 7 | 9 | 10 | 11
  a1?: string
  a2?: string
  a3?: string
  a4?: string
  alpha?: string
  an?: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9
  b?: 0 | 1
  be?: number
  blur?: number
  bord?: number
  c1?: string
  c2?: string
  c3?: string
  c4?: string
  clip?: {
    inverse: boolean
    scale: number
    drawing?: string[][]
    dots?: [number, number, number, number]
  }
  fad?: [number, number]
  fade?: [number, number, number, number, number, number]
  fax?: number
  fay?: number
  fe?: number
  fn?: string
  fr?: number
  frx?: number
  fry?: number
  frz?: number
  fs?: string
  fscx?: number
  fscy?: number
  fsp?: number
  i?: 0 | 1
  k?: number
  kf?: number
  ko?: number
  kt?: number
  K?: number
  move?: [number, number, number, number] | [number, number, number, number, number, number]
  org?: [number, number]
  p?: number
  pbo?: number
  pos?: [number, number]
  q?: 0 | 1 | 2 | 3
  r?: string
  s?: 0 | 1
  shad?: number
  t?: {
    t1: number
    t2: number
    accel: number
    tags: AssTag[]
  }
  u?: 0 | 1
  xbord?: number
  xshad?: number
  ybord?: number
  yshad?: number
}
