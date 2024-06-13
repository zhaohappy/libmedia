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

[avpipeline/AudioRenderPipeline.ts:115](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avpipeline/AudioRenderPipeline.ts#L115)

## Properties

### tasks

> **tasks**: `Map`\<`string`, `SelfTask`\>

#### Overrides

`Pipeline.tasks`

#### Source

[avpipeline/AudioRenderPipeline.ts:110](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avpipeline/AudioRenderPipeline.ts#L110)

## Methods

### afterSeek()

> **afterSeek**(`taskId`, `timestamp`): `Promise`\<`void`\>

#### Parameters

• **taskId**: `string`

• **timestamp**: `int64`

#### Returns

`Promise`\<`void`\>

#### Source

[avpipeline/AudioRenderPipeline.ts:697](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avpipeline/AudioRenderPipeline.ts#L697)

***

### beforeSeek()

> **beforeSeek**(`taskId`): `Promise`\<`void`\>

#### Parameters

• **taskId**: `string`

#### Returns

`Promise`\<`void`\>

#### Source

[avpipeline/AudioRenderPipeline.ts:598](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avpipeline/AudioRenderPipeline.ts#L598)

***

### clear()

> **clear**(): `Promise`\<`void`\>

#### Returns

`Promise`\<`void`\>

#### Overrides

`Pipeline.clear`

#### Source

[avpipeline/AudioRenderPipeline.ts:865](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avpipeline/AudioRenderPipeline.ts#L865)

***

### fakePlay()

> **fakePlay**(`taskId`): `Promise`\<`void`\>

#### Parameters

• **taskId**: `string`

#### Returns

`Promise`\<`void`\>

#### Source

[avpipeline/AudioRenderPipeline.ts:779](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avpipeline/AudioRenderPipeline.ts#L779)

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

[avpipeline/AudioRenderPipeline.ts:791](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avpipeline/AudioRenderPipeline.ts#L791)

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

[avpipeline/AudioRenderPipeline.ts:821](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avpipeline/AudioRenderPipeline.ts#L821)

***

### restart()

> **restart**(`taskId`): `Promise`\<`void`\>

#### Parameters

• **taskId**: `string`

#### Returns

`Promise`\<`void`\>

#### Source

[avpipeline/AudioRenderPipeline.ts:719](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avpipeline/AudioRenderPipeline.ts#L719)

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

### setPlayPitch()

> **setPlayPitch**(`taskId`, `pitch`): `void`

#### Parameters

• **taskId**: `string`

• **pitch**: `double`

#### Returns

`void`

#### Source

[avpipeline/AudioRenderPipeline.ts:587](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avpipeline/AudioRenderPipeline.ts#L587)

***

### setPlayRate()

> **setPlayRate**(`taskId`, `rate`): `void`

#### Parameters

• **taskId**: `string`

• **rate**: `double`

#### Returns

`void`

#### Source

[avpipeline/AudioRenderPipeline.ts:557](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avpipeline/AudioRenderPipeline.ts#L557)

***

### setPlayTempo()

> **setPlayTempo**(`taskId`, `tempo`): `Promise`\<`void`\>

#### Parameters

• **taskId**: `string`

• **tempo**: `double`

#### Returns

`Promise`\<`void`\>

#### Source

[avpipeline/AudioRenderPipeline.ts:576](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avpipeline/AudioRenderPipeline.ts#L576)

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

[avpipeline/AudioRenderPipeline.ts:637](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avpipeline/AudioRenderPipeline.ts#L637)

***

### unpause()

> **unpause**(`taskId`): `Promise`\<`void`\>

#### Parameters

• **taskId**: `string`

#### Returns

`Promise`\<`void`\>

#### Source

[avpipeline/AudioRenderPipeline.ts:806](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avpipeline/AudioRenderPipeline.ts#L806)

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

[avpipeline/AudioRenderPipeline.ts:828](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avpipeline/AudioRenderPipeline.ts#L828)
