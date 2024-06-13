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

[avpipeline/DemuxPipeline.ts:107](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avpipeline/DemuxPipeline.ts#L107)

## Properties

### tasks

> **tasks**: `Map`\<`string`, `SelfTask`\>

#### Overrides

`Pipeline.tasks`

#### Source

[avpipeline/DemuxPipeline.ts:105](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avpipeline/DemuxPipeline.ts#L105)

## Methods

### analyzeStreams()

> **analyzeStreams**(`taskId`): `Promise`\<[`AVStreamInterface`](../interfaces/AVStreamInterface.md)[]\>

#### Parameters

• **taskId**: `string`

#### Returns

`Promise`\<[`AVStreamInterface`](../interfaces/AVStreamInterface.md)[]\>

#### Source

[avpipeline/DemuxPipeline.ts:397](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avpipeline/DemuxPipeline.ts#L397)

***

### clear()

> **clear**(): `Promise`\<`void`\>

#### Returns

`Promise`\<`void`\>

#### Inherited from

`Pipeline.clear`

#### Source

[avpipeline/Pipeline.ts:48](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avpipeline/Pipeline.ts#L48)

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

[avpipeline/DemuxPipeline.ts:425](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avpipeline/DemuxPipeline.ts#L425)

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

[avpipeline/DemuxPipeline.ts:701](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avpipeline/DemuxPipeline.ts#L701)

***

### getFormat()

> **getFormat**(`taskId`): `Promise`\<`AVFormat`\>

#### Parameters

• **taskId**: `string`

#### Returns

`Promise`\<`AVFormat`\>

#### Source

[avpipeline/DemuxPipeline.ts:387](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avpipeline/DemuxPipeline.ts#L387)

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

### openStream()

> **openStream**(`taskId`): `Promise`\<`number`\>

#### Parameters

• **taskId**: `string`

#### Returns

`Promise`\<`number`\>

#### Source

[avpipeline/DemuxPipeline.ts:260](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avpipeline/DemuxPipeline.ts#L260)

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

[avpipeline/DemuxPipeline.ts:729](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avpipeline/DemuxPipeline.ts#L729)

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

[avpipeline/DemuxPipeline.ts:624](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avpipeline/DemuxPipeline.ts#L624)

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

### startDemux()

> **startDemux**(`taskId`, `isLive`, `minQueueLength`): `Promise`\<`void`\>

#### Parameters

• **taskId**: `string`

• **isLive**: `boolean`

• **minQueueLength**: `int32`

#### Returns

`Promise`\<`void`\>

#### Source

[avpipeline/DemuxPipeline.ts:470](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avpipeline/DemuxPipeline.ts#L470)

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

[avpipeline/DemuxPipeline.ts:736](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avpipeline/DemuxPipeline.ts#L736)
