import AVStream from '../../../AVStream'
import { TrackEntry } from '../type'

export default function findStreamByTrackNumber(streams: AVStream[], number: uint32) {
  for (let i = 0; i < streams.length; i++) {
    const track = streams[i].privData as TrackEntry
    if (track.number === number) {
      return streams[i]
    }
  }
}
