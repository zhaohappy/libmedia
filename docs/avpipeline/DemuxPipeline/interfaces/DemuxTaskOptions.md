[**libmedia**](../../../README.md) • **Docs**

***

[libmedia](../../../README.md) / [avpipeline/DemuxPipeline](../README.md) / DemuxTaskOptions

# Interface: DemuxTaskOptions

## Extends

- `TaskOptions`

## Properties

### avpacketList

> **avpacketList**: `pointer`\<`default`\<`pointer`\<[`AVPacketRef`](../../../avutil/struct/avpacket/classes/AVPacketRef.md)\>\>\>

#### Source

[avpipeline/DemuxPipeline.ts:74](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avpipeline/DemuxPipeline.ts#L74)

***

### avpacketListMutex

> **avpacketListMutex**: `pointer`\<`Mutex`\>

#### Source

[avpipeline/DemuxPipeline.ts:75](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avpipeline/DemuxPipeline.ts#L75)

***

### bufferLength?

> `optional` **bufferLength**: `number`

#### Source

[avpipeline/DemuxPipeline.ts:70](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avpipeline/DemuxPipeline.ts#L70)

***

### controlPort?

> `optional` **controlPort**: `MessagePort`

#### Inherited from

`TaskOptions.controlPort`

#### Source

[avpipeline/Pipeline.ts:32](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avpipeline/Pipeline.ts#L32)

***

### flags?

> `optional` **flags**: `int32`

#### Source

[avpipeline/DemuxPipeline.ts:76](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avpipeline/DemuxPipeline.ts#L76)

***

### format?

> `optional` **format**: `AVFormat`

#### Source

[avpipeline/DemuxPipeline.ts:69](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avpipeline/DemuxPipeline.ts#L69)

***

### ioloaderOptions?

> `optional` **ioloaderOptions**: `Data`

#### Source

[avpipeline/DemuxPipeline.ts:72](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avpipeline/DemuxPipeline.ts#L72)

***

### isLive?

> `optional` **isLive**: `boolean`

#### Source

[avpipeline/DemuxPipeline.ts:71](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avpipeline/DemuxPipeline.ts#L71)

***

### leftPort?

> `optional` **leftPort**: `MessagePort`

#### Inherited from

`TaskOptions.leftPort`

#### Source

[avpipeline/Pipeline.ts:30](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avpipeline/Pipeline.ts#L30)

***

### mainTaskId?

> `optional` **mainTaskId**: `string`

#### Source

[avpipeline/DemuxPipeline.ts:73](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avpipeline/DemuxPipeline.ts#L73)

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
