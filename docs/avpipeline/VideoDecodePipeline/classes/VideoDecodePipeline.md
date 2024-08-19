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

[avpipeline/VideoDecodePipeline.ts:108](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avpipeline/VideoDecodePipeline.ts#L108)

## Properties

### tasks

> **tasks**: `Map`\<`string`, `SelfTask`\>

#### Overrides

`Pipeline.tasks`

#### Source

[avpipeline/VideoDecodePipeline.ts:106](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avpipeline/VideoDecodePipeline.ts#L106)

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

> **getTasksInfo**(): `Promise`\<[`VideoDecodeTaskInfo`](../interfaces/VideoDecodeTaskInfo.md)[]\>

#### Returns

`Promise`\<[`VideoDecodeTaskInfo`](../interfaces/VideoDecodeTaskInfo.md)[]\>

#### Source

[avpipeline/VideoDecodePipeline.ts:665](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avpipeline/VideoDecodePipeline.ts#L665)

***

### open()

> **open**(`taskId`, `parameters`, `wasmDecoderOptions`): `Promise`\<`number`\>

#### Parameters

• **taskId**: `string`

• **parameters**: `pointer`\<[`AVCodecParameters`](../../../avutil/struct/avcodecparameters/classes/AVCodecParameters.md)\>

• **wasmDecoderOptions**: `Data`= `{}`

#### Returns

`Promise`\<`number`\>

#### Source

[avpipeline/VideoDecodePipeline.ts:509](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avpipeline/VideoDecodePipeline.ts#L509)

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

[avpipeline/VideoDecodePipeline.ts:635](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avpipeline/VideoDecodePipeline.ts#L635)

***

### reopenDecoder()

> **reopenDecoder**(`taskId`, `parameters`, `resource`?, `wasmDecoderOptions`?): `Promise`\<`number`\>

#### Parameters

• **taskId**: `string`

• **parameters**: `pointer`\<[`AVCodecParameters`](../../../avutil/struct/avcodecparameters/classes/AVCodecParameters.md)\>

• **resource?**: `WebAssemblyResource`

• **wasmDecoderOptions?**: `Data`

#### Returns

`Promise`\<`number`\>

#### Source

[avpipeline/VideoDecodePipeline.ts:438](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avpipeline/VideoDecodePipeline.ts#L438)

***

### resetTask()

> **resetTask**(`taskId`): `Promise`\<`void`\>

#### Parameters

• **taskId**: `string`

#### Returns

`Promise`\<`void`\>

#### Source

[avpipeline/VideoDecodePipeline.ts:605](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avpipeline/VideoDecodePipeline.ts#L605)

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

[avpipeline/VideoDecodePipeline.ts:560](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avpipeline/VideoDecodePipeline.ts#L560)

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

[avpipeline/VideoDecodePipeline.ts:642](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avpipeline/VideoDecodePipeline.ts#L642)
