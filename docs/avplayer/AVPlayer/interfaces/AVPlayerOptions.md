[**libmedia**](../../../README.md) • **Docs**

***

[libmedia](../../../README.md) / [avplayer/AVPlayer](../README.md) / AVPlayerOptions

# Interface: AVPlayerOptions

## Properties

### checkUseMES()?

> `optional` **checkUseMES**: (`streams`) => `boolean`

#### Parameters

• **streams**: [`AVStreamInterface`](../../../avpipeline/DemuxPipeline/interfaces/AVStreamInterface.md)[]

#### Returns

`boolean`

#### Source

[avplayer/AVPlayer.ts:89](https://github.com/zhaohappy/libmedia/blob/acbbf6bd75e6ee4c968b9f441fe28c40f42f350d/src/avplayer/AVPlayer.ts#L89)

***

### container

> **container**: `HTMLDivElement`

#### Source

[avplayer/AVPlayer.ts:86](https://github.com/zhaohappy/libmedia/blob/acbbf6bd75e6ee4c968b9f441fe28c40f42f350d/src/avplayer/AVPlayer.ts#L86)

***

### enableHardware?

> `optional` **enableHardware**: `boolean`

#### Source

[avplayer/AVPlayer.ts:90](https://github.com/zhaohappy/libmedia/blob/acbbf6bd75e6ee4c968b9f441fe28c40f42f350d/src/avplayer/AVPlayer.ts#L90)

***

### enableWebGPU?

> `optional` **enableWebGPU**: `boolean`

#### Source

[avplayer/AVPlayer.ts:91](https://github.com/zhaohappy/libmedia/blob/acbbf6bd75e6ee4c968b9f441fe28c40f42f350d/src/avplayer/AVPlayer.ts#L91)

***

### getWasm()

> **getWasm**: (`type`, `codec`?) => `string` \| `ArrayBuffer`

#### Parameters

• **type**: `"decoder"` \| `"resampler"` \| `"stretchpitcher"`

• **codec?**: `AVCodecID`

#### Returns

`string` \| `ArrayBuffer`

#### Source

[avplayer/AVPlayer.ts:87](https://github.com/zhaohappy/libmedia/blob/acbbf6bd75e6ee4c968b9f441fe28c40f42f350d/src/avplayer/AVPlayer.ts#L87)

***

### isLive?

> `optional` **isLive**: `boolean`

#### Source

[avplayer/AVPlayer.ts:88](https://github.com/zhaohappy/libmedia/blob/acbbf6bd75e6ee4c968b9f441fe28c40f42f350d/src/avplayer/AVPlayer.ts#L88)

***

### jitterBufferMax?

> `optional` **jitterBufferMax**: `float`

#### Source

[avplayer/AVPlayer.ts:93](https://github.com/zhaohappy/libmedia/blob/acbbf6bd75e6ee4c968b9f441fe28c40f42f350d/src/avplayer/AVPlayer.ts#L93)

***

### jitterBufferMin?

> `optional` **jitterBufferMin**: `float`

#### Source

[avplayer/AVPlayer.ts:94](https://github.com/zhaohappy/libmedia/blob/acbbf6bd75e6ee4c968b9f441fe28c40f42f350d/src/avplayer/AVPlayer.ts#L94)

***

### loop?

> `optional` **loop**: `boolean`

#### Source

[avplayer/AVPlayer.ts:92](https://github.com/zhaohappy/libmedia/blob/acbbf6bd75e6ee4c968b9f441fe28c40f42f350d/src/avplayer/AVPlayer.ts#L92)

***

### lowLatency?

> `optional` **lowLatency**: `boolean`

#### Source

[avplayer/AVPlayer.ts:95](https://github.com/zhaohappy/libmedia/blob/acbbf6bd75e6ee4c968b9f441fe28c40f42f350d/src/avplayer/AVPlayer.ts#L95)
