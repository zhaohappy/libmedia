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

[avpipeline/AudioEncodePipeline.ts:68](https://github.com/zhaohappy/libmedia/blob/a88305ff5d10e91621f2d71d24c72fc85681b8f7/src/avpipeline/AudioEncodePipeline.ts#L68)

## Properties

### tasks

> **tasks**: `Map`\<`string`, `SelfTask`\>

#### Overrides

`Pipeline.tasks`

#### Source

[avpipeline/AudioEncodePipeline.ts:66](https://github.com/zhaohappy/libmedia/blob/a88305ff5d10e91621f2d71d24c72fc85681b8f7/src/avpipeline/AudioEncodePipeline.ts#L66)

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

[avpipeline/AudioEncodePipeline.ts:226](https://github.com/zhaohappy/libmedia/blob/a88305ff5d10e91621f2d71d24c72fc85681b8f7/src/avpipeline/AudioEncodePipeline.ts#L226)

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

### open()

> **open**(`taskId`, `parameters`, `timeBase`): `Promise`\<`void`\>

#### Parameters

• **taskId**: `string`

• **parameters**: `pointer`\<[`AVCodecParameters`](../../../avutil/struct/avcodecparameters/classes/AVCodecParameters.md)\>

• **timeBase**: `Rational`

#### Returns

`Promise`\<`void`\>

#### Source

[avpipeline/AudioEncodePipeline.ts:213](https://github.com/zhaohappy/libmedia/blob/a88305ff5d10e91621f2d71d24c72fc85681b8f7/src/avpipeline/AudioEncodePipeline.ts#L213)

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

[avpipeline/AudioEncodePipeline.ts:250](https://github.com/zhaohappy/libmedia/blob/a88305ff5d10e91621f2d71d24c72fc85681b8f7/src/avpipeline/AudioEncodePipeline.ts#L250)

***

### resetTask()

> **resetTask**(`taskId`): `Promise`\<`void`\>

#### Parameters

• **taskId**: `string`

#### Returns

`Promise`\<`void`\>

#### Source

[avpipeline/AudioEncodePipeline.ts:234](https://github.com/zhaohappy/libmedia/blob/a88305ff5d10e91621f2d71d24c72fc85681b8f7/src/avpipeline/AudioEncodePipeline.ts#L234)

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

[avpipeline/AudioEncodePipeline.ts:257](https://github.com/zhaohappy/libmedia/blob/a88305ff5d10e91621f2d71d24c72fc85681b8f7/src/avpipeline/AudioEncodePipeline.ts#L257)
