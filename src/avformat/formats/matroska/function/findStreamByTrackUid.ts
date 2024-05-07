import AVStream from '../../../AVStream'
import { TrackEntry } from '../type'

export default function findStreamByTrackUid(streams: AVStream[], uid: uint64) {
  for (let i = 0; i < streams.length; i++) {
    const track = streams[i].privData as TrackEntry
    if (track.uid === uid) {
      return streams[i]
    }
  }
}
