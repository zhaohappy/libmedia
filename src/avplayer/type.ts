import { AVMediaType } from 'avutil/codec'

export declare function player_event_no_param(): void

export declare function player_event_time(pts: int64): void

export declare function player_event_changing(type: AVMediaType, newStreamId: int32, oldStreamId: int32): void

export declare function player_event_changed(type: AVMediaType, newStreamId: int32, oldStreamId: int32): void

export declare function player_event_error(error: Error): void