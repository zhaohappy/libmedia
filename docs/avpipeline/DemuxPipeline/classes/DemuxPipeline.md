[**libmedia**](../../../README.md) • **Docs**

***

[libmedia](../../../README.md) / [avpipeline/DemuxPipeline](../README.md) / DemuxPipeline

# Class: DemuxPipeline

## Extends

- `default`

## Constructors

### new DemuxPipeline()

> **new DemuxPipeline**(): [`DemuxPipeline`](DemuxPipeline.md)

#### Returns

[`DemuxPipeline`](DemuxPipeline.md)

#### Overrides

`Pipeline.constructor`

#### Source

[avpipeline/DemuxPipeline.ts:98](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avpipeline/DemuxPipeline.ts#L98)

## Properties

### tasks

> **tasks**: `Map`\<`string`, `SelfTask`\>

#### Overrides

`Pipeline.tasks`

#### Source

[avpipeline/DemuxPipeline.ts:96](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avpipeline/DemuxPipeline.ts#L96)

## Methods

### analyzeStreams()

> **analyzeStreams**(`taskId`): `Promise`\<[`AVFormatContextInterface`](../../../avformat/AVFormatContext/interfaces/AVFormatContextInterface.md)\>

#### Parameters

• **taskId**: `string`

#### Returns

`Promise`\<[`AVFormatContextInterface`](../../../avformat/AVFormatContext/interfaces/AVFormatContextInterface.md)\>

#### Source

[avpipeline/DemuxPipeline.ts:468](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avpipeline/DemuxPipeline.ts#L468)

***

### changeConnectStream()

> **changeConnectStream**(`taskId`, `newStreamIndex`, `oldStreamIndex`, `force`): `Promise`\<`void`\>

#### Parameters

• **taskId**: `string`

• **newStreamIndex**: `number`

• **oldStreamIndex**: `number`

• **force**: `boolean`= `true`

#### Returns

`Promise`\<`void`\>

#### Source

[avpipeline/DemuxPipeline.ts:550](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avpipeline/DemuxPipeline.ts#L550)

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

### connectStreamTask()

> **connectStreamTask**(`taskId`, `streamIndex`, `port`): `Promise`\<`void`\>

#### Parameters

• **taskId**: `string`

• **streamIndex**: `number`

• **port**: `MessagePort`

#### Returns

`Promise`\<`void`\>

#### Source

[avpipeline/DemuxPipeline.ts:501](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avpipeline/DemuxPipeline.ts#L501)

***

### croppingAVPacketQueue()

> **croppingAVPacketQueue**(`taskId`, `max`): `Promise`\<`void`\>

裁剪 avpacket 队列大小

#### Parameters

• **taskId**: `string`

• **max**: `int64`

（毫秒）

#### Returns

`Promise`\<`void`\>

#### Source

[avpipeline/DemuxPipeline.ts:877](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avpipeline/DemuxPipeline.ts#L877)

***

### getFormat()

> **getFormat**(`taskId`): `Promise`\<`AVFormat`\>

#### Parameters

• **taskId**: `string`

#### Returns

`Promise`\<`AVFormat`\>

#### Source

[avpipeline/DemuxPipeline.ts:458](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avpipeline/DemuxPipeline.ts#L458)

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

### openStream()

> **openStream**(`taskId`, `maxProbeDuration`): `Promise`\<`number`\>

#### Parameters

• **taskId**: `string`

• **maxProbeDuration**: `int32`= `2000`

#### Returns

`Promise`\<`number`\>

#### Source

[avpipeline/DemuxPipeline.ts:267](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avpipeline/DemuxPipeline.ts#L267)

***

### registerTask()

> **registerTask**(`options`): `Promise`\<`number`\>

#### Parameters

• **options**: [`DemuxTaskOptions`](../interfaces/DemuxTaskOptions.md)

#### Returns

`Promise`\<`number`\>

#### Overrides

`Pipeline.registerTask`

#### Source

[avpipeline/DemuxPipeline.ts:908](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avpipeline/DemuxPipeline.ts#L908)

***

### seek()

> **seek**(`taskId`, `timestamp`, `flags`, `streamIndex`): `Promise`\<`int64`\>

#### Parameters

• **taskId**: `string`

• **timestamp**: `int64`

• **flags**: `int32`

• **streamIndex**: `int32`= `-1`

#### Returns

`Promise`\<`int64`\>

#### Source

[avpipeline/DemuxPipeline.ts:785](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avpipeline/DemuxPipeline.ts#L785)

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

### startDemux()

> **startDemux**(`taskId`, `isLive`, `minQueueLength`): `Promise`\<`void`\>

#### Parameters

• **taskId**: `string`

• **isLive**: `boolean`

• **minQueueLength**: `int32`

#### Returns

`Promise`\<`void`\>

#### Source

[avpipeline/DemuxPipeline.ts:602](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avpipeline/DemuxPipeline.ts#L602)

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

[avpipeline/DemuxPipeline.ts:915](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avpipeline/DemuxPipeline.ts#L915)
