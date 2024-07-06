[**libmedia**](../../../README.md) • **Docs**

***

[libmedia](../../../README.md) / [avpipeline/AudioRenderPipeline](../README.md) / AudioRenderPipeline

# Class: AudioRenderPipeline

## Extends

- `default`

## Constructors

### new AudioRenderPipeline()

> **new AudioRenderPipeline**(): [`AudioRenderPipeline`](AudioRenderPipeline.md)

#### Returns

[`AudioRenderPipeline`](AudioRenderPipeline.md)

#### Overrides

`Pipeline.constructor`

#### Source

[avpipeline/AudioRenderPipeline.ts:116](https://github.com/zhaohappy/libmedia/blob/a88305ff5d10e91621f2d71d24c72fc85681b8f7/src/avpipeline/AudioRenderPipeline.ts#L116)

## Properties

### tasks

> **tasks**: `Map`\<`string`, `SelfTask`\>

#### Overrides

`Pipeline.tasks`

#### Source

[avpipeline/AudioRenderPipeline.ts:110](https://github.com/zhaohappy/libmedia/blob/a88305ff5d10e91621f2d71d24c72fc85681b8f7/src/avpipeline/AudioRenderPipeline.ts#L110)

## Methods

### afterSeek()

> **afterSeek**(`taskId`, `timestamp`): `Promise`\<`void`\>

#### Parameters

• **taskId**: `string`

• **timestamp**: `int64`

#### Returns

`Promise`\<`void`\>

#### Source

[avpipeline/AudioRenderPipeline.ts:699](https://github.com/zhaohappy/libmedia/blob/a88305ff5d10e91621f2d71d24c72fc85681b8f7/src/avpipeline/AudioRenderPipeline.ts#L699)

***

### beforeSeek()

> **beforeSeek**(`taskId`): `Promise`\<`void`\>

#### Parameters

• **taskId**: `string`

#### Returns

`Promise`\<`void`\>

#### Source

[avpipeline/AudioRenderPipeline.ts:600](https://github.com/zhaohappy/libmedia/blob/a88305ff5d10e91621f2d71d24c72fc85681b8f7/src/avpipeline/AudioRenderPipeline.ts#L600)

***

### clear()

> **clear**(): `Promise`\<`void`\>

#### Returns

`Promise`\<`void`\>

#### Overrides

`Pipeline.clear`

#### Source

[avpipeline/AudioRenderPipeline.ts:867](https://github.com/zhaohappy/libmedia/blob/a88305ff5d10e91621f2d71d24c72fc85681b8f7/src/avpipeline/AudioRenderPipeline.ts#L867)

***

### fakePlay()

> **fakePlay**(`taskId`): `Promise`\<`void`\>

#### Parameters

• **taskId**: `string`

#### Returns

`Promise`\<`void`\>

#### Source

[avpipeline/AudioRenderPipeline.ts:781](https://github.com/zhaohappy/libmedia/blob/a88305ff5d10e91621f2d71d24c72fc85681b8f7/src/avpipeline/AudioRenderPipeline.ts#L781)

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

[avpipeline/AudioRenderPipeline.ts:793](https://github.com/zhaohappy/libmedia/blob/a88305ff5d10e91621f2d71d24c72fc85681b8f7/src/avpipeline/AudioRenderPipeline.ts#L793)

***

### registerTask()

> **registerTask**(`options`): `Promise`\<`number`\>

#### Parameters

• **options**: [`AudioRenderTaskOptions`](../interfaces/AudioRenderTaskOptions.md)

#### Returns

`Promise`\<`number`\>

#### Overrides

`Pipeline.registerTask`

#### Source

[avpipeline/AudioRenderPipeline.ts:823](https://github.com/zhaohappy/libmedia/blob/a88305ff5d10e91621f2d71d24c72fc85681b8f7/src/avpipeline/AudioRenderPipeline.ts#L823)

***

### restart()

> **restart**(`taskId`): `Promise`\<`void`\>

#### Parameters

• **taskId**: `string`

#### Returns

`Promise`\<`void`\>

#### Source

[avpipeline/AudioRenderPipeline.ts:721](https://github.com/zhaohappy/libmedia/blob/a88305ff5d10e91621f2d71d24c72fc85681b8f7/src/avpipeline/AudioRenderPipeline.ts#L721)

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

### setPlayPitch()

> **setPlayPitch**(`taskId`, `pitch`): `void`

#### Parameters

• **taskId**: `string`

• **pitch**: `double`

#### Returns

`void`

#### Source

[avpipeline/AudioRenderPipeline.ts:589](https://github.com/zhaohappy/libmedia/blob/a88305ff5d10e91621f2d71d24c72fc85681b8f7/src/avpipeline/AudioRenderPipeline.ts#L589)

***

### setPlayRate()

> **setPlayRate**(`taskId`, `rate`): `void`

#### Parameters

• **taskId**: `string`

• **rate**: `double`

#### Returns

`void`

#### Source

[avpipeline/AudioRenderPipeline.ts:559](https://github.com/zhaohappy/libmedia/blob/a88305ff5d10e91621f2d71d24c72fc85681b8f7/src/avpipeline/AudioRenderPipeline.ts#L559)

***

### setPlayTempo()

> **setPlayTempo**(`taskId`, `tempo`): `Promise`\<`void`\>

#### Parameters

• **taskId**: `string`

• **tempo**: `double`

#### Returns

`Promise`\<`void`\>

#### Source

[avpipeline/AudioRenderPipeline.ts:578](https://github.com/zhaohappy/libmedia/blob/a88305ff5d10e91621f2d71d24c72fc85681b8f7/src/avpipeline/AudioRenderPipeline.ts#L578)

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

[avpipeline/AudioRenderPipeline.ts:639](https://github.com/zhaohappy/libmedia/blob/a88305ff5d10e91621f2d71d24c72fc85681b8f7/src/avpipeline/AudioRenderPipeline.ts#L639)

***

### unpause()

> **unpause**(`taskId`): `Promise`\<`void`\>

#### Parameters

• **taskId**: `string`

#### Returns

`Promise`\<`void`\>

#### Source

[avpipeline/AudioRenderPipeline.ts:808](https://github.com/zhaohappy/libmedia/blob/a88305ff5d10e91621f2d71d24c72fc85681b8f7/src/avpipeline/AudioRenderPipeline.ts#L808)

***

### unregisterTask()

> **unregisterTask**(`taskId`): `Promise`\<`void`\>

#### Parameters

• **taskId**: `string`

#### Returns

`Promise`\<`void`\>

#### Overrides

`Pipeline.unregisterTask`

#### Source

[avpipeline/AudioRenderPipeline.ts:830](https://github.com/zhaohappy/libmedia/blob/a88305ff5d10e91621f2d71d24c72fc85681b8f7/src/avpipeline/AudioRenderPipeline.ts#L830)
