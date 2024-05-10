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

[avpipeline/VideoRenderPipeline.ts:163](https://github.com/zhaohappy/libmedia/blob/b4bb608d2b1c00d036d73fc8d222b1a97be53694/src/avpipeline/VideoRenderPipeline.ts#L163)

## Properties

### tasks

> **tasks**: `Map`\<`string`, `SelfTask`\>

#### Overrides

`Pipeline.tasks`

#### Source

[avpipeline/VideoRenderPipeline.ts:161](https://github.com/zhaohappy/libmedia/blob/b4bb608d2b1c00d036d73fc8d222b1a97be53694/src/avpipeline/VideoRenderPipeline.ts#L161)

## Methods

### afterSeek()

> **afterSeek**(`taskId`, `timestamp`): `Promise`\<`void`\>

#### Parameters

• **taskId**: `string`

• **timestamp**: `int64`

#### Returns

`Promise`\<`void`\>

#### Source

[avpipeline/VideoRenderPipeline.ts:896](https://github.com/zhaohappy/libmedia/blob/b4bb608d2b1c00d036d73fc8d222b1a97be53694/src/avpipeline/VideoRenderPipeline.ts#L896)

***

### beforeSeek()

> **beforeSeek**(`taskId`): `Promise`\<`void`\>

#### Parameters

• **taskId**: `string`

#### Returns

`Promise`\<`void`\>

#### Source

[avpipeline/VideoRenderPipeline.ts:811](https://github.com/zhaohappy/libmedia/blob/b4bb608d2b1c00d036d73fc8d222b1a97be53694/src/avpipeline/VideoRenderPipeline.ts#L811)

***

### clear()

> **clear**(): `Promise`\<`void`\>

#### Returns

`Promise`\<`void`\>

#### Inherited from

`Pipeline.clear`

#### Source

[avpipeline/Pipeline.ts:48](https://github.com/zhaohappy/libmedia/blob/b4bb608d2b1c00d036d73fc8d222b1a97be53694/src/avpipeline/Pipeline.ts#L48)

***

### enableHorizontalFlip()

> **enableHorizontalFlip**(`taskId`, `enable`): `Promise`\<`void`\>

#### Parameters

• **taskId**: `string`

• **enable**: `boolean`

#### Returns

`Promise`\<`void`\>

#### Source

[avpipeline/VideoRenderPipeline.ts:763](https://github.com/zhaohappy/libmedia/blob/b4bb608d2b1c00d036d73fc8d222b1a97be53694/src/avpipeline/VideoRenderPipeline.ts#L763)

***

### enableVerticalFlip()

> **enableVerticalFlip**(`taskId`, `enable`): `Promise`\<`void`\>

#### Parameters

• **taskId**: `string`

• **enable**: `boolean`

#### Returns

`Promise`\<`void`\>

#### Source

[avpipeline/VideoRenderPipeline.ts:776](https://github.com/zhaohappy/libmedia/blob/b4bb608d2b1c00d036d73fc8d222b1a97be53694/src/avpipeline/VideoRenderPipeline.ts#L776)

***

### getTaskCount()

> **getTaskCount**(): `Promise`\<`number`\>

#### Returns

`Promise`\<`number`\>

#### Inherited from

`Pipeline.getTaskCount`

#### Source

[avpipeline/Pipeline.ts:60](https://github.com/zhaohappy/libmedia/blob/b4bb608d2b1c00d036d73fc8d222b1a97be53694/src/avpipeline/Pipeline.ts#L60)

***

### pause()

> **pause**(`taskId`): `Promise`\<`void`\>

#### Parameters

• **taskId**: `string`

#### Returns

`Promise`\<`void`\>

#### Source

[avpipeline/VideoRenderPipeline.ts:667](https://github.com/zhaohappy/libmedia/blob/b4bb608d2b1c00d036d73fc8d222b1a97be53694/src/avpipeline/VideoRenderPipeline.ts#L667)

***

### play()

> **play**(`taskId`): `Promise`\<`void`\>

#### Parameters

• **taskId**: `string`

#### Returns

`Promise`\<`void`\>

#### Source

[avpipeline/VideoRenderPipeline.ts:342](https://github.com/zhaohappy/libmedia/blob/b4bb608d2b1c00d036d73fc8d222b1a97be53694/src/avpipeline/VideoRenderPipeline.ts#L342)

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

[avpipeline/VideoRenderPipeline.ts:934](https://github.com/zhaohappy/libmedia/blob/b4bb608d2b1c00d036d73fc8d222b1a97be53694/src/avpipeline/VideoRenderPipeline.ts#L934)

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

[avpipeline/VideoRenderPipeline.ts:789](https://github.com/zhaohappy/libmedia/blob/b4bb608d2b1c00d036d73fc8d222b1a97be53694/src/avpipeline/VideoRenderPipeline.ts#L789)

***

### restart()

> **restart**(`taskId`): `Promise`\<`void`\>

#### Parameters

• **taskId**: `string`

#### Returns

`Promise`\<`void`\>

#### Source

[avpipeline/VideoRenderPipeline.ts:612](https://github.com/zhaohappy/libmedia/blob/b4bb608d2b1c00d036d73fc8d222b1a97be53694/src/avpipeline/VideoRenderPipeline.ts#L612)

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

[avpipeline/Pipeline.ts:56](https://github.com/zhaohappy/libmedia/blob/b4bb608d2b1c00d036d73fc8d222b1a97be53694/src/avpipeline/Pipeline.ts#L56)

***

### setPlayRate()

> **setPlayRate**(`taskId`, `rate`): `Promise`\<`void`\>

#### Parameters

• **taskId**: `string`

• **rate**: `double`

#### Returns

`Promise`\<`void`\>

#### Source

[avpipeline/VideoRenderPipeline.ts:721](https://github.com/zhaohappy/libmedia/blob/b4bb608d2b1c00d036d73fc8d222b1a97be53694/src/avpipeline/VideoRenderPipeline.ts#L721)

***

### setRenderMode()

> **setRenderMode**(`taskId`, `mode`): `Promise`\<`void`\>

#### Parameters

• **taskId**: `string`

• **mode**: `RenderMode`

#### Returns

`Promise`\<`void`\>

#### Source

[avpipeline/VideoRenderPipeline.ts:737](https://github.com/zhaohappy/libmedia/blob/b4bb608d2b1c00d036d73fc8d222b1a97be53694/src/avpipeline/VideoRenderPipeline.ts#L737)

***

### setRenderRotate()

> **setRenderRotate**(`taskId`, `rotate`): `Promise`\<`void`\>

#### Parameters

• **taskId**: `string`

• **rotate**: `double`

#### Returns

`Promise`\<`void`\>

#### Source

[avpipeline/VideoRenderPipeline.ts:750](https://github.com/zhaohappy/libmedia/blob/b4bb608d2b1c00d036d73fc8d222b1a97be53694/src/avpipeline/VideoRenderPipeline.ts#L750)

***

### setSkipRender()

> **setSkipRender**(`taskId`, `skip`): `Promise`\<`void`\>

#### Parameters

• **taskId**: `string`

• **skip**: `boolean`

#### Returns

`Promise`\<`void`\>

#### Source

[avpipeline/VideoRenderPipeline.ts:801](https://github.com/zhaohappy/libmedia/blob/b4bb608d2b1c00d036d73fc8d222b1a97be53694/src/avpipeline/VideoRenderPipeline.ts#L801)

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

[avpipeline/VideoRenderPipeline.ts:848](https://github.com/zhaohappy/libmedia/blob/b4bb608d2b1c00d036d73fc8d222b1a97be53694/src/avpipeline/VideoRenderPipeline.ts#L848)

***

### unpause()

> **unpause**(`taskId`): `Promise`\<`void`\>

#### Parameters

• **taskId**: `string`

#### Returns

`Promise`\<`void`\>

#### Source

[avpipeline/VideoRenderPipeline.ts:682](https://github.com/zhaohappy/libmedia/blob/b4bb608d2b1c00d036d73fc8d222b1a97be53694/src/avpipeline/VideoRenderPipeline.ts#L682)

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

[avpipeline/VideoRenderPipeline.ts:941](https://github.com/zhaohappy/libmedia/blob/b4bb608d2b1c00d036d73fc8d222b1a97be53694/src/avpipeline/VideoRenderPipeline.ts#L941)

***

### updateCanvas()

> **updateCanvas**(`taskId`, `canvas`): `Promise`\<`void`\>

#### Parameters

• **taskId**: `string`

• **canvas**: `OffscreenCanvas` \| `HTMLCanvasElement`

#### Returns

`Promise`\<`void`\>

#### Source

[avpipeline/VideoRenderPipeline.ts:703](https://github.com/zhaohappy/libmedia/blob/b4bb608d2b1c00d036d73fc8d222b1a97be53694/src/avpipeline/VideoRenderPipeline.ts#L703)
