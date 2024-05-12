[**libmedia**](../../../README.md) • **Docs**

***

[libmedia](../../../README.md) / [avpipeline/VideoRenderPipeline](../README.md) / VideoRenderTaskOptions

# Interface: VideoRenderTaskOptions

## Extends

- `TaskOptions`

## Properties

### avframeList

> **avframeList**: `pointer`\<`default`\<`pointer`\<[`AVFrameRef`](../../../avutil/struct/avframe/classes/AVFrameRef.md)\>\>\>

#### Source

[avpipeline/VideoRenderPipeline.ts:101](https://github.com/zhaohappy/libmedia/blob/acbbf6bd75e6ee4c968b9f441fe28c40f42f350d/src/avpipeline/VideoRenderPipeline.ts#L101)

***

### avframeListMutex

> **avframeListMutex**: `pointer`\<`Mutex`\>

#### Source

[avpipeline/VideoRenderPipeline.ts:102](https://github.com/zhaohappy/libmedia/blob/acbbf6bd75e6ee4c968b9f441fe28c40f42f350d/src/avpipeline/VideoRenderPipeline.ts#L102)

***

### canvas

> **canvas**: `OffscreenCanvas` \| `HTMLCanvasElement`

#### Source

[avpipeline/VideoRenderPipeline.ts:90](https://github.com/zhaohappy/libmedia/blob/acbbf6bd75e6ee4c968b9f441fe28c40f42f350d/src/avpipeline/VideoRenderPipeline.ts#L90)

***

### controlPort?

> `optional` **controlPort**: `MessagePort`

#### Inherited from

`TaskOptions.controlPort`

#### Source

[avpipeline/Pipeline.ts:32](https://github.com/zhaohappy/libmedia/blob/acbbf6bd75e6ee4c968b9f441fe28c40f42f350d/src/avpipeline/Pipeline.ts#L32)

***

### devicePixelRatio

> **devicePixelRatio**: `double`

#### Source

[avpipeline/VideoRenderPipeline.ts:98](https://github.com/zhaohappy/libmedia/blob/acbbf6bd75e6ee4c968b9f441fe28c40f42f350d/src/avpipeline/VideoRenderPipeline.ts#L98)

***

### enableJitterBuffer

> **enableJitterBuffer**: `boolean`

#### Source

[avpipeline/VideoRenderPipeline.ts:103](https://github.com/zhaohappy/libmedia/blob/acbbf6bd75e6ee4c968b9f441fe28c40f42f350d/src/avpipeline/VideoRenderPipeline.ts#L103)

***

### enableWebGPU

> **enableWebGPU**: `boolean`

#### Source

[avpipeline/VideoRenderPipeline.ts:99](https://github.com/zhaohappy/libmedia/blob/acbbf6bd75e6ee4c968b9f441fe28c40f42f350d/src/avpipeline/VideoRenderPipeline.ts#L99)

***

### flipHorizontal

> **flipHorizontal**: `boolean`

#### Source

[avpipeline/VideoRenderPipeline.ts:93](https://github.com/zhaohappy/libmedia/blob/acbbf6bd75e6ee4c968b9f441fe28c40f42f350d/src/avpipeline/VideoRenderPipeline.ts#L93)

***

### flipVertical

> **flipVertical**: `boolean`

#### Source

[avpipeline/VideoRenderPipeline.ts:94](https://github.com/zhaohappy/libmedia/blob/acbbf6bd75e6ee4c968b9f441fe28c40f42f350d/src/avpipeline/VideoRenderPipeline.ts#L94)

***

### jitterBuffer

> **jitterBuffer**: `pointer`\<`JitterBuffer`\>

#### Source

[avpipeline/VideoRenderPipeline.ts:104](https://github.com/zhaohappy/libmedia/blob/acbbf6bd75e6ee4c968b9f441fe28c40f42f350d/src/avpipeline/VideoRenderPipeline.ts#L104)

***

### leftPort?

> `optional` **leftPort**: `MessagePort`

#### Inherited from

`TaskOptions.leftPort`

#### Source

[avpipeline/Pipeline.ts:30](https://github.com/zhaohappy/libmedia/blob/acbbf6bd75e6ee4c968b9f441fe28c40f42f350d/src/avpipeline/Pipeline.ts#L30)

***

### renderMode

> **renderMode**: `RenderMode`

#### Source

[avpipeline/VideoRenderPipeline.ts:91](https://github.com/zhaohappy/libmedia/blob/acbbf6bd75e6ee4c968b9f441fe28c40f42f350d/src/avpipeline/VideoRenderPipeline.ts#L91)

***

### renderRotate

> **renderRotate**: `double`

#### Source

[avpipeline/VideoRenderPipeline.ts:92](https://github.com/zhaohappy/libmedia/blob/acbbf6bd75e6ee4c968b9f441fe28c40f42f350d/src/avpipeline/VideoRenderPipeline.ts#L92)

***

### rightPort?

> `optional` **rightPort**: `MessagePort`

#### Inherited from

`TaskOptions.rightPort`

#### Source

[avpipeline/Pipeline.ts:31](https://github.com/zhaohappy/libmedia/blob/acbbf6bd75e6ee4c968b9f441fe28c40f42f350d/src/avpipeline/Pipeline.ts#L31)

***

### startPTS

> **startPTS**: `int64`

#### Source

[avpipeline/VideoRenderPipeline.ts:100](https://github.com/zhaohappy/libmedia/blob/acbbf6bd75e6ee4c968b9f441fe28c40f42f350d/src/avpipeline/VideoRenderPipeline.ts#L100)

***

### stats

> **stats**: `pointer`\<`default`\>

#### Inherited from

`TaskOptions.stats`

#### Source

[avpipeline/Pipeline.ts:34](https://github.com/zhaohappy/libmedia/blob/acbbf6bd75e6ee4c968b9f441fe28c40f42f350d/src/avpipeline/Pipeline.ts#L34)

***

### taskId

> **taskId**: `string`

#### Inherited from

`TaskOptions.taskId`

#### Source

[avpipeline/Pipeline.ts:33](https://github.com/zhaohappy/libmedia/blob/acbbf6bd75e6ee4c968b9f441fe28c40f42f350d/src/avpipeline/Pipeline.ts#L33)

***

### timeBase

> **timeBase**: `Rational`

#### Source

[avpipeline/VideoRenderPipeline.ts:95](https://github.com/zhaohappy/libmedia/blob/acbbf6bd75e6ee4c968b9f441fe28c40f42f350d/src/avpipeline/VideoRenderPipeline.ts#L95)

***

### viewportHeight

> **viewportHeight**: `int32`

#### Source

[avpipeline/VideoRenderPipeline.ts:97](https://github.com/zhaohappy/libmedia/blob/acbbf6bd75e6ee4c968b9f441fe28c40f42f350d/src/avpipeline/VideoRenderPipeline.ts#L97)

***

### viewportWidth

> **viewportWidth**: `int32`

#### Source

[avpipeline/VideoRenderPipeline.ts:96](https://github.com/zhaohappy/libmedia/blob/acbbf6bd75e6ee4c968b9f441fe28c40f42f350d/src/avpipeline/VideoRenderPipeline.ts#L96)
