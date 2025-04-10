/*
 * libmedia avdict util
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

import { readCString, writeCString } from 'cheap/std/memory'
import { AVDictFlags, AVDictionary, AVDictionaryEntry } from '../struct/avdict'
import { avFreep, avMallocz } from './mem'
import * as is from 'common/util/is'
import toString from 'common/function/toString'

export function freeAVDict(pm: pointer<pointer<AVDictionary>>) {
  freeAVDict2(accessof(pm))
  avFreep(pm)
}

export function freeAVDict2(m: pointer<AVDictionary>) {
  if (m) {
    while (m.count--) {
      avFreep(addressof(m.elems[m.count].key))
      avFreep(addressof(m.elems[m.count].value))
    }
    avFreep(addressof(m.elems))
  }
}

export function avDictCount(m: pointer<AVDictionary>) {
  return m ? m.count : 0
}

export function avDictIterate(m: pointer<AVDictionary>, prev: pointer<AVDictionaryEntry>): pointer<AVDictionaryEntry> {

  let i = 0
  if (!m) {
    return nullptr
  }
  if (prev) {
    i = prev - m.elems + 1
  }

  assert(i >= 0)

  if (i >= m.count) {
    return nullptr
  }
  return addressof(m.elems[i])
}

export function avDictGet(m: pointer<AVDictionary>, key: string, prev: pointer<AVDictionaryEntry> = nullptr, flags: int32 = 0): pointer<AVDictionaryEntry> {

  if (!m) {
    return nullptr
  }

  let entry: pointer<AVDictionaryEntry> = prev

  if (!key) {
    return nullptr
  }

  while ((entry = avDictIterate(m, entry))) {
    let s = readCString(reinterpret_cast<pointer<char>>(entry.key))
    if (flags & AVDictFlags.MATCH_CASE) {
      s.toLocaleLowerCase()
      key.toLocaleLowerCase()
    }
    if (s === key
      || (
        (flags & AVDictFlags.IGNORE_SUFFIX)
        && s.indexOf(key) === 0
      )
    ) {
      return entry
    }
  }
}

export function avDictSet(m: pointer<AVDictionary>, key: string, value: string, flags: int32 = 0) {
  if (!m) {
    throw new Error('m is nullptr')
  }

  let tag: pointer<AVDictionaryEntry> = nullptr

  if (flags & AVDictFlags.MULTIKEY) {
    tag = avDictGet(m, key, nullptr, flags)
  }

  if (tag) {
    if (flags & AVDictFlags.DONT_OVERWRITE) {
      return 0
    }
    if (flags & AVDictFlags.APPEND) {
      value = `${readCString(reinterpret_cast<pointer<char>>(tag.value))},${value}`
    }
    free(tag.value)
    tag.value = malloc(value.length + 1)
    writeCString(tag.value, value, value.length)
  }
  else {
    if (!is.string(value)) {
      value = toString(value)
    }
    let tmp = reinterpret_cast<pointer<AVDictionaryEntry>>(realloc(m.elems, (m.count + 1) * reinterpret_cast<int32>(sizeof(AVDictionaryEntry))))
    m.elems = tmp

    m.elems[m.count].key = malloc(key.length + 1)
    m.elems[m.count].value = malloc(value.length + 1)

    writeCString(m.elems[m.count].key, key, key.length)
    writeCString(m.elems[m.count].value, value, value.length)

    m.count++
  }

  return 0
}

function avDictSet2(pm: pointer<pointer<AVDictionary>>, key: string, value: string, flags: int32 = 0) {
  let m = accessof(pm)
  if (!m) {
    m = reinterpret_cast<pointer<AVDictionary>>(avMallocz(sizeof(accessof(m))))
    accessof(pm) <- m
  }
  return avDictSet(m, key, value, flags)
}

export function avDictCopy(dst: pointer<pointer<AVDictionary>>, src: pointer<AVDictionary>, flags: int32) {
  if (!src) {
    return -1
  }

  let t: pointer<AVDictionaryEntry> = nullptr

  while ((t = avDictIterate(src, t))) {
    let ret = avDictSet2(dst, readCString(reinterpret_cast<pointer<char>>(t.key)), readCString(reinterpret_cast<pointer<char>>(t.value)), flags)
    if (ret < 0) {
      return ret
    }
  }

  return 0
}
