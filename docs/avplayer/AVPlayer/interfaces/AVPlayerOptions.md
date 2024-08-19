[**libmedia**](../../../README.md) • **Docs**

***

[libmedia](../../../README.md) / [avplayer/AVPlayer](../README.md) / AVPlayerOptions

# Interface: AVPlayerOptions

## Properties

### checkUseMES()?

> `optional` **checkUseMES**: (`streams`) => `boolean`

#### Parameters

• **streams**: [`AVStreamInterface`](../../../avformat/AVStream/interfaces/AVStreamInterface.md)[]

#### Returns

`boolean`

#### Source

[avplayer/AVPlayer.ts:121](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avplayer/AVPlayer.ts#L121)

***

### container

> **container**: `HTMLDivElement`

#### Source

[avplayer/AVPlayer.ts:118](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avplayer/AVPlayer.ts#L118)

***

### enableHardware?

> `optional` **enableHardware**: `boolean`

#### Source

[avplayer/AVPlayer.ts:122](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avplayer/AVPlayer.ts#L122)

***

### enableWebGPU?

> `optional` **enableWebGPU**: `boolean`

#### Source

[avplayer/AVPlayer.ts:123](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avplayer/AVPlayer.ts#L123)

***

### findBestStream()?

> `optional` **findBestStream**: (`streams`, `mediaType`) => [`AVStreamInterface`](../../../avformat/AVStream/interfaces/AVStreamInterface.md)

#### Parameters

• **streams**: [`AVStreamInterface`](../../../avformat/AVStream/interfaces/AVStreamInterface.md)[]

• **mediaType**: `AVMediaType`

#### Returns

[`AVStreamInterface`](../../../avformat/AVStream/interfaces/AVStreamInterface.md)

#### Source

[avplayer/AVPlayer.ts:128](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avplayer/AVPlayer.ts#L128)

***

### getWasm()

> **getWasm**: (`type`, `codecId`?, `mediaType`?) => `string` \| `ArrayBuffer` \| `WebAssemblyResource`

#### Parameters

• **type**: `"decoder"` \| `"resampler"` \| `"stretchpitcher"`

• **codecId?**: `AVCodecID`

• **mediaType?**: `AVMediaType`

#### Returns

`string` \| `ArrayBuffer` \| `WebAssemblyResource`

#### Source

[avplayer/AVPlayer.ts:119](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avplayer/AVPlayer.ts#L119)

***

### isLive?

> `optional` **isLive**: `boolean`

#### Source

[avplayer/AVPlayer.ts:120](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avplayer/AVPlayer.ts#L120)

***

### jitterBufferMax?

> `optional` **jitterBufferMax**: `float`

#### Source

[avplayer/AVPlayer.ts:125](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avplayer/AVPlayer.ts#L125)

***

### jitterBufferMin?

> `optional` **jitterBufferMin**: `float`

#### Source

[avplayer/AVPlayer.ts:126](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avplayer/AVPlayer.ts#L126)

***

### loop?

> `optional` **loop**: `boolean`

#### Source

[avplayer/AVPlayer.ts:124](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avplayer/AVPlayer.ts#L124)

***

### lowLatency?

> `optional` **lowLatency**: `boolean`

#### Source

[avplayer/AVPlayer.ts:127](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avplayer/AVPlayer.ts#L127)
