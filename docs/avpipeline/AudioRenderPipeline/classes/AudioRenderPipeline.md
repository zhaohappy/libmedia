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

[avpipeline/AudioRenderPipeline.ts:115](https://github.com/zhaohappy/libmedia/blob/b4bb608d2b1c00d036d73fc8d222b1a97be53694/src/avpipeline/AudioRenderPipeline.ts#L115)

## Properties

### tasks

> **tasks**: `Map`\<`string`, `SelfTask`\>

#### Overrides

`Pipeline.tasks`

#### Source

[avpipeline/AudioRenderPipeline.ts:110](https://github.com/zhaohappy/libmedia/blob/b4bb608d2b1c00d036d73fc8d222b1a97be53694/src/avpipeline/AudioRenderPipeline.ts#L110)

## Methods

### afterSeek()

> **afterSeek**(`taskId`, `timestamp`): `Promise`\<`void`\>

#### Parameters

• **taskId**: `string`

• **timestamp**: `int64`

#### Returns

`Promise`\<`void`\>

#### Source

[avpipeline/AudioRenderPipeline.ts:694](https://github.com/zhaohappy/libmedia/blob/b4bb608d2b1c00d036d73fc8d222b1a97be53694/src/avpipeline/AudioRenderPipeline.ts#L694)

***

### beforeSeek()

> **beforeSeek**(`taskId`): `Promise`\<`void`\>

#### Parameters

• **taskId**: `string`

#### Returns

`Promise`\<`void`\>

#### Source

[avpipeline/AudioRenderPipeline.ts:596](https://github.com/zhaohappy/libmedia/blob/b4bb608d2b1c00d036d73fc8d222b1a97be53694/src/avpipeline/AudioRenderPipeline.ts#L596)

***

### clear()

> **clear**(): `Promise`\<`void`\>

#### Returns

`Promise`\<`void`\>

#### Overrides

`Pipeline.clear`

#### Source

[avpipeline/AudioRenderPipeline.ts:857](https://github.com/zhaohappy/libmedia/blob/b4bb608d2b1c00d036d73fc8d222b1a97be53694/src/avpipeline/AudioRenderPipeline.ts#L857)

***

### fakePlay()

> **fakePlay**(`taskId`): `Promise`\<`void`\>

#### Parameters

• **taskId**: `string`

#### Returns

`Promise`\<`void`\>

#### Source

[avpipeline/AudioRenderPipeline.ts:776](https://github.com/zhaohappy/libmedia/blob/b4bb608d2b1c00d036d73fc8d222b1a97be53694/src/avpipeline/AudioRenderPipeline.ts#L776)

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

[avpipeline/AudioRenderPipeline.ts:788](https://github.com/zhaohappy/libmedia/blob/b4bb608d2b1c00d036d73fc8d222b1a97be53694/src/avpipeline/AudioRenderPipeline.ts#L788)

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

[avpipeline/AudioRenderPipeline.ts:818](https://github.com/zhaohappy/libmedia/blob/b4bb608d2b1c00d036d73fc8d222b1a97be53694/src/avpipeline/AudioRenderPipeline.ts#L818)

***

### restart()

> **restart**(`taskId`): `Promise`\<`void`\>

#### Parameters

• **taskId**: `string`

#### Returns

`Promise`\<`void`\>

#### Source

[avpipeline/AudioRenderPipeline.ts:716](https://github.com/zhaohappy/libmedia/blob/b4bb608d2b1c00d036d73fc8d222b1a97be53694/src/avpipeline/AudioRenderPipeline.ts#L716)

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

### setPlayPitch()

> **setPlayPitch**(`taskId`, `pitch`): `void`

#### Parameters

• **taskId**: `string`

• **pitch**: `double`

#### Returns

`void`

#### Source

[avpipeline/AudioRenderPipeline.ts:585](https://github.com/zhaohappy/libmedia/blob/b4bb608d2b1c00d036d73fc8d222b1a97be53694/src/avpipeline/AudioRenderPipeline.ts#L585)

***

### setPlayRate()

> **setPlayRate**(`taskId`, `rate`): `void`

#### Parameters

• **taskId**: `string`

• **rate**: `double`

#### Returns

`void`

#### Source

[avpipeline/AudioRenderPipeline.ts:555](https://github.com/zhaohappy/libmedia/blob/b4bb608d2b1c00d036d73fc8d222b1a97be53694/src/avpipeline/AudioRenderPipeline.ts#L555)

***

### setPlayTempo()

> **setPlayTempo**(`taskId`, `tempo`): `Promise`\<`void`\>

#### Parameters

• **taskId**: `string`

• **tempo**: `double`

#### Returns

`Promise`\<`void`\>

#### Source

[avpipeline/AudioRenderPipeline.ts:574](https://github.com/zhaohappy/libmedia/blob/b4bb608d2b1c00d036d73fc8d222b1a97be53694/src/avpipeline/AudioRenderPipeline.ts#L574)

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

[avpipeline/AudioRenderPipeline.ts:634](https://github.com/zhaohappy/libmedia/blob/b4bb608d2b1c00d036d73fc8d222b1a97be53694/src/avpipeline/AudioRenderPipeline.ts#L634)

***

### unpause()

> **unpause**(`taskId`): `Promise`\<`void`\>

#### Parameters

• **taskId**: `string`

#### Returns

`Promise`\<`void`\>

#### Source

[avpipeline/AudioRenderPipeline.ts:803](https://github.com/zhaohappy/libmedia/blob/b4bb608d2b1c00d036d73fc8d222b1a97be53694/src/avpipeline/AudioRenderPipeline.ts#L803)

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

[avpipeline/AudioRenderPipeline.ts:825](https://github.com/zhaohappy/libmedia/blob/b4bb608d2b1c00d036d73fc8d222b1a97be53694/src/avpipeline/AudioRenderPipeline.ts#L825)
