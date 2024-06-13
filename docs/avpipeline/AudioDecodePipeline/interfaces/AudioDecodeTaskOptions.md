[**libmedia**](../../../README.md) • **Docs**

***

[libmedia](../../../README.md) / [avpipeline/AudioDecodePipeline](../README.md) / AudioDecodeTaskOptions

# Interface: AudioDecodeTaskOptions

## Extends

- `TaskOptions`

## Properties

### avframeList

> **avframeList**: `pointer`\<`default`\<`pointer`\<[`AVFrameRef`](../../../avutil/struct/avframe/classes/AVFrameRef.md)\>\>\>

#### Source

[avpipeline/AudioDecodePipeline.ts:53](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avpipeline/AudioDecodePipeline.ts#L53)

***

### avframeListMutex

> **avframeListMutex**: `pointer`\<`Mutex`\>

#### Source

[avpipeline/AudioDecodePipeline.ts:54](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avpipeline/AudioDecodePipeline.ts#L54)

***

### avpacketList

> **avpacketList**: `pointer`\<`default`\<`pointer`\<[`AVPacketRef`](../../../avutil/struct/avpacket/classes/AVPacketRef.md)\>\>\>

#### Source

[avpipeline/AudioDecodePipeline.ts:51](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avpipeline/AudioDecodePipeline.ts#L51)

***

### avpacketListMutex

> **avpacketListMutex**: `pointer`\<`Mutex`\>

#### Source

[avpipeline/AudioDecodePipeline.ts:52](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avpipeline/AudioDecodePipeline.ts#L52)

***

### controlPort?

> `optional` **controlPort**: `MessagePort`

#### Inherited from

`TaskOptions.controlPort`

#### Source

[avpipeline/Pipeline.ts:32](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avpipeline/Pipeline.ts#L32)

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

[avpipeline/AudioDecodePipeline.ts:50](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avpipeline/AudioDecodePipeline.ts#L50)

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

***

### timeBase

> **timeBase**: `Rational`

#### Source

[avpipeline/AudioDecodePipeline.ts:55](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avpipeline/AudioDecodePipeline.ts#L55)
