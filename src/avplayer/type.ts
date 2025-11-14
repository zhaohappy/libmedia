import type { AVPlayerProgress } from './AVPlayer'
import type { AVMediaType } from '@libmedia/avutil'

export declare function playerEventNoParam(): void

export declare function playerEventTime(pts: int64): void

export declare function playerEventChanging(type: AVMediaType, newStreamId: int32, oldStreamId: int32): void

export declare function playerEventChanged(type: AVMediaType, newStreamId: int32, oldStreamId: int32): void

export declare function playerEventError(error: Error): void

export declare function playerEventProgress(progress: AVPlayerProgress, data: any): void

export declare function playerEventVolumeChange(volume: double): void

export declare function playerEventSubtitleDelayChange(delay: int32): void
