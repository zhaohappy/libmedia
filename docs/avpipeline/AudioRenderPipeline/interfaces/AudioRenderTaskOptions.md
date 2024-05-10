[**libmedia**](../../../README.md) • **Docs**

***

[libmedia](../../../README.md) / [avpipeline/AudioRenderPipeline](../README.md) / AudioRenderTaskOptions

# Interface: AudioRenderTaskOptions

## Extends

- `TaskOptions`

## Properties

### avframeList

> **avframeList**: `pointer`\<`default`\<`pointer`\<[`AVFrameRef`](../../../avutil/struct/avframe/classes/AVFrameRef.md)\>\>\>

#### Source

[avpipeline/AudioRenderPipeline.ts:61](https://github.com/zhaohappy/libmedia/blob/b4bb608d2b1c00d036d73fc8d222b1a97be53694/src/avpipeline/AudioRenderPipeline.ts#L61)

***

### avframeListMutex

> **avframeListMutex**: `pointer`\<`Mutex`\>

#### Source

[avpipeline/AudioRenderPipeline.ts:62](https://github.com/zhaohappy/libmedia/blob/b4bb608d2b1c00d036d73fc8d222b1a97be53694/src/avpipeline/AudioRenderPipeline.ts#L62)

***

### controlPort?

> `optional` **controlPort**: `MessagePort`

#### Inherited from

`TaskOptions.controlPort`

#### Source

[avpipeline/Pipeline.ts:32](https://github.com/zhaohappy/libmedia/blob/b4bb608d2b1c00d036d73fc8d222b1a97be53694/src/avpipeline/Pipeline.ts#L32)

***

### enableJitterBuffer

> **enableJitterBuffer**: `boolean`

#### Source

[avpipeline/AudioRenderPipeline.ts:63](https://github.com/zhaohappy/libmedia/blob/b4bb608d2b1c00d036d73fc8d222b1a97be53694/src/avpipeline/AudioRenderPipeline.ts#L63)

***

### jitterBuffer

> **jitterBuffer**: `pointer`\<`JitterBuffer`\>

#### Source

[avpipeline/AudioRenderPipeline.ts:64](https://github.com/zhaohappy/libmedia/blob/b4bb608d2b1c00d036d73fc8d222b1a97be53694/src/avpipeline/AudioRenderPipeline.ts#L64)

***

### leftPort?

> `optional` **leftPort**: `MessagePort`

#### Inherited from

`TaskOptions.leftPort`

#### Source

[avpipeline/Pipeline.ts:30](https://github.com/zhaohappy/libmedia/blob/b4bb608d2b1c00d036d73fc8d222b1a97be53694/src/avpipeline/Pipeline.ts#L30)

***

### playChannels

> **playChannels**: `int32`

#### Source

[avpipeline/AudioRenderPipeline.ts:56](https://github.com/zhaohappy/libmedia/blob/b4bb608d2b1c00d036d73fc8d222b1a97be53694/src/avpipeline/AudioRenderPipeline.ts#L56)

***

### playFormat

> **playFormat**: `AVSampleFormat`

#### Source

[avpipeline/AudioRenderPipeline.ts:55](https://github.com/zhaohappy/libmedia/blob/b4bb608d2b1c00d036d73fc8d222b1a97be53694/src/avpipeline/AudioRenderPipeline.ts#L55)

***

### playSampleRate

> **playSampleRate**: `int32`

#### Source

[avpipeline/AudioRenderPipeline.ts:54](https://github.com/zhaohappy/libmedia/blob/b4bb608d2b1c00d036d73fc8d222b1a97be53694/src/avpipeline/AudioRenderPipeline.ts#L54)

***

### resamplerResource

> **resamplerResource**: `WebAssemblyResource`

#### Source

[avpipeline/AudioRenderPipeline.ts:57](https://github.com/zhaohappy/libmedia/blob/b4bb608d2b1c00d036d73fc8d222b1a97be53694/src/avpipeline/AudioRenderPipeline.ts#L57)

***

### rightPort?

> `optional` **rightPort**: `MessagePort`

#### Inherited from

`TaskOptions.rightPort`

#### Source

[avpipeline/Pipeline.ts:31](https://github.com/zhaohappy/libmedia/blob/b4bb608d2b1c00d036d73fc8d222b1a97be53694/src/avpipeline/Pipeline.ts#L31)

***

### startPTS

> **startPTS**: `int64`

#### Source

[avpipeline/AudioRenderPipeline.ts:60](https://github.com/zhaohappy/libmedia/blob/b4bb608d2b1c00d036d73fc8d222b1a97be53694/src/avpipeline/AudioRenderPipeline.ts#L60)

***

### stats

> **stats**: `pointer`\<`default`\>

#### Inherited from

`TaskOptions.stats`

#### Source

[avpipeline/Pipeline.ts:34](https://github.com/zhaohappy/libmedia/blob/b4bb608d2b1c00d036d73fc8d222b1a97be53694/src/avpipeline/Pipeline.ts#L34)

***

### stretchpitcherResource

> **stretchpitcherResource**: `WebAssemblyResource`

#### Source

[avpipeline/AudioRenderPipeline.ts:58](https://github.com/zhaohappy/libmedia/blob/b4bb608d2b1c00d036d73fc8d222b1a97be53694/src/avpipeline/AudioRenderPipeline.ts#L58)

***

### taskId

> **taskId**: `string`

#### Inherited from

`TaskOptions.taskId`

#### Source

[avpipeline/Pipeline.ts:33](https://github.com/zhaohappy/libmedia/blob/b4bb608d2b1c00d036d73fc8d222b1a97be53694/src/avpipeline/Pipeline.ts#L33)

***

### timeBase

> **timeBase**: `Rational`

#### Source

[avpipeline/AudioRenderPipeline.ts:59](https://github.com/zhaohappy/libmedia/blob/b4bb608d2b1c00d036d73fc8d222b1a97be53694/src/avpipeline/AudioRenderPipeline.ts#L59)
