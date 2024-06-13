[**libmedia**](../../../README.md) • **Docs**

***

[libmedia](../../../README.md) / [avpipeline/VideoDecodePipeline](../README.md) / VideoDecodePipeline

# Class: VideoDecodePipeline

## Extends

- `default`

## Constructors

### new VideoDecodePipeline()

> **new VideoDecodePipeline**(): [`VideoDecodePipeline`](VideoDecodePipeline.md)

#### Returns

[`VideoDecodePipeline`](VideoDecodePipeline.md)

#### Overrides

`Pipeline.constructor`

#### Source

[avpipeline/VideoDecodePipeline.ts:103](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avpipeline/VideoDecodePipeline.ts#L103)

## Properties

### tasks

> **tasks**: `Map`\<`string`, `SelfTask`\>

#### Overrides

`Pipeline.tasks`

#### Source

[avpipeline/VideoDecodePipeline.ts:101](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avpipeline/VideoDecodePipeline.ts#L101)

## Methods

### clear()

> **clear**(): `Promise`\<`void`\>

#### Returns

`Promise`\<`void`\>

#### Inherited from

`Pipeline.clear`

#### Source

[avpipeline/Pipeline.ts:48](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avpipeline/Pipeline.ts#L48)

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

### getTasksInfo()

> **getTasksInfo**(): `Promise`\<[`VideoDecodeTaskInfo`](../interfaces/VideoDecodeTaskInfo.md)[]\>

#### Returns

`Promise`\<[`VideoDecodeTaskInfo`](../interfaces/VideoDecodeTaskInfo.md)[]\>

#### Source

[avpipeline/VideoDecodePipeline.ts:530](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avpipeline/VideoDecodePipeline.ts#L530)

***

### open()

> **open**(`taskId`, `parameters`): `Promise`\<`void`\>

#### Parameters

• **taskId**: `string`

• **parameters**: `pointer`\<[`AVCodecParameters`](../../../avutil/struct/avcodecparameters/classes/AVCodecParameters.md)\>

#### Returns

`Promise`\<`void`\>

#### Source

[avpipeline/VideoDecodePipeline.ts:396](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avpipeline/VideoDecodePipeline.ts#L396)

***

### registerTask()

> **registerTask**(`options`): `Promise`\<`number`\>

#### Parameters

• **options**: [`VideoDecodeTaskOptions`](../interfaces/VideoDecodeTaskOptions.md)

#### Returns

`Promise`\<`number`\>

#### Overrides

`Pipeline.registerTask`

#### Source

[avpipeline/VideoDecodePipeline.ts:500](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avpipeline/VideoDecodePipeline.ts#L500)

***

### resetTask()

> **resetTask**(`taskId`): `Promise`\<`void`\>

#### Parameters

• **taskId**: `string`

#### Returns

`Promise`\<`void`\>

#### Source

[avpipeline/VideoDecodePipeline.ts:470](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avpipeline/VideoDecodePipeline.ts#L470)

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

[avpipeline/VideoDecodePipeline.ts:425](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avpipeline/VideoDecodePipeline.ts#L425)

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

[avpipeline/VideoDecodePipeline.ts:507](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avpipeline/VideoDecodePipeline.ts#L507)
