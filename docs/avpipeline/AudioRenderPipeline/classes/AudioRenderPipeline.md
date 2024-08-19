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

[avpipeline/AudioRenderPipeline.ts:116](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avpipeline/AudioRenderPipeline.ts#L116)

## Properties

### tasks

> **tasks**: `Map`\<`string`, `SelfTask`\>

#### Overrides

`Pipeline.tasks`

#### Source

[avpipeline/AudioRenderPipeline.ts:110](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avpipeline/AudioRenderPipeline.ts#L110)

## Methods

### afterSeek()

> **afterSeek**(`taskId`, `timestamp`): `Promise`\<`void`\>

#### Parameters

• **taskId**: `string`

• **timestamp**: `int64`

#### Returns

`Promise`\<`void`\>

#### Source

[avpipeline/AudioRenderPipeline.ts:704](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avpipeline/AudioRenderPipeline.ts#L704)

***

### beforeSeek()

> **beforeSeek**(`taskId`): `Promise`\<`void`\>

#### Parameters

• **taskId**: `string`

#### Returns

`Promise`\<`void`\>

#### Source

[avpipeline/AudioRenderPipeline.ts:605](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avpipeline/AudioRenderPipeline.ts#L605)

***

### clear()

> **clear**(): `Promise`\<`void`\>

#### Returns

`Promise`\<`void`\>

#### Overrides

`Pipeline.clear`

#### Source

[avpipeline/AudioRenderPipeline.ts:872](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avpipeline/AudioRenderPipeline.ts#L872)

***

### fakePlay()

> **fakePlay**(`taskId`): `Promise`\<`void`\>

#### Parameters

• **taskId**: `string`

#### Returns

`Promise`\<`void`\>

#### Source

[avpipeline/AudioRenderPipeline.ts:786](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avpipeline/AudioRenderPipeline.ts#L786)

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

[avpipeline/AudioRenderPipeline.ts:798](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avpipeline/AudioRenderPipeline.ts#L798)

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

[avpipeline/AudioRenderPipeline.ts:828](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avpipeline/AudioRenderPipeline.ts#L828)

***

### restart()

> **restart**(`taskId`): `Promise`\<`void`\>

#### Parameters

• **taskId**: `string`

#### Returns

`Promise`\<`void`\>

#### Source

[avpipeline/AudioRenderPipeline.ts:726](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avpipeline/AudioRenderPipeline.ts#L726)

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

### setPlayPitch()

> **setPlayPitch**(`taskId`, `pitch`): `void`

#### Parameters

• **taskId**: `string`

• **pitch**: `double`

#### Returns

`void`

#### Source

[avpipeline/AudioRenderPipeline.ts:594](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avpipeline/AudioRenderPipeline.ts#L594)

***

### setPlayRate()

> **setPlayRate**(`taskId`, `rate`): `void`

#### Parameters

• **taskId**: `string`

• **rate**: `double`

#### Returns

`void`

#### Source

[avpipeline/AudioRenderPipeline.ts:564](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avpipeline/AudioRenderPipeline.ts#L564)

***

### setPlayTempo()

> **setPlayTempo**(`taskId`, `tempo`): `Promise`\<`void`\>

#### Parameters

• **taskId**: `string`

• **tempo**: `double`

#### Returns

`Promise`\<`void`\>

#### Source

[avpipeline/AudioRenderPipeline.ts:583](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avpipeline/AudioRenderPipeline.ts#L583)

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

[avpipeline/AudioRenderPipeline.ts:644](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avpipeline/AudioRenderPipeline.ts#L644)

***

### unpause()

> **unpause**(`taskId`): `Promise`\<`void`\>

#### Parameters

• **taskId**: `string`

#### Returns

`Promise`\<`void`\>

#### Source

[avpipeline/AudioRenderPipeline.ts:813](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avpipeline/AudioRenderPipeline.ts#L813)

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

[avpipeline/AudioRenderPipeline.ts:835](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avpipeline/AudioRenderPipeline.ts#L835)
