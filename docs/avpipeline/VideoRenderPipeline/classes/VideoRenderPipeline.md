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

[avpipeline/VideoRenderPipeline.ts:169](https://github.com/zhaohappy/libmedia/blob/a88305ff5d10e91621f2d71d24c72fc85681b8f7/src/avpipeline/VideoRenderPipeline.ts#L169)

## Properties

### tasks

> **tasks**: `Map`\<`string`, `SelfTask`\>

#### Overrides

`Pipeline.tasks`

#### Source

[avpipeline/VideoRenderPipeline.ts:167](https://github.com/zhaohappy/libmedia/blob/a88305ff5d10e91621f2d71d24c72fc85681b8f7/src/avpipeline/VideoRenderPipeline.ts#L167)

## Methods

### afterSeek()

> **afterSeek**(`taskId`, `timestamp`): `Promise`\<`void`\>

#### Parameters

• **taskId**: `string`

• **timestamp**: `int64`

#### Returns

`Promise`\<`void`\>

#### Source

[avpipeline/VideoRenderPipeline.ts:941](https://github.com/zhaohappy/libmedia/blob/a88305ff5d10e91621f2d71d24c72fc85681b8f7/src/avpipeline/VideoRenderPipeline.ts#L941)

***

### beforeSeek()

> **beforeSeek**(`taskId`): `Promise`\<`void`\>

#### Parameters

• **taskId**: `string`

#### Returns

`Promise`\<`void`\>

#### Source

[avpipeline/VideoRenderPipeline.ts:856](https://github.com/zhaohappy/libmedia/blob/a88305ff5d10e91621f2d71d24c72fc85681b8f7/src/avpipeline/VideoRenderPipeline.ts#L856)

***

### clear()

> **clear**(): `Promise`\<`void`\>

#### Returns

`Promise`\<`void`\>

#### Inherited from

`Pipeline.clear`

#### Source

[avpipeline/Pipeline.ts:48](https://github.com/zhaohappy/libmedia/blob/a88305ff5d10e91621f2d71d24c72fc85681b8f7/src/avpipeline/Pipeline.ts#L48)

***

### enableHorizontalFlip()

> **enableHorizontalFlip**(`taskId`, `enable`): `Promise`\<`void`\>

#### Parameters

• **taskId**: `string`

• **enable**: `boolean`

#### Returns

`Promise`\<`void`\>

#### Source

[avpipeline/VideoRenderPipeline.ts:793](https://github.com/zhaohappy/libmedia/blob/a88305ff5d10e91621f2d71d24c72fc85681b8f7/src/avpipeline/VideoRenderPipeline.ts#L793)

***

### enableVerticalFlip()

> **enableVerticalFlip**(`taskId`, `enable`): `Promise`\<`void`\>

#### Parameters

• **taskId**: `string`

• **enable**: `boolean`

#### Returns

`Promise`\<`void`\>

#### Source

[avpipeline/VideoRenderPipeline.ts:811](https://github.com/zhaohappy/libmedia/blob/a88305ff5d10e91621f2d71d24c72fc85681b8f7/src/avpipeline/VideoRenderPipeline.ts#L811)

***

### getTaskCount()

> **getTaskCount**(): `Promise`\<`number`\>

#### Returns

`Promise`\<`number`\>

#### Inherited from

`Pipeline.getTaskCount`

#### Source

[avpipeline/Pipeline.ts:60](https://github.com/zhaohappy/libmedia/blob/a88305ff5d10e91621f2d71d24c72fc85681b8f7/src/avpipeline/Pipeline.ts#L60)

***

### pause()

> **pause**(`taskId`): `Promise`\<`void`\>

#### Parameters

• **taskId**: `string`

#### Returns

`Promise`\<`void`\>

#### Source

[avpipeline/VideoRenderPipeline.ts:687](https://github.com/zhaohappy/libmedia/blob/a88305ff5d10e91621f2d71d24c72fc85681b8f7/src/avpipeline/VideoRenderPipeline.ts#L687)

***

### play()

> **play**(`taskId`): `Promise`\<`void`\>

#### Parameters

• **taskId**: `string`

#### Returns

`Promise`\<`void`\>

#### Source

[avpipeline/VideoRenderPipeline.ts:351](https://github.com/zhaohappy/libmedia/blob/a88305ff5d10e91621f2d71d24c72fc85681b8f7/src/avpipeline/VideoRenderPipeline.ts#L351)

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

[avpipeline/VideoRenderPipeline.ts:979](https://github.com/zhaohappy/libmedia/blob/a88305ff5d10e91621f2d71d24c72fc85681b8f7/src/avpipeline/VideoRenderPipeline.ts#L979)

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

[avpipeline/VideoRenderPipeline.ts:829](https://github.com/zhaohappy/libmedia/blob/a88305ff5d10e91621f2d71d24c72fc85681b8f7/src/avpipeline/VideoRenderPipeline.ts#L829)

***

### restart()

> **restart**(`taskId`): `Promise`\<`void`\>

#### Parameters

• **taskId**: `string`

#### Returns

`Promise`\<`void`\>

#### Source

[avpipeline/VideoRenderPipeline.ts:632](https://github.com/zhaohappy/libmedia/blob/a88305ff5d10e91621f2d71d24c72fc85681b8f7/src/avpipeline/VideoRenderPipeline.ts#L632)

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

[avpipeline/Pipeline.ts:56](https://github.com/zhaohappy/libmedia/blob/a88305ff5d10e91621f2d71d24c72fc85681b8f7/src/avpipeline/Pipeline.ts#L56)

***

### setPlayRate()

> **setPlayRate**(`taskId`, `rate`): `Promise`\<`void`\>

#### Parameters

• **taskId**: `string`

• **rate**: `double`

#### Returns

`Promise`\<`void`\>

#### Source

[avpipeline/VideoRenderPipeline.ts:741](https://github.com/zhaohappy/libmedia/blob/a88305ff5d10e91621f2d71d24c72fc85681b8f7/src/avpipeline/VideoRenderPipeline.ts#L741)

***

### setRenderMode()

> **setRenderMode**(`taskId`, `mode`): `Promise`\<`void`\>

#### Parameters

• **taskId**: `string`

• **mode**: `RenderMode`

#### Returns

`Promise`\<`void`\>

#### Source

[avpipeline/VideoRenderPipeline.ts:757](https://github.com/zhaohappy/libmedia/blob/a88305ff5d10e91621f2d71d24c72fc85681b8f7/src/avpipeline/VideoRenderPipeline.ts#L757)

***

### setRenderRotate()

> **setRenderRotate**(`taskId`, `rotate`): `Promise`\<`void`\>

#### Parameters

• **taskId**: `string`

• **rotate**: `double`

#### Returns

`Promise`\<`void`\>

#### Source

[avpipeline/VideoRenderPipeline.ts:775](https://github.com/zhaohappy/libmedia/blob/a88305ff5d10e91621f2d71d24c72fc85681b8f7/src/avpipeline/VideoRenderPipeline.ts#L775)

***

### setSkipRender()

> **setSkipRender**(`taskId`, `skip`): `Promise`\<`void`\>

#### Parameters

• **taskId**: `string`

• **skip**: `boolean`

#### Returns

`Promise`\<`void`\>

#### Source

[avpipeline/VideoRenderPipeline.ts:846](https://github.com/zhaohappy/libmedia/blob/a88305ff5d10e91621f2d71d24c72fc85681b8f7/src/avpipeline/VideoRenderPipeline.ts#L846)

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

[avpipeline/VideoRenderPipeline.ts:893](https://github.com/zhaohappy/libmedia/blob/a88305ff5d10e91621f2d71d24c72fc85681b8f7/src/avpipeline/VideoRenderPipeline.ts#L893)

***

### unpause()

> **unpause**(`taskId`): `Promise`\<`void`\>

#### Parameters

• **taskId**: `string`

#### Returns

`Promise`\<`void`\>

#### Source

[avpipeline/VideoRenderPipeline.ts:702](https://github.com/zhaohappy/libmedia/blob/a88305ff5d10e91621f2d71d24c72fc85681b8f7/src/avpipeline/VideoRenderPipeline.ts#L702)

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

[avpipeline/VideoRenderPipeline.ts:986](https://github.com/zhaohappy/libmedia/blob/a88305ff5d10e91621f2d71d24c72fc85681b8f7/src/avpipeline/VideoRenderPipeline.ts#L986)

***

### updateCanvas()

> **updateCanvas**(`taskId`, `canvas`): `Promise`\<`void`\>

#### Parameters

• **taskId**: `string`

• **canvas**: `OffscreenCanvas` \| `HTMLCanvasElement`

#### Returns

`Promise`\<`void`\>

#### Source

[avpipeline/VideoRenderPipeline.ts:723](https://github.com/zhaohappy/libmedia/blob/a88305ff5d10e91621f2d71d24c72fc85681b8f7/src/avpipeline/VideoRenderPipeline.ts#L723)
