[**libmedia**](../../../README.md) • **Docs**

***

[libmedia](../../../README.md) / [avpipeline/VideoDecodePipeline](../README.md) / VideoDecodeTaskOptions

# Interface: VideoDecodeTaskOptions

## Extends

- `TaskOptions`

## Properties

### avframeList

> **avframeList**: `pointer`\<`default`\<`pointer`\<[`AVFrameRef`](../../../avutil/struct/avframe/classes/AVFrameRef.md)\>\>\>

#### Source

[avpipeline/VideoDecodePipeline.ts:57](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avpipeline/VideoDecodePipeline.ts#L57)

***

### avframeListMutex

> **avframeListMutex**: `pointer`\<`Mutex`\>

#### Source

[avpipeline/VideoDecodePipeline.ts:58](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avpipeline/VideoDecodePipeline.ts#L58)

***

### avpacketList

> **avpacketList**: `pointer`\<`default`\<`pointer`\<[`AVPacketRef`](../../../avutil/struct/avpacket/classes/AVPacketRef.md)\>\>\>

#### Source

[avpipeline/VideoDecodePipeline.ts:55](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avpipeline/VideoDecodePipeline.ts#L55)

***

### avpacketListMutex

> **avpacketListMutex**: `pointer`\<`Mutex`\>

#### Source

[avpipeline/VideoDecodePipeline.ts:56](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avpipeline/VideoDecodePipeline.ts#L56)

***

### controlPort?

> `optional` **controlPort**: `MessagePort`

#### Inherited from

`TaskOptions.controlPort`

#### Source

[avpipeline/Pipeline.ts:32](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avpipeline/Pipeline.ts#L32)

***

### enableHardware

> **enableHardware**: `boolean`

#### Source

[avpipeline/VideoDecodePipeline.ts:54](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avpipeline/VideoDecodePipeline.ts#L54)

***

### leftPort?

> `optional` **leftPort**: `MessagePort`

#### Inherited from

`TaskOptions.leftPort`

#### Source

[avpipeline/Pipeline.ts:30](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avpipeline/Pipeline.ts#L30)

***

### resource

> **resource**: `WebAssemblyResource`

#### Source

[avpipeline/VideoDecodePipeline.ts:53](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avpipeline/VideoDecodePipeline.ts#L53)

***

### rightPort?

> `optional` **rightPort**: `MessagePort`

#### Inherited from

`TaskOptions.rightPort`

#### Source

[avpipeline/Pipeline.ts:31](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avpipeline/Pipeline.ts#L31)

***

### stats

> **stats**: `pointer`\<`default`\>

#### Inherited from

`TaskOptions.stats`

#### Source

[avpipeline/Pipeline.ts:34](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avpipeline/Pipeline.ts#L34)

***

### taskId

> **taskId**: `string`

#### Inherited from

`TaskOptions.taskId`

#### Source

[avpipeline/Pipeline.ts:33](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avpipeline/Pipeline.ts#L33)
