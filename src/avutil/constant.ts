/*
 * libmedia constant
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

import { Rational } from './struct/rational'

export const NOPTS_VALUE_BIGINT: int64 = -1n

export const NOPTS_VALUE: int32 = -1

export const AV_TIME_BASE: int32 = 1000000

export const AV_MILLI_TIME_BASE: int32 = 1000

export const AV_NANO_TIME_BASE: int32 = 1000000000

export const NTP_OFFSET = 2208988800n
export const NTP_OFFSET_US = (NTP_OFFSET * 1000000n)

/**
 * 微秒时间基
 */
export const AV_TIME_BASE_Q = new Rational({den: AV_TIME_BASE, num: 1})

/**
 * 毫秒时间基
 */
export const AV_MILLI_TIME_BASE_Q = new Rational({den: AV_MILLI_TIME_BASE, num: 1})

/**
 * 纳秒时间基
 */
export const AV_NANO_TIME_BASE_Q = new Rational({den: AV_NANO_TIME_BASE, num: 1})

/**
 * 秒时间基
 */
export const AV_TIME_BASE1_Q = new Rational({den: 1, num: 1})

export const INT8_MAX: int8 = 127
export const INT16_MAX: int16 = 32767
export const INT32_MAX: int32 = 2147483647

export const INT8_MIN: int8  = -128
export const INT16_MIN: int16 = -32768
export const INT32_MIN: int32 = -INT32_MAX - 1

export const UINT8_MAX: uint8 = 255
export const UINT16_MAX: uint16 = 65535
export const UINT32_MAX: uint32 = 4294967295
