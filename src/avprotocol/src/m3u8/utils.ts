/**
 * from https://github.com/kuu/hls-parser/blob/master/utils.ts
 * MIT license 
 */

function toNumber(str: string, radix = 10) {
  if (typeof str === 'number') {
    return str
  }
  const num = radix === 10 ? Number.parseFloat(str) : Number.parseInt(str, radix)
  if (Number.isNaN(num)) {
    return 0
  }
  return num
}

function hexToByteSequence(str: string): Uint8Array {
  if (str.startsWith('0x') || str.startsWith('0X')) {
    str = str.slice(2)
  }
  const numArray: number[] = []
  for (let i = 0; i < str.length; i += 2) {
    numArray.push(toNumber(str.slice(i, i + 2), 16))
  }
  return new Uint8Array(numArray)
}

function splitAt(str: string, delimiter: string, index = 0): [string] | [string, string] {
  let lastDelimiterPos = -1
  for (let i = 0, j = 0; i < str.length; i++) {
    if (str[i] === delimiter) {
      if (j++ === index) {
        return [str.slice(0, i), str.slice(i + 1)]
      }
      lastDelimiterPos = i
    }
  }
  if (lastDelimiterPos !== -1) {
    return [str.slice(0, lastDelimiterPos), str.slice(lastDelimiterPos + 1)]
  }
  return [str]
}

function trim(str: string | undefined, char = ' ') {
  if (!str) {
    return str
  }
  str = str.trim()
  if (char === ' ') {
    return str
  }
  if (str.startsWith(char)) {
    str = str.slice(1)
  }
  if (str.endsWith(char)) {
    str = str.slice(0, -1)
  }
  return str
}

function splitByCommaWithPreservingQuotes(str: string) {
  const list: string[] = []
  let doParse = true
  let start = 0
  const prevQuotes: string[] = []
  for (let i = 0; i < str.length; i++) {
    const curr = str[i]
    if (doParse && curr === ',') {
      list.push(str.slice(start, i).trim())
      start = i + 1
      continue
    }
    if (curr === '"' || curr === '\'') {
      if (doParse) {
        prevQuotes.push(curr)
        doParse = false
      }
      else if (curr === prevQuotes[prevQuotes.length - 1]) {
        prevQuotes.pop()
        doParse = true
      }
      else {
        prevQuotes.push(curr)
      }
    }
  }
  list.push(str.slice(start).trim())
  return list
}

function camelify(str: string) {
  const array: string[] = []
  let nextUpper = false
  for (const ch of str) {
    if (ch === '-' || ch === '_') {
      nextUpper = true
      continue
    }
    if (nextUpper) {
      array.push(ch.toUpperCase())
      nextUpper = false
      continue
    }
    array.push(ch.toLowerCase())
  }
  return array.join('')
}

export {
  toNumber,
  hexToByteSequence,
  splitAt,
  trim,
  splitByCommaWithPreservingQuotes,
  camelify
}
