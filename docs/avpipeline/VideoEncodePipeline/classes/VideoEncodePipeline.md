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

[avpipeline/VideoEncodePipeline.ts:105](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avpipeline/VideoEncodePipeline.ts#L105)

## Properties

### tasks

> **tasks**: `Map`\<`string`, `SelfTask`\>

#### Overrides

`Pipeline.tasks`

#### Source

[avpipeline/VideoEncodePipeline.ts:103](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avpipeline/VideoEncodePipeline.ts#L103)

## Methods

### clear()

> **clear**(): `Promise`\<`void`\>

#### Returns

`Promise`\<`void`\>

#### Inherited from

`Pipeline.clear`

#### Source

[avpipeline/Pipeline.ts:48](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avpipeline/Pipeline.ts#L48)

***

### getColorSpace()

> **getColorSpace**(`taskId`): `Promise`\<`object` \| `object`\>

#### Parameters

• **taskId**: `string`

#### Returns

`Promise`\<`object` \| `object`\>

#### Source

[avpipeline/VideoEncodePipeline.ts:432](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avpipeline/VideoEncodePipeline.ts#L432)

***

### getExtraData()

> **getExtraData**(`taskId`): `Promise`\<`Uint8Array`\>

#### Parameters

• **taskId**: `string`

#### Returns

`Promise`\<`Uint8Array`\>

#### Source

[avpipeline/VideoEncodePipeline.ts:424](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avpipeline/VideoEncodePipeline.ts#L424)

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

### getTasksInfo()

> **getTasksInfo**(): `Promise`\<[`VideoEncodeTaskInfo`](../interfaces/VideoEncodeTaskInfo.md)[]\>

#### Returns

`Promise`\<[`VideoEncodeTaskInfo`](../interfaces/VideoEncodeTaskInfo.md)[]\>

#### Source

[avpipeline/VideoEncodePipeline.ts:465](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avpipeline/VideoEncodePipeline.ts#L465)

***

### open()

> **open**(`taskId`, `parameters`, `timeBase`, `wasmEncoderOptions`): `Promise`\<`number`\>

#### Parameters

• **taskId**: `string`

• **parameters**: `pointer`\<[`AVCodecParameters`](../../../avutil/struct/avcodecparameters/classes/AVCodecParameters.md)\>

• **timeBase**: `Rational`

• **wasmEncoderOptions**: `Data`= `{}`

#### Returns

`Promise`\<`number`\>

#### Source

[avpipeline/VideoEncodePipeline.ts:361](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avpipeline/VideoEncodePipeline.ts#L361)

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

[avpipeline/VideoEncodePipeline.ts:440](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avpipeline/VideoEncodePipeline.ts#L440)

***

### resetTask()

> **resetTask**(`taskId`): `Promise`\<`void`\>

#### Parameters

• **taskId**: `string`

#### Returns

`Promise`\<`void`\>

#### Source

[avpipeline/VideoEncodePipeline.ts:400](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avpipeline/VideoEncodePipeline.ts#L400)

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

### unregisterTask()

> **unregisterTask**(`taskId`): `Promise`\<`void`\>

#### Parameters

• **taskId**: `string`

#### Returns

`Promise`\<`void`\>

#### Overrides

`Pipeline.unregisterTask`

#### Source

[avpipeline/VideoEncodePipeline.ts:447](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avpipeline/VideoEncodePipeline.ts#L447)
