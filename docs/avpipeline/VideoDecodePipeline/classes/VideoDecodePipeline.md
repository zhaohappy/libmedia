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

[avpipeline/VideoDecodePipeline.ts:104](https://github.com/zhaohappy/libmedia/blob/b4bb608d2b1c00d036d73fc8d222b1a97be53694/src/avpipeline/VideoDecodePipeline.ts#L104)

## Properties

### tasks

> **tasks**: `Map`\<`string`, `SelfTask`\>

#### Overrides

`Pipeline.tasks`

#### Source

[avpipeline/VideoDecodePipeline.ts:102](https://github.com/zhaohappy/libmedia/blob/b4bb608d2b1c00d036d73fc8d222b1a97be53694/src/avpipeline/VideoDecodePipeline.ts#L102)

## Methods

### clear()

> **clear**(): `Promise`\<`void`\>

#### Returns

`Promise`\<`void`\>

#### Inherited from

`Pipeline.clear`

#### Source

[avpipeline/Pipeline.ts:48](https://github.com/zhaohappy/libmedia/blob/b4bb608d2b1c00d036d73fc8d222b1a97be53694/src/avpipeline/Pipeline.ts#L48)

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

### getTasksInfo()

> **getTasksInfo**(): `Promise`\<[`VideoDecodeTaskInfo`](../interfaces/VideoDecodeTaskInfo.md)[]\>

#### Returns

`Promise`\<[`VideoDecodeTaskInfo`](../interfaces/VideoDecodeTaskInfo.md)[]\>

#### Source

[avpipeline/VideoDecodePipeline.ts:531](https://github.com/zhaohappy/libmedia/blob/b4bb608d2b1c00d036d73fc8d222b1a97be53694/src/avpipeline/VideoDecodePipeline.ts#L531)

***

### open()

> **open**(`taskId`, `parameters`): `Promise`\<`void`\>

#### Parameters

• **taskId**: `string`

• **parameters**: `pointer`\<[`AVCodecParameters`](../../../avutil/struct/avcodecparameters/classes/AVCodecParameters.md)\>

#### Returns

`Promise`\<`void`\>

#### Source

[avpipeline/VideoDecodePipeline.ts:397](https://github.com/zhaohappy/libmedia/blob/b4bb608d2b1c00d036d73fc8d222b1a97be53694/src/avpipeline/VideoDecodePipeline.ts#L397)

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

[avpipeline/VideoDecodePipeline.ts:501](https://github.com/zhaohappy/libmedia/blob/b4bb608d2b1c00d036d73fc8d222b1a97be53694/src/avpipeline/VideoDecodePipeline.ts#L501)

***

### resetTask()

> **resetTask**(`taskId`): `Promise`\<`void`\>

#### Parameters

• **taskId**: `string`

#### Returns

`Promise`\<`void`\>

#### Source

[avpipeline/VideoDecodePipeline.ts:471](https://github.com/zhaohappy/libmedia/blob/b4bb608d2b1c00d036d73fc8d222b1a97be53694/src/avpipeline/VideoDecodePipeline.ts#L471)

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

[avpipeline/VideoDecodePipeline.ts:426](https://github.com/zhaohappy/libmedia/blob/b4bb608d2b1c00d036d73fc8d222b1a97be53694/src/avpipeline/VideoDecodePipeline.ts#L426)

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

[avpipeline/VideoDecodePipeline.ts:508](https://github.com/zhaohappy/libmedia/blob/b4bb608d2b1c00d036d73fc8d222b1a97be53694/src/avpipeline/VideoDecodePipeline.ts#L508)
