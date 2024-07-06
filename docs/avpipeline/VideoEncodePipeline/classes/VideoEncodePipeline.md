[**libmedia**](../../../README.md) • **Docs**

***

[libmedia](../../../README.md) / [avpipeline/VideoEncodePipeline](../README.md) / VideoEncodePipeline

# Class: VideoEncodePipeline

## Extends

- `default`

## Constructors

### new VideoEncodePipeline()

> **new VideoEncodePipeline**(): [`VideoEncodePipeline`](VideoEncodePipeline.md)

#### Returns

[`VideoEncodePipeline`](VideoEncodePipeline.md)

#### Overrides

`Pipeline.constructor`

#### Source

[avpipeline/VideoEncodePipeline.ts:99](https://github.com/zhaohappy/libmedia/blob/a88305ff5d10e91621f2d71d24c72fc85681b8f7/src/avpipeline/VideoEncodePipeline.ts#L99)

## Properties

### tasks

> **tasks**: `Map`\<`string`, `SelfTask`\>

#### Overrides

`Pipeline.tasks`

#### Source

[avpipeline/VideoEncodePipeline.ts:97](https://github.com/zhaohappy/libmedia/blob/a88305ff5d10e91621f2d71d24c72fc85681b8f7/src/avpipeline/VideoEncodePipeline.ts#L97)

## Methods

### clear()

> **clear**(): `Promise`\<`void`\>

#### Returns

`Promise`\<`void`\>

#### Inherited from

`Pipeline.clear`

#### Source

[avpipeline/Pipeline.ts:48](https://github.com/zhaohappy/libmedia/blob/a88305ff5d10e91621f2d71d24c72fc85681b8f7/src/avpipeline/Pipeline.ts#L48)

***

### getExtraData()

> **getExtraData**(`taskId`): `Promise`\<`Uint8Array`\>

#### Parameters

• **taskId**: `string`

#### Returns

`Promise`\<`Uint8Array`\>

#### Source

[avpipeline/VideoEncodePipeline.ts:367](https://github.com/zhaohappy/libmedia/blob/a88305ff5d10e91621f2d71d24c72fc85681b8f7/src/avpipeline/VideoEncodePipeline.ts#L367)

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

### getTasksInfo()

> **getTasksInfo**(): `Promise`\<[`VideoEncodeTaskInfo`](../interfaces/VideoEncodeTaskInfo.md)[]\>

#### Returns

`Promise`\<[`VideoEncodeTaskInfo`](../interfaces/VideoEncodeTaskInfo.md)[]\>

#### Source

[avpipeline/VideoEncodePipeline.ts:400](https://github.com/zhaohappy/libmedia/blob/a88305ff5d10e91621f2d71d24c72fc85681b8f7/src/avpipeline/VideoEncodePipeline.ts#L400)

***

### open()

> **open**(`taskId`, `parameters`, `timeBase`): `Promise`\<`void`\>

#### Parameters

• **taskId**: `string`

• **parameters**: `pointer`\<[`AVCodecParameters`](../../../avutil/struct/avcodecparameters/classes/AVCodecParameters.md)\>

• **timeBase**: `Rational`

#### Returns

`Promise`\<`void`\>

#### Source

[avpipeline/VideoEncodePipeline.ts:314](https://github.com/zhaohappy/libmedia/blob/a88305ff5d10e91621f2d71d24c72fc85681b8f7/src/avpipeline/VideoEncodePipeline.ts#L314)

***

### registerTask()

> **registerTask**(`options`): `Promise`\<`number`\>

#### Parameters

• **options**: [`VideoEncodeTaskOptions`](../interfaces/VideoEncodeTaskOptions.md)

#### Returns

`Promise`\<`number`\>

#### Overrides

`Pipeline.registerTask`

#### Source

[avpipeline/VideoEncodePipeline.ts:375](https://github.com/zhaohappy/libmedia/blob/a88305ff5d10e91621f2d71d24c72fc85681b8f7/src/avpipeline/VideoEncodePipeline.ts#L375)

***

### resetTask()

> **resetTask**(`taskId`): `Promise`\<`void`\>

#### Parameters

• **taskId**: `string`

#### Returns

`Promise`\<`void`\>

#### Source

[avpipeline/VideoEncodePipeline.ts:344](https://github.com/zhaohappy/libmedia/blob/a88305ff5d10e91621f2d71d24c72fc85681b8f7/src/avpipeline/VideoEncodePipeline.ts#L344)

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

### unregisterTask()

> **unregisterTask**(`taskId`): `Promise`\<`void`\>

#### Parameters

• **taskId**: `string`

#### Returns

`Promise`\<`void`\>

#### Overrides

`Pipeline.unregisterTask`

#### Source

[avpipeline/VideoEncodePipeline.ts:382](https://github.com/zhaohappy/libmedia/blob/a88305ff5d10e91621f2d71d24c72fc85681b8f7/src/avpipeline/VideoEncodePipeline.ts#L382)
