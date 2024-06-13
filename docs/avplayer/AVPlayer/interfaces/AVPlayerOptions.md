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

[avplayer/AVPlayer.ts:90](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avplayer/AVPlayer.ts#L90)

***

### container

> **container**: `HTMLDivElement`

#### Source

[avplayer/AVPlayer.ts:87](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avplayer/AVPlayer.ts#L87)

***

### enableHardware?

> `optional` **enableHardware**: `boolean`

#### Source

[avplayer/AVPlayer.ts:91](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avplayer/AVPlayer.ts#L91)

***

### enableWebGPU?

> `optional` **enableWebGPU**: `boolean`

#### Source

[avplayer/AVPlayer.ts:92](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avplayer/AVPlayer.ts#L92)

***

### getWasm()

> **getWasm**: (`type`, `codec`?) => `string` \| `ArrayBuffer` \| `WebAssemblyResource`

#### Parameters

• **type**: `"decoder"` \| `"resampler"` \| `"stretchpitcher"`

• **codec?**: `AVCodecID`

#### Returns

`string` \| `ArrayBuffer` \| `WebAssemblyResource`

#### Source

[avplayer/AVPlayer.ts:88](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avplayer/AVPlayer.ts#L88)

***

### isLive?

> `optional` **isLive**: `boolean`

#### Source

[avplayer/AVPlayer.ts:89](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avplayer/AVPlayer.ts#L89)

***

### jitterBufferMax?

> `optional` **jitterBufferMax**: `float`

#### Source

[avplayer/AVPlayer.ts:94](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avplayer/AVPlayer.ts#L94)

***

### jitterBufferMin?

> `optional` **jitterBufferMin**: `float`

#### Source

[avplayer/AVPlayer.ts:95](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avplayer/AVPlayer.ts#L95)

***

### loop?

> `optional` **loop**: `boolean`

#### Source

[avplayer/AVPlayer.ts:93](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avplayer/AVPlayer.ts#L93)

***

### lowLatency?

> `optional` **lowLatency**: `boolean`

#### Source

[avplayer/AVPlayer.ts:96](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avplayer/AVPlayer.ts#L96)
