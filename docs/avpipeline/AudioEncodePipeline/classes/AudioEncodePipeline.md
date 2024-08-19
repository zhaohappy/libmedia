[**libmedia**](../../../README.md) • **Docs**

***

[libmedia](../../../README.md) / [avpipeline/AudioEncodePipeline](../README.md) / AudioEncodePipeline

# Class: AudioEncodePipeline

## Extends

- `default`

## Constructors

### new AudioEncodePipeline()

> **new AudioEncodePipeline**(): [`AudioEncodePipeline`](AudioEncodePipeline.md)

#### Returns

[`AudioEncodePipeline`](AudioEncodePipeline.md)

#### Overrides

`Pipeline.constructor`

#### Source

[avpipeline/AudioEncodePipeline.ts:72](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avpipeline/AudioEncodePipeline.ts#L72)

## Properties

### tasks

> **tasks**: `Map`\<`string`, `SelfTask`\>

#### Overrides

`Pipeline.tasks`

#### Source

[avpipeline/AudioEncodePipeline.ts:70](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avpipeline/AudioEncodePipeline.ts#L70)

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

### getExtraData()

> **getExtraData**(`taskId`): `Promise`\<`Uint8Array`\>

#### Parameters

• **taskId**: `string`

#### Returns

`Promise`\<`Uint8Array`\>

#### Source

[avpipeline/AudioEncodePipeline.ts:235](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avpipeline/AudioEncodePipeline.ts#L235)

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

> **open**(`taskId`, `parameters`, `timeBase`, `wasmEncoderOptions`): `Promise`\<`number`\>

#### Parameters

• **taskId**: `string`

• **parameters**: `pointer`\<[`AVCodecParameters`](../../../avutil/struct/avcodecparameters/classes/AVCodecParameters.md)\>

• **timeBase**: `Rational`

• **wasmEncoderOptions**: `Data`= `{}`

#### Returns

`Promise`\<`number`\>

#### Source

[avpipeline/AudioEncodePipeline.ts:214](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avpipeline/AudioEncodePipeline.ts#L214)

***

### registerTask()

> **registerTask**(`options`): `Promise`\<`number`\>

#### Parameters

• **options**: [`AudioEncodeTaskOptions`](../interfaces/AudioEncodeTaskOptions.md)

#### Returns

`Promise`\<`number`\>

#### Overrides

`Pipeline.registerTask`

#### Source

[avpipeline/AudioEncodePipeline.ts:259](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avpipeline/AudioEncodePipeline.ts#L259)

***

### resetTask()

> **resetTask**(`taskId`): `Promise`\<`void`\>

#### Parameters

• **taskId**: `string`

#### Returns

`Promise`\<`void`\>

#### Source

[avpipeline/AudioEncodePipeline.ts:243](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avpipeline/AudioEncodePipeline.ts#L243)

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

[avpipeline/AudioEncodePipeline.ts:266](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avpipeline/AudioEncodePipeline.ts#L266)
