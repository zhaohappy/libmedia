[**libmedia**](../../../README.md) • **Docs**

***

[libmedia](../../../README.md) / [avpipeline/MuxPipeline](../README.md) / MuxPipeline

# Class: MuxPipeline

## Extends

- `default`

## Constructors

### new MuxPipeline()

> **new MuxPipeline**(): [`MuxPipeline`](MuxPipeline.md)

#### Returns

[`MuxPipeline`](MuxPipeline.md)

#### Overrides

`Pipeline.constructor`

#### Source

[avpipeline/MuxPipeline.ts:77](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avpipeline/MuxPipeline.ts#L77)

## Properties

### tasks

> **tasks**: `Map`\<`string`, `SelfTask`\>

#### Overrides

`Pipeline.tasks`

#### Source

[avpipeline/MuxPipeline.ts:75](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avpipeline/MuxPipeline.ts#L75)

## Methods

### addStream()

> **addStream**(`taskId`, `stream`, `port`): `Promise`\<`void`\>

#### Parameters

• **taskId**: `string`

• **stream**: [`AVStreamInterface`](../../../avformat/AVStream/interfaces/AVStreamInterface.md)

• **port**: `MessagePort`

#### Returns

`Promise`\<`void`\>

#### Source

[avpipeline/MuxPipeline.ts:232](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avpipeline/MuxPipeline.ts#L232)

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

### getTaskCount()

> **getTaskCount**(): `Promise`\<`number`\>

#### Returns

`Promise`\<`number`\>

#### Inherited from

`Pipeline.getTaskCount`

#### Source

[avpipeline/Pipeline.ts:60](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avpipeline/Pipeline.ts#L60)

***

### open()

> **open**(`taskId`): `Promise`\<`-2` \| `-1` \| `0`\>

#### Parameters

• **taskId**: `string`

#### Returns

`Promise`\<`-2` \| `-1` \| `0`\>

#### Source

[avpipeline/MuxPipeline.ts:119](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avpipeline/MuxPipeline.ts#L119)

***

### pause()

> **pause**(`taskId`): `Promise`\<`void`\>

#### Parameters

• **taskId**: `string`

#### Returns

`Promise`\<`void`\>

#### Source

[avpipeline/MuxPipeline.ts:361](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avpipeline/MuxPipeline.ts#L361)

***

### registerTask()

> **registerTask**(`options`): `Promise`\<`number`\>

#### Parameters

• **options**: [`MuxTaskOptions`](../interfaces/MuxTaskOptions.md)

#### Returns

`Promise`\<`number`\>

#### Overrides

`Pipeline.registerTask`

#### Source

[avpipeline/MuxPipeline.ts:385](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avpipeline/MuxPipeline.ts#L385)

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

### start()

> **start**(`taskId`): `Promise`\<`number`\>

#### Parameters

• **taskId**: `string`

#### Returns

`Promise`\<`number`\>

#### Source

[avpipeline/MuxPipeline.ts:267](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avpipeline/MuxPipeline.ts#L267)

***

### unpause()

> **unpause**(`taskId`): `Promise`\<`void`\>

#### Parameters

• **taskId**: `string`

#### Returns

`Promise`\<`void`\>

#### Source

[avpipeline/MuxPipeline.ts:373](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avpipeline/MuxPipeline.ts#L373)

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

[avpipeline/MuxPipeline.ts:392](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avpipeline/MuxPipeline.ts#L392)

***

### updateAVCodecParameters()

> **updateAVCodecParameters**(`taskId`, `streamIndex`, `codecpar`): `Promise`\<`void`\>

#### Parameters

• **taskId**: `string`

• **streamIndex**: `int32`

• **codecpar**: `pointer`\<[`AVCodecParameters`](../../../avutil/struct/avcodecparameters/classes/AVCodecParameters.md)\>

#### Returns

`Promise`\<`void`\>

#### Source

[avpipeline/MuxPipeline.ts:254](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avpipeline/MuxPipeline.ts#L254)
