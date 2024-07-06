[**libmedia**](../../../README.md) • **Docs**

***

[libmedia](../../../README.md) / [avplayer/AVPlayer](../README.md) / AVPlayerOptions

# Interface: AVPlayerOptions

## Properties

### checkUseMES()?

> `optional` **checkUseMES**: (`streams`) => `boolean`

#### Parameters

• **streams**: `AVStreamInterface`[]

#### Returns

`boolean`

#### Source

[avplayer/AVPlayer.ts:92](https://github.com/zhaohappy/libmedia/blob/a88305ff5d10e91621f2d71d24c72fc85681b8f7/src/avplayer/AVPlayer.ts#L92)

***

### container

> **container**: `HTMLDivElement`

#### Source

[avplayer/AVPlayer.ts:89](https://github.com/zhaohappy/libmedia/blob/a88305ff5d10e91621f2d71d24c72fc85681b8f7/src/avplayer/AVPlayer.ts#L89)

***

### enableHardware?

> `optional` **enableHardware**: `boolean`

#### Source

[avplayer/AVPlayer.ts:93](https://github.com/zhaohappy/libmedia/blob/a88305ff5d10e91621f2d71d24c72fc85681b8f7/src/avplayer/AVPlayer.ts#L93)

***

### enableWebGPU?

> `optional` **enableWebGPU**: `boolean`

#### Source

[avplayer/AVPlayer.ts:94](https://github.com/zhaohappy/libmedia/blob/a88305ff5d10e91621f2d71d24c72fc85681b8f7/src/avplayer/AVPlayer.ts#L94)

***

### getWasm()

> **getWasm**: (`type`, `codec`?) => `string` \| `ArrayBuffer` \| `WebAssemblyResource`

#### Parameters

• **type**: `"decoder"` \| `"resampler"` \| `"stretchpitcher"`

• **codec?**: `AVCodecID`

#### Returns

`string` \| `ArrayBuffer` \| `WebAssemblyResource`

#### Source

[avplayer/AVPlayer.ts:90](https://github.com/zhaohappy/libmedia/blob/a88305ff5d10e91621f2d71d24c72fc85681b8f7/src/avplayer/AVPlayer.ts#L90)

***

### isLive?

> `optional` **isLive**: `boolean`

#### Source

[avplayer/AVPlayer.ts:91](https://github.com/zhaohappy/libmedia/blob/a88305ff5d10e91621f2d71d24c72fc85681b8f7/src/avplayer/AVPlayer.ts#L91)

***

### jitterBufferMax?

> `optional` **jitterBufferMax**: `float`

#### Source

[avplayer/AVPlayer.ts:96](https://github.com/zhaohappy/libmedia/blob/a88305ff5d10e91621f2d71d24c72fc85681b8f7/src/avplayer/AVPlayer.ts#L96)

***

### jitterBufferMin?

> `optional` **jitterBufferMin**: `float`

#### Source

[avplayer/AVPlayer.ts:97](https://github.com/zhaohappy/libmedia/blob/a88305ff5d10e91621f2d71d24c72fc85681b8f7/src/avplayer/AVPlayer.ts#L97)

***

### loop?

> `optional` **loop**: `boolean`

#### Source

[avplayer/AVPlayer.ts:95](https://github.com/zhaohappy/libmedia/blob/a88305ff5d10e91621f2d71d24c72fc85681b8f7/src/avplayer/AVPlayer.ts#L95)

***

### lowLatency?

> `optional` **lowLatency**: `boolean`

#### Source

[avplayer/AVPlayer.ts:98](https://github.com/zhaohappy/libmedia/blob/a88305ff5d10e91621f2d71d24c72fc85681b8f7/src/avplayer/AVPlayer.ts#L98)
