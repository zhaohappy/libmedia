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

[avpipeline/DemuxPipeline.ts:94](https://github.com/zhaohappy/libmedia/blob/a88305ff5d10e91621f2d71d24c72fc85681b8f7/src/avpipeline/DemuxPipeline.ts#L94)

## Properties

### tasks

> **tasks**: `Map`\<`string`, `SelfTask`\>

#### Overrides

`Pipeline.tasks`

#### Source

[avpipeline/DemuxPipeline.ts:92](https://github.com/zhaohappy/libmedia/blob/a88305ff5d10e91621f2d71d24c72fc85681b8f7/src/avpipeline/DemuxPipeline.ts#L92)

## Methods

### analyzeStreams()

> **analyzeStreams**(`taskId`): `Promise`\<`AVStreamInterface`[]\>

#### Parameters

• **taskId**: `string`

#### Returns

`Promise`\<`AVStreamInterface`[]\>

#### Source

[avpipeline/DemuxPipeline.ts:384](https://github.com/zhaohappy/libmedia/blob/a88305ff5d10e91621f2d71d24c72fc85681b8f7/src/avpipeline/DemuxPipeline.ts#L384)

***

### clear()

> **clear**(): `Promise`\<`void`\>

#### Returns

`Promise`\<`void`\>

#### Inherited from

`Pipeline.clear`

#### Source

[avpipeline/Pipeline.ts:48](https://github.com/zhaohappy/libmedia/blob/a88305ff5d10e91621f2d71d24c72fc85681b8f7/src/avpipeline/Pipeline.ts#L48)

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

[avpipeline/DemuxPipeline.ts:412](https://github.com/zhaohappy/libmedia/blob/a88305ff5d10e91621f2d71d24c72fc85681b8f7/src/avpipeline/DemuxPipeline.ts#L412)

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

[avpipeline/DemuxPipeline.ts:688](https://github.com/zhaohappy/libmedia/blob/a88305ff5d10e91621f2d71d24c72fc85681b8f7/src/avpipeline/DemuxPipeline.ts#L688)

***

### getFormat()

> **getFormat**(`taskId`): `Promise`\<`AVFormat`\>

#### Parameters

• **taskId**: `string`

#### Returns

`Promise`\<`AVFormat`\>

#### Source

[avpipeline/DemuxPipeline.ts:374](https://github.com/zhaohappy/libmedia/blob/a88305ff5d10e91621f2d71d24c72fc85681b8f7/src/avpipeline/DemuxPipeline.ts#L374)

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

### openStream()

> **openStream**(`taskId`): `Promise`\<`number`\>

#### Parameters

• **taskId**: `string`

#### Returns

`Promise`\<`number`\>

#### Source

[avpipeline/DemuxPipeline.ts:247](https://github.com/zhaohappy/libmedia/blob/a88305ff5d10e91621f2d71d24c72fc85681b8f7/src/avpipeline/DemuxPipeline.ts#L247)

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

[avpipeline/DemuxPipeline.ts:716](https://github.com/zhaohappy/libmedia/blob/a88305ff5d10e91621f2d71d24c72fc85681b8f7/src/avpipeline/DemuxPipeline.ts#L716)

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

[avpipeline/DemuxPipeline.ts:611](https://github.com/zhaohappy/libmedia/blob/a88305ff5d10e91621f2d71d24c72fc85681b8f7/src/avpipeline/DemuxPipeline.ts#L611)

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

### startDemux()

> **startDemux**(`taskId`, `isLive`, `minQueueLength`): `Promise`\<`void`\>

#### Parameters

• **taskId**: `string`

• **isLive**: `boolean`

• **minQueueLength**: `int32`

#### Returns

`Promise`\<`void`\>

#### Source

[avpipeline/DemuxPipeline.ts:457](https://github.com/zhaohappy/libmedia/blob/a88305ff5d10e91621f2d71d24c72fc85681b8f7/src/avpipeline/DemuxPipeline.ts#L457)

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

[avpipeline/DemuxPipeline.ts:723](https://github.com/zhaohappy/libmedia/blob/a88305ff5d10e91621f2d71d24c72fc85681b8f7/src/avpipeline/DemuxPipeline.ts#L723)
