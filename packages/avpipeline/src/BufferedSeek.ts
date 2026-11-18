/** Owned packet references, separate from the unread demux queues. */
export class PacketHistory<T> {
  private entries: { stream: number, packet: T, bytes: number }[] = []
  private bytes = 0

  constructor(private release: (packet: T) => void, private maxBytes = 32 * 1024 * 1024, private maxPackets = 8192) {}

  push(stream: number, packet: T, bytes: number) {
    if (!Number.isSafeInteger(bytes) || bytes < 0 || bytes > this.maxBytes) {
      // A skipped packet would leave a hole between history and the unread tail.
      this.clear()
      this.release(packet)
      return
    }
    this.entries.push({ stream, packet, bytes })
    this.bytes += bytes
    while (this.bytes > this.maxBytes || this.entries.length > this.maxPackets) {
      const oldest = this.entries.shift()!
      this.bytes -= oldest.bytes
      this.release(oldest.packet)
    }
  }

  packets(stream: number) {
    return this.entries.filter((entry) => entry.stream === stream).map((entry) => entry.packet)
  }

  take(stream: number, from: number) {
    const packets: T[] = []
    let index = 0
    this.entries = this.entries.filter((entry) => {
      if (entry.stream === stream && index++ >= from) {
        packets.push(entry.packet)
        this.bytes -= entry.bytes
        return false
      }
      return true
    })
    return packets
  }

  clear() {
    this.entries.forEach((entry) => this.release(entry.packet))
    this.entries = []
    this.bytes = 0
  }
}

export interface BufferedPacket {
  pts: bigint
  dts: bigint
  key: boolean
  usable: boolean
  configuration: boolean
}

/** Pure admission check. A miss must not mutate queues or their ownership. */
export function planBufferedSeek(streams: { index: number, video: boolean, packets: BufferedPacket[] }[], target: bigint) {
  if (target < 0n || !streams.length || streams.filter((stream) => stream.video).length > 1) {
    return
  }
  const starts = new Map<number, number>()
  const video = streams.find((stream) => stream.video)
  let startTime = target
  if (video) {
    let start = -1
    video.packets.forEach((packet, index) => {
      if (packet.usable && packet.key && packet.pts <= target && packet.pts >= 0n) {
        start = index
      }
    })
    if (start < 0 || target - video.packets[start].pts > 10000n) {
      return
    }
    starts.set(video.index, start)
    startTime = video.packets[start].pts
  }
  for (const stream of streams) {
    let start = starts.get(stream.index) ?? -1
    if (!stream.video) {
      stream.packets.forEach((packet, index) => {
        if (packet.pts <= startTime && packet.pts >= 0n) {
          start = index
        }
      })
      if (start < 0 || startTime - stream.packets[start].pts > 200n) {
        return
      }
      starts.set(stream.index, start)
    }
    let covered = false
    for (let i = start; i < stream.packets.length; i++) {
      const packet = stream.packets[i]
      const previous = stream.packets[i - 1]
      if (!packet.usable || packet.pts < 0n || i > start && (packet.configuration
        || packet.dts < previous.dts || packet.dts - previous.dts > (stream.video ? 1000n : 200n))) {
        return
      }
      // Keep a little runway beyond the target, including reordered pictures.
      if (packet.pts >= target + 100n) {
        covered = true
        break
      }
    }
    if (!covered) {
      return
    }
  }
  return starts
}
