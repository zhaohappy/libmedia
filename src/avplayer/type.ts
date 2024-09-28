import { AVMediaType } from 'avutil/codec'

export declare function playerEventNoParam(): void

export declare function playerEventTime(pts: int64): void

export declare function playerEventChanging(type: AVMediaType, newStreamId: int32, oldStreamId: int32): void

export declare function playerEventChanged(type: AVMediaType, newStreamId: int32, oldStreamId: int32): void

export declare function playerEventError(error: Error): void
