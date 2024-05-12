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

[avpipeline/DemuxPipeline.ts:105](https://github.com/zhaohappy/libmedia/blob/acbbf6bd75e6ee4c968b9f441fe28c40f42f350d/src/avpipeline/DemuxPipeline.ts#L105)

## Properties

### tasks

> **tasks**: `Map`\<`string`, `SelfTask`\>

#### Overrides

`Pipeline.tasks`

#### Source

[avpipeline/DemuxPipeline.ts:103](https://github.com/zhaohappy/libmedia/blob/acbbf6bd75e6ee4c968b9f441fe28c40f42f350d/src/avpipeline/DemuxPipeline.ts#L103)

## Methods

### analyzeStreams()

> **analyzeStreams**(`taskId`): `Promise`\<[`AVStreamInterface`](../interfaces/AVStreamInterface.md)[]\>

#### Parameters

• **taskId**: `string`

#### Returns

`Promise`\<[`AVStreamInterface`](../interfaces/AVStreamInterface.md)[]\>

#### Source

[avpipeline/DemuxPipeline.ts:356](https://github.com/zhaohappy/libmedia/blob/acbbf6bd75e6ee4c968b9f441fe28c40f42f350d/src/avpipeline/DemuxPipeline.ts#L356)

***

### clear()

> **clear**(): `Promise`\<`void`\>

#### Returns

`Promise`\<`void`\>

#### Inherited from

`Pipeline.clear`

#### Source

[avpipeline/Pipeline.ts:48](https://github.com/zhaohappy/libmedia/blob/acbbf6bd75e6ee4c968b9f441fe28c40f42f350d/src/avpipeline/Pipeline.ts#L48)

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

[avpipeline/DemuxPipeline.ts:384](https://github.com/zhaohappy/libmedia/blob/acbbf6bd75e6ee4c968b9f441fe28c40f42f350d/src/avpipeline/DemuxPipeline.ts#L384)

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

[avpipeline/DemuxPipeline.ts:665](https://github.com/zhaohappy/libmedia/blob/acbbf6bd75e6ee4c968b9f441fe28c40f42f350d/src/avpipeline/DemuxPipeline.ts#L665)

***

### getFormat()

> **getFormat**(`taskId`): `Promise`\<`AVFormat`\>

#### Parameters

• **taskId**: `string`

#### Returns

`Promise`\<`AVFormat`\>

#### Source

[avpipeline/DemuxPipeline.ts:346](https://github.com/zhaohappy/libmedia/blob/acbbf6bd75e6ee4c968b9f441fe28c40f42f350d/src/avpipeline/DemuxPipeline.ts#L346)

***

### getTaskCount()

> **getTaskCount**(): `Promise`\<`number`\>

#### Returns

`Promise`\<`number`\>

#### Inherited from

`Pipeline.getTaskCount`

#### Source

[avpipeline/Pipeline.ts:60](https://github.com/zhaohappy/libmedia/blob/acbbf6bd75e6ee4c968b9f441fe28c40f42f350d/src/avpipeline/Pipeline.ts#L60)

***

### openStream()

> **openStream**(`taskId`): `Promise`\<`number`\>

#### Parameters

• **taskId**: `string`

#### Returns

`Promise`\<`number`\>

#### Source

[avpipeline/DemuxPipeline.ts:246](https://github.com/zhaohappy/libmedia/blob/acbbf6bd75e6ee4c968b9f441fe28c40f42f350d/src/avpipeline/DemuxPipeline.ts#L246)

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

[avpipeline/DemuxPipeline.ts:693](https://github.com/zhaohappy/libmedia/blob/acbbf6bd75e6ee4c968b9f441fe28c40f42f350d/src/avpipeline/DemuxPipeline.ts#L693)

***

### seek()

> **seek**(`taskId`, `timestamp`, `flags`): `Promise`\<`int64`\>

#### Parameters

• **taskId**: `string`

• **timestamp**: `int64`

• **flags**: `int32`

#### Returns

`Promise`\<`int64`\>

#### Source

[avpipeline/DemuxPipeline.ts:588](https://github.com/zhaohappy/libmedia/blob/acbbf6bd75e6ee4c968b9f441fe28c40f42f350d/src/avpipeline/DemuxPipeline.ts#L588)

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

[avpipeline/Pipeline.ts:56](https://github.com/zhaohappy/libmedia/blob/acbbf6bd75e6ee4c968b9f441fe28c40f42f350d/src/avpipeline/Pipeline.ts#L56)

***

### startDemux()

> **startDemux**(`taskId`, `isLive`, `maxQueueLength`): `Promise`\<`void`\>

#### Parameters

• **taskId**: `string`

• **isLive**: `boolean`

• **maxQueueLength**: `int32`

#### Returns

`Promise`\<`void`\>

#### Source

[avpipeline/DemuxPipeline.ts:429](https://github.com/zhaohappy/libmedia/blob/acbbf6bd75e6ee4c968b9f441fe28c40f42f350d/src/avpipeline/DemuxPipeline.ts#L429)

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

[avpipeline/DemuxPipeline.ts:700](https://github.com/zhaohappy/libmedia/blob/acbbf6bd75e6ee4c968b9f441fe28c40f42f350d/src/avpipeline/DemuxPipeline.ts#L700)
