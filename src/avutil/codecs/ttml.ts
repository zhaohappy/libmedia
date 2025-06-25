
import xml2Json from 'common/util/xml2Json'
import * as is from 'common/util/is'
import * as array from 'common/util/array'
import { hhColonDDColonSSDotMill2Int64 } from 'common/util/time'

interface Span {
  context: string | (string | { tagName: string, context?: string } )[]
  region?: string
  begin: string
  end?: string
}

interface P {
  begin: string
  end?: string
  dur?: string
  context: string | (string | { tagName: string, context?: string } )[]
  region?: string
  span?: Span | Span[]
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

  function addSpan(span: Span, context: string, region: string, pts: int64, end: string, p: P) {
    if (span?.context) {
      if (pts === -1n && span.begin) {
        pts = hhColonDDColonSSDotMill2Int64(span.begin)
      }
      if (span.region) {
        region = span.region
      }
      if (is.string(span.context)) {
        context += span.context
      }
      else {
        context += formatContext(span.context)
      }
    }
    queue.push({
      context,
      pts,
      region: region,
      duration: p.dur ? hhColonDDColonSSDotMill2Int64(p.dur) : (hhColonDDColonSSDotMill2Int64(end || p.end || span.end) - pts)
    })
  }

  function add(p: P, start: string, end: string) {
    let pts = hhColonDDColonSSDotMill2Int64(start || p.begin)

    let context = p.context || ''
    let region = p.region || 'Default'

    if (is.array(context)) {
      context = formatContext(context)
    }
    if (is.array(p.span)) {
      array.each(p.span, (span) => {
        addSpan(span, context, region, pts, end, p)
      })
    }
    else if (p.span) {
      addSpan(p.span, context, region, pts, end, p)
    }
    else {
      queue.push({
        context,
        pts,
        region: region,
        duration: p.dur ? hhColonDDColonSSDotMill2Int64(p.dur) : (hhColonDDColonSSDotMill2Int64(end || p.end) - pts)
      })
    }
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
