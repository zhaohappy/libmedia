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

[avpipeline/VideoRenderPipeline.ts:171](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avpipeline/VideoRenderPipeline.ts#L171)

## Properties

### tasks

> **tasks**: `Map`\<`string`, `SelfTask`\>

#### Overrides

`Pipeline.tasks`

#### Source

[avpipeline/VideoRenderPipeline.ts:169](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avpipeline/VideoRenderPipeline.ts#L169)

## Methods

### afterSeek()

> **afterSeek**(`taskId`, `timestamp`): `Promise`\<`void`\>

#### Parameters

• **taskId**: `string`

• **timestamp**: `int64`

#### Returns

`Promise`\<`void`\>

#### Source

[avpipeline/VideoRenderPipeline.ts:943](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avpipeline/VideoRenderPipeline.ts#L943)

***

### beforeSeek()

> **beforeSeek**(`taskId`): `Promise`\<`void`\>

#### Parameters

• **taskId**: `string`

#### Returns

`Promise`\<`void`\>

#### Source

[avpipeline/VideoRenderPipeline.ts:857](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avpipeline/VideoRenderPipeline.ts#L857)

***

### clear()

> **clear**(): `Promise`\<`void`\>

#### Returns

`Promise`\<`void`\>

#### Inherited from

`Pipeline.clear`

#### Source

[avpipeline/Pipeline.ts:48](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avpipeline/Pipeline.ts#L48)

***

### enableHorizontalFlip()

> **enableHorizontalFlip**(`taskId`, `enable`): `Promise`\<`void`\>

#### Parameters

• **taskId**: `string`

• **enable**: `boolean`

#### Returns

`Promise`\<`void`\>

#### Source

[avpipeline/VideoRenderPipeline.ts:794](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avpipeline/VideoRenderPipeline.ts#L794)

***

### enableVerticalFlip()

> **enableVerticalFlip**(`taskId`, `enable`): `Promise`\<`void`\>

#### Parameters

• **taskId**: `string`

• **enable**: `boolean`

#### Returns

`Promise`\<`void`\>

#### Source

[avpipeline/VideoRenderPipeline.ts:812](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avpipeline/VideoRenderPipeline.ts#L812)

***

### getTaskCount()

> **getTaskCount**(): `Promise`\<`number`\>

#### Returns

`Promise`\<`number`\>

#### Inherited from

`Pipeline.getTaskCount`

#### Source

[avpipeline/Pipeline.ts:60](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avpipeline/Pipeline.ts#L60)

***

### pause()

> **pause**(`taskId`): `Promise`\<`void`\>

#### Parameters

• **taskId**: `string`

#### Returns

`Promise`\<`void`\>

#### Source

[avpipeline/VideoRenderPipeline.ts:682](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avpipeline/VideoRenderPipeline.ts#L682)

***

### play()

> **play**(`taskId`): `Promise`\<`void`\>

#### Parameters

• **taskId**: `string`

#### Returns

`Promise`\<`void`\>

#### Source

[avpipeline/VideoRenderPipeline.ts:410](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avpipeline/VideoRenderPipeline.ts#L410)

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

[avpipeline/VideoRenderPipeline.ts:1015](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avpipeline/VideoRenderPipeline.ts#L1015)

***

### renderNextFrame()

> **renderNextFrame**(`taskId`): `Promise`\<`void`\>

#### Parameters

• **taskId**: `string`

#### Returns

`Promise`\<`void`\>

#### Source

[avpipeline/VideoRenderPipeline.ts:994](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avpipeline/VideoRenderPipeline.ts#L994)

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

[avpipeline/VideoRenderPipeline.ts:830](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avpipeline/VideoRenderPipeline.ts#L830)

***

### restart()

> **restart**(`taskId`): `Promise`\<`void`\>

#### Parameters

• **taskId**: `string`

#### Returns

`Promise`\<`void`\>

#### Source

[avpipeline/VideoRenderPipeline.ts:627](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avpipeline/VideoRenderPipeline.ts#L627)

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

[avpipeline/Pipeline.ts:56](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avpipeline/Pipeline.ts#L56)

***

### setPlayRate()

> **setPlayRate**(`taskId`, `rate`): `Promise`\<`void`\>

#### Parameters

• **taskId**: `string`

• **rate**: `double`

#### Returns

`Promise`\<`void`\>

#### Source

[avpipeline/VideoRenderPipeline.ts:742](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avpipeline/VideoRenderPipeline.ts#L742)

***

### setRenderMode()

> **setRenderMode**(`taskId`, `mode`): `Promise`\<`void`\>

#### Parameters

• **taskId**: `string`

• **mode**: `RenderMode`

#### Returns

`Promise`\<`void`\>

#### Source

[avpipeline/VideoRenderPipeline.ts:758](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avpipeline/VideoRenderPipeline.ts#L758)

***

### setRenderRotate()

> **setRenderRotate**(`taskId`, `rotate`): `Promise`\<`void`\>

#### Parameters

• **taskId**: `string`

• **rotate**: `double`

#### Returns

`Promise`\<`void`\>

#### Source

[avpipeline/VideoRenderPipeline.ts:776](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avpipeline/VideoRenderPipeline.ts#L776)

***

### setSkipRender()

> **setSkipRender**(`taskId`, `skip`): `Promise`\<`void`\>

#### Parameters

• **taskId**: `string`

• **skip**: `boolean`

#### Returns

`Promise`\<`void`\>

#### Source

[avpipeline/VideoRenderPipeline.ts:847](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avpipeline/VideoRenderPipeline.ts#L847)

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

[avpipeline/VideoRenderPipeline.ts:894](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avpipeline/VideoRenderPipeline.ts#L894)

***

### unpause()

> **unpause**(`taskId`): `Promise`\<`void`\>

#### Parameters

• **taskId**: `string`

#### Returns

`Promise`\<`void`\>

#### Source

[avpipeline/VideoRenderPipeline.ts:700](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avpipeline/VideoRenderPipeline.ts#L700)

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

[avpipeline/VideoRenderPipeline.ts:1022](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avpipeline/VideoRenderPipeline.ts#L1022)

***

### updateCanvas()

> **updateCanvas**(`taskId`, `canvas`): `Promise`\<`void`\>

#### Parameters

• **taskId**: `string`

• **canvas**: `OffscreenCanvas` \| `HTMLCanvasElement`

#### Returns

`Promise`\<`void`\>

#### Source

[avpipeline/VideoRenderPipeline.ts:724](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avpipeline/VideoRenderPipeline.ts#L724)
