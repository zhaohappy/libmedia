[**libmedia**](../../../README.md) • **Docs**

***

[libmedia](../../../README.md) / [avpipeline/VideoRenderPipeline](../README.md) / VideoRenderPipeline

# Class: VideoRenderPipeline

## Extends

- `default`

## Constructors

### new VideoRenderPipeline()

> **new VideoRenderPipeline**(): [`VideoRenderPipeline`](VideoRenderPipeline.md)

#### Returns

[`VideoRenderPipeline`](VideoRenderPipeline.md)

#### Overrides

`Pipeline.constructor`

#### Source

[avpipeline/VideoRenderPipeline.ts:169](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avpipeline/VideoRenderPipeline.ts#L169)

## Properties

### tasks

> **tasks**: `Map`\<`string`, `SelfTask`\>

#### Overrides

`Pipeline.tasks`

#### Source

[avpipeline/VideoRenderPipeline.ts:167](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avpipeline/VideoRenderPipeline.ts#L167)

## Methods

### afterSeek()

> **afterSeek**(`taskId`, `timestamp`): `Promise`\<`void`\>

#### Parameters

• **taskId**: `string`

• **timestamp**: `int64`

#### Returns

`Promise`\<`void`\>

#### Source

[avpipeline/VideoRenderPipeline.ts:939](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avpipeline/VideoRenderPipeline.ts#L939)

***

### beforeSeek()

> **beforeSeek**(`taskId`): `Promise`\<`void`\>

#### Parameters

• **taskId**: `string`

#### Returns

`Promise`\<`void`\>

#### Source

[avpipeline/VideoRenderPipeline.ts:854](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avpipeline/VideoRenderPipeline.ts#L854)

***

### clear()

> **clear**(): `Promise`\<`void`\>

#### Returns

`Promise`\<`void`\>

#### Inherited from

`Pipeline.clear`

#### Source

[avpipeline/Pipeline.ts:48](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avpipeline/Pipeline.ts#L48)

***

### enableHorizontalFlip()

> **enableHorizontalFlip**(`taskId`, `enable`): `Promise`\<`void`\>

#### Parameters

• **taskId**: `string`

• **enable**: `boolean`

#### Returns

`Promise`\<`void`\>

#### Source

[avpipeline/VideoRenderPipeline.ts:791](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avpipeline/VideoRenderPipeline.ts#L791)

***

### enableVerticalFlip()

> **enableVerticalFlip**(`taskId`, `enable`): `Promise`\<`void`\>

#### Parameters

• **taskId**: `string`

• **enable**: `boolean`

#### Returns

`Promise`\<`void`\>

#### Source

[avpipeline/VideoRenderPipeline.ts:809](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avpipeline/VideoRenderPipeline.ts#L809)

***

### getTaskCount()

> **getTaskCount**(): `Promise`\<`number`\>

#### Returns

`Promise`\<`number`\>

#### Inherited from

`Pipeline.getTaskCount`

#### Source

[avpipeline/Pipeline.ts:60](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avpipeline/Pipeline.ts#L60)

***

### pause()

> **pause**(`taskId`): `Promise`\<`void`\>

#### Parameters

• **taskId**: `string`

#### Returns

`Promise`\<`void`\>

#### Source

[avpipeline/VideoRenderPipeline.ts:685](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avpipeline/VideoRenderPipeline.ts#L685)

***

### play()

> **play**(`taskId`): `Promise`\<`void`\>

#### Parameters

• **taskId**: `string`

#### Returns

`Promise`\<`void`\>

#### Source

[avpipeline/VideoRenderPipeline.ts:351](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avpipeline/VideoRenderPipeline.ts#L351)

***

### registerTask()

> **registerTask**(`options`): `Promise`\<`number`\>

#### Parameters

• **options**: [`VideoRenderTaskOptions`](../interfaces/VideoRenderTaskOptions.md)

#### Returns

`Promise`\<`number`\>

#### Overrides

`Pipeline.registerTask`

#### Source

[avpipeline/VideoRenderPipeline.ts:977](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avpipeline/VideoRenderPipeline.ts#L977)

***

### resize()

> **resize**(`taskId`, `width`, `height`): `Promise`\<`void`\>

#### Parameters

• **taskId**: `string`

• **width**: `int32`

• **height**: `int32`

#### Returns

`Promise`\<`void`\>

#### Source

[avpipeline/VideoRenderPipeline.ts:827](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avpipeline/VideoRenderPipeline.ts#L827)

***

### restart()

> **restart**(`taskId`): `Promise`\<`void`\>

#### Parameters

• **taskId**: `string`

#### Returns

`Promise`\<`void`\>

#### Source

[avpipeline/VideoRenderPipeline.ts:630](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avpipeline/VideoRenderPipeline.ts#L630)

***

### setLogLevel()

> **setLogLevel**(`level`): `Promise`\<`void`\>

#### Parameters

• **level**: `number`

#### Returns

`Promise`\<`void`\>

#### Inherited from

`Pipeline.setLogLevel`

#### Source

[avpipeline/Pipeline.ts:56](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avpipeline/Pipeline.ts#L56)

***

### setPlayRate()

> **setPlayRate**(`taskId`, `rate`): `Promise`\<`void`\>

#### Parameters

• **taskId**: `string`

• **rate**: `double`

#### Returns

`Promise`\<`void`\>

#### Source

[avpipeline/VideoRenderPipeline.ts:739](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avpipeline/VideoRenderPipeline.ts#L739)

***

### setRenderMode()

> **setRenderMode**(`taskId`, `mode`): `Promise`\<`void`\>

#### Parameters

• **taskId**: `string`

• **mode**: `RenderMode`

#### Returns

`Promise`\<`void`\>

#### Source

[avpipeline/VideoRenderPipeline.ts:755](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avpipeline/VideoRenderPipeline.ts#L755)

***

### setRenderRotate()

> **setRenderRotate**(`taskId`, `rotate`): `Promise`\<`void`\>

#### Parameters

• **taskId**: `string`

• **rotate**: `double`

#### Returns

`Promise`\<`void`\>

#### Source

[avpipeline/VideoRenderPipeline.ts:773](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avpipeline/VideoRenderPipeline.ts#L773)

***

### setSkipRender()

> **setSkipRender**(`taskId`, `skip`): `Promise`\<`void`\>

#### Parameters

• **taskId**: `string`

• **skip**: `boolean`

#### Returns

`Promise`\<`void`\>

#### Source

[avpipeline/VideoRenderPipeline.ts:844](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avpipeline/VideoRenderPipeline.ts#L844)

***

### syncSeekTime()

> **syncSeekTime**(`taskId`, `timestamp`, `maxQueueLength`?): `Promise`\<`void`\>

#### Parameters

• **taskId**: `string`

• **timestamp**: `int64`

• **maxQueueLength?**: `number`

#### Returns

`Promise`\<`void`\>

#### Source

[avpipeline/VideoRenderPipeline.ts:891](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avpipeline/VideoRenderPipeline.ts#L891)

***

### unpause()

> **unpause**(`taskId`): `Promise`\<`void`\>

#### Parameters

• **taskId**: `string`

#### Returns

`Promise`\<`void`\>

#### Source

[avpipeline/VideoRenderPipeline.ts:700](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avpipeline/VideoRenderPipeline.ts#L700)

***

### unregisterTask()

> **unregisterTask**(`id`): `Promise`\<`void`\>

#### Parameters

• **id**: `string`

#### Returns

`Promise`\<`void`\>

#### Overrides

`Pipeline.unregisterTask`

#### Source

[avpipeline/VideoRenderPipeline.ts:984](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avpipeline/VideoRenderPipeline.ts#L984)

***

### updateCanvas()

> **updateCanvas**(`taskId`, `canvas`): `Promise`\<`void`\>

#### Parameters

• **taskId**: `string`

• **canvas**: `OffscreenCanvas` \| `HTMLCanvasElement`

#### Returns

`Promise`\<`void`\>

#### Source

[avpipeline/VideoRenderPipeline.ts:721](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avpipeline/VideoRenderPipeline.ts#L721)
