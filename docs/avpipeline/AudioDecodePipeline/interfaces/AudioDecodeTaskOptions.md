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

[avpipeline/AudioDecodePipeline.ts:50](https://github.com/zhaohappy/libmedia/blob/b4bb608d2b1c00d036d73fc8d222b1a97be53694/src/avpipeline/AudioDecodePipeline.ts#L50)

***

### avframeListMutex

> **avframeListMutex**: `pointer`\<`Mutex`\>

#### Source

[avpipeline/AudioDecodePipeline.ts:51](https://github.com/zhaohappy/libmedia/blob/b4bb608d2b1c00d036d73fc8d222b1a97be53694/src/avpipeline/AudioDecodePipeline.ts#L51)

***

### avpacketList

> **avpacketList**: `pointer`\<`default`\<`pointer`\<[`AVPacketRef`](../../../avutil/struct/avpacket/classes/AVPacketRef.md)\>\>\>

#### Source

[avpipeline/AudioDecodePipeline.ts:48](https://github.com/zhaohappy/libmedia/blob/b4bb608d2b1c00d036d73fc8d222b1a97be53694/src/avpipeline/AudioDecodePipeline.ts#L48)

***

### avpacketListMutex

> **avpacketListMutex**: `pointer`\<`Mutex`\>

#### Source

[avpipeline/AudioDecodePipeline.ts:49](https://github.com/zhaohappy/libmedia/blob/b4bb608d2b1c00d036d73fc8d222b1a97be53694/src/avpipeline/AudioDecodePipeline.ts#L49)

***

### controlPort?

> `optional` **controlPort**: `MessagePort`

#### Inherited from

`TaskOptions.controlPort`

#### Source

[avpipeline/Pipeline.ts:32](https://github.com/zhaohappy/libmedia/blob/b4bb608d2b1c00d036d73fc8d222b1a97be53694/src/avpipeline/Pipeline.ts#L32)

***

### leftPort?

> `optional` **leftPort**: `MessagePort`

#### Inherited from

`TaskOptions.leftPort`

#### Source

[avpipeline/Pipeline.ts:30](https://github.com/zhaohappy/libmedia/blob/b4bb608d2b1c00d036d73fc8d222b1a97be53694/src/avpipeline/Pipeline.ts#L30)

***

### resource

> **resource**: `WebAssemblyResource`

#### Source

[avpipeline/AudioDecodePipeline.ts:47](https://github.com/zhaohappy/libmedia/blob/b4bb608d2b1c00d036d73fc8d222b1a97be53694/src/avpipeline/AudioDecodePipeline.ts#L47)

***

### rightPort?

> `optional` **rightPort**: `MessagePort`

#### Inherited from

`TaskOptions.rightPort`

#### Source

[avpipeline/Pipeline.ts:31](https://github.com/zhaohappy/libmedia/blob/b4bb608d2b1c00d036d73fc8d222b1a97be53694/src/avpipeline/Pipeline.ts#L31)

***

### stats

> **stats**: `pointer`\<`default`\>

#### Inherited from

`TaskOptions.stats`

#### Source

[avpipeline/Pipeline.ts:34](https://github.com/zhaohappy/libmedia/blob/b4bb608d2b1c00d036d73fc8d222b1a97be53694/src/avpipeline/Pipeline.ts#L34)

***

### taskId

> **taskId**: `string`

#### Inherited from

`TaskOptions.taskId`

#### Source

[avpipeline/Pipeline.ts:33](https://github.com/zhaohappy/libmedia/blob/b4bb608d2b1c00d036d73fc8d222b1a97be53694/src/avpipeline/Pipeline.ts#L33)
