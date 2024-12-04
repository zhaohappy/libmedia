/**
 * from https://github.com/clux/sdp-transform
 */

import { SessionDescription, Media } from './type'
import { grammars, SdpGrammar } from './grammars'
import { Data } from 'common/types/type'
import * as is from 'common/util/is'

/*
 * RFC specified order
 * TODO: extend this with all the rest
 */
const defaultOuterOrder = [
  'v', 'o', 's', 'i',
  'u', 'e', 'p', 'c',
  'b', 't', 'r', 'z', 'a'
]
const defaultInnerOrder = ['i', 'c', 'b', 'a']

const validLine = (line: string) => {
  return /^([a-z])=(.*)/.test(line)
}

function toIntIfInt(v: string | number) {
  return String(Number(v)) === v ? Number(v) : v
}

function attachProperties(
  match: RegExpMatchArray,
  location: SessionDescription | Media,
  names: string[],
  rawName: string
) {
  if (rawName && !names) {
    location[rawName] = toIntIfInt(match[1])
  }
  else {
    for (let i = 0; i < names.length; i += 1) {
      if (match[i + 1] != null) {
        location[names[i]] = toIntIfInt(match[i + 1])
      }
    }
  }
}

function parseReg(grammar: SdpGrammar, location: SessionDescription | Media, content: string) {
  const needsBlank = grammar.name && grammar.names
  if (grammar.push && !location[grammar.push]) {
    location[grammar.push] = []
  }
  else if (needsBlank && !location[grammar.name]) {
    location[grammar.name] = {}
  }
  const keyLocation = grammar.push
  // blank object that will be pushed
    ? {}
  // otherwise, named location or root
    : needsBlank ? location[grammar.name] : location

  attachProperties(content.match(grammar.reg), keyLocation, grammar.names, grammar.name)

  if (grammar.push) {
    location[grammar.push].push(keyLocation)
  }
}

// customized util.format - discards excess arguments and can void middle ones
const formatRegExp = /%[sdv%]/g

function format(formatStr: string) {
  let i = 1
  const args = arguments
  const len = args.length
  return formatStr.replace(formatRegExp, function (x) {
    if (i >= len) {
      // missing argument
      return x
    }
    const arg = args[i]
    i += 1
    switch (x) {
      case '%%':
        return '%'
      case '%s':
        return String(arg)
      case '%d':
        return Number(arg) + ''
      case '%v':
        return ''
    }
  })
}

function makeLine(type: string, grammar: SdpGrammar, location: Data) {
  const str = is.func(grammar.format)
    ? (grammar.format(grammar.push ? location : location[grammar.name]))
    : grammar.format

  const args = [
    type + '=' + str
  ]
  if (grammar.names) {
    for (let i = 0; i < grammar.names.length; i += 1) {
      const n = grammar.names[i]
      if (grammar.name) {
        args.push(location[grammar.name][n])
      }
      else {
        // for mLine and push attributes
        args.push(location[grammar.names[i]])
      }
    }
  }
  else {
    args.push(location[grammar.name])
  }
  return format.apply(null, args)
}

/**
 * 解析 sdp
 * 
 * @param sdp 
 * @returns 
 */
export function parse(sdp: string): SessionDescription {
  const session: Partial<SessionDescription> = {}
  const media: Partial<Media>[] = []
  let target: Partial<Media> | Partial<SessionDescription> = session

  // parse lines we understand
  sdp.split(/(\r\n|\r|\n)/).filter(validLine).forEach((line) => {
    const type = line[0]
    // x=xx
    const content = line.slice(2)

    if (type === 'm') {
      media.push({
        rtp: [],
        fmtp: []
      })
      // point at latest media line
      target = media[media.length - 1]
    }

    for (let j = 0; j < (grammars[type] || []).length; j += 1) {
      const grammar = grammars[type][j]
      if (grammar.reg.test(content)) {
        return parseReg(grammar, target as (Media | SessionDescription), content)
      }
    }
  })

  // link it up
  session.media = media as Media[]
  return session as SessionDescription
}

/**
 * 序列化 sdp
 * 
 * @param session 
 * @param options 
 * @returns 
 */
export function stringify(session: SessionDescription, options: {
  outerOrder: string[],
  innerOrder: string[]
} = {
  outerOrder: defaultOuterOrder,
  innerOrder: defaultInnerOrder
}): string {
  // ensure certain properties exist
  if (session.version == null) {
    // 'v=0' must be there (only defined version atm)
    session.version = 0
  }
  if (session.name == null) {
    // 's= ' must be there if no meaningful name set
    session.name = ' '
  }
  session.media.forEach(function (mLine) {
    if (mLine.payloads == null) {
      mLine.payloads = ''
    }
  })

  const sdp = []

  // loop through outerOrder for matching properties on session
  options.outerOrder.forEach((type) => {
    grammars[type].forEach((grammar) => {
      if (grammar.name in session && session[grammar.name] != null) {
        sdp.push(makeLine(type, grammar, session))
      }
      else if (grammar.push in session && session[grammar.push] != null) {
        session[grammar.push].forEach((params: Data) => {
          sdp.push(makeLine(type, grammar, params))
        })
      }
    })
  })

  // then for each media line, follow the innerOrder
  session.media.forEach((mLine) => {

    sdp.push(makeLine('m', grammars.m[0], mLine))

    options.innerOrder.forEach((type) => {
      grammars[type].forEach((grammar) => {
        if (grammar.name in mLine && mLine[grammar.name] != null) {
          sdp.push(makeLine(type, grammar, mLine))
        }
        else if (grammar.push in mLine && mLine[grammar.push] != null) {
          mLine[grammar.push].forEach(function (el: Data) {
            sdp.push(makeLine(type, grammar, el))
          })
        }
      })
    })
  })

  return sdp.join('\r\n') + '\r\n'
}

