
import xml2Json from 'common/util/xml2Json'
import * as is from 'common/util/is'
import * as array from 'common/util/array'
import { hhColonDDColonSSDotMill2Int64 } from 'common/util/time'

interface P {
  begin: string
  end?: string
  dur?: string
  context: string | (string | { tagName: string, context?: string } )[]
  region?: string
  span?: {
    context: string | (string | { tagName: string, context?: string } )[]
    region?: string
  }
}

export function parse(text: string) {
  const xml = xml2Json(text, {
    aloneValueName: 'context'
  })

  if (!xml.tt) {
    return {
      queue: [],
      head: {}
    }
  }

  const queue: {
    pts: int64
    duration: int64
    context: string
    region: string
  }[] = []

  function formatContext(list: (string | { tagName: string, context?: string } )[]) {
    let context = ''
    array.each(list, ((c) => {
      if (is.string(c)) {
        context += c
      }
      else {
        if (c.context) {
          context += `<${c.tagName}>${c.context}</${c.tagName}>`
        }
        else {
          context += `<${c.tagName}/>`
        }
      }
    }))
    return context
  }

  function add(p: P, start: string, end: string) {
    const pts = hhColonDDColonSSDotMill2Int64(start || p.begin)

    let context = p.context || ''
    let region = p.region || 'Default'

    if (is.array(context)) {
      context = formatContext(context)
    }
    if (p.span?.context) {
      if (p.span.region) {
        region = p.span.region
      }
      if (is.string(p.span.context)) {
        context += p.span.context
      }
      else {
        context += formatContext(p.span.context)
      }
    }
    queue.push({
      context,
      pts,
      region: region,
      duration: p.dur ? hhColonDDColonSSDotMill2Int64(p.dur) : (hhColonDDColonSSDotMill2Int64(end || p.end) - pts),
    })
  }

  function praseP(p: P | P[], start: string, end: string) {
    if (is.array(p)) {
      array.each(p, (_) => {
        add(_, start, end)
      })
    }
    else {
      add(p, start, end)
    }
  }

  if (xml.tt.body) {
    if (xml.tt.body.div) {
      if (is.array(xml.tt.body.div)) {
        array.each(xml.tt.body.div, (div: any) => {
          if (div.p) {
            praseP(div.p, div.begin, div.end)
          }
        })
      }
      else {
        if (xml.tt.body.div.p) {
          praseP(xml.tt.body.div.p, xml.tt.body.div.begin, xml.tt.body.end)
        }
      }
    }
  }
  return {
    queue,
    head: xml.tt.head || {}
  }
}
