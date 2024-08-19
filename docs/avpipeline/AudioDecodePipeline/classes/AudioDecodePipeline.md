[**libmedia**](../../../README.md) • **Docs**

***

[libmedia](../../../README.md) / [avpipeline/AudioDecodePipeline](../README.md) / AudioDecodePipeline

# Class: AudioDecodePipeline

## Extends

- `default`

## Constructors

### new AudioDecodePipeline()

> **new AudioDecodePipeline**(): [`AudioDecodePipeline`](AudioDecodePipeline.md)

#### Returns

[`AudioDecodePipeline`](AudioDecodePipeline.md)

#### Overrides

`Pipeline.constructor`

#### Source

[avpipeline/AudioDecodePipeline.ts:79](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avpipeline/AudioDecodePipeline.ts#L79)

## Properties

### tasks

> **tasks**: `Map`\<`string`, `SelfTask`\>

#### Overrides

`Pipeline.tasks`

#### Source

[avpipeline/AudioDecodePipeline.ts:77](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avpipeline/AudioDecodePipeline.ts#L77)

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

### open()

> **open**(`taskId`, `parameters`, `wasmDecoderOptions`): `Promise`\<`number`\>

#### Parameters

• **taskId**: `string`

• **parameters**: `pointer`\<[`AVCodecParameters`](../../../avutil/struct/avcodecparameters/classes/AVCodecParameters.md)\>

• **wasmDecoderOptions**: `Data`= `{}`

#### Returns

`Promise`\<`number`\>

#### Source

[avpipeline/AudioDecodePipeline.ts:234](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avpipeline/AudioDecodePipeline.ts#L234)

***

### registerTask()

> **registerTask**(`options`): `Promise`\<`number`\>

#### Parameters

• **options**: [`AudioDecodeTaskOptions`](../interfaces/AudioDecodeTaskOptions.md)

#### Returns

`Promise`\<`number`\>

#### Overrides

`Pipeline.registerTask`

#### Source

[avpipeline/AudioDecodePipeline.ts:306](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avpipeline/AudioDecodePipeline.ts#L306)

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

[avpipeline/AudioDecodePipeline.ts:255](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avpipeline/AudioDecodePipeline.ts#L255)

***

### resetTask()

> **resetTask**(`taskId`): `Promise`\<`void`\>

#### Parameters

• **taskId**: `string`

#### Returns

`Promise`\<`void`\>

#### Source

[avpipeline/AudioDecodePipeline.ts:289](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avpipeline/AudioDecodePipeline.ts#L289)

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

[avpipeline/AudioDecodePipeline.ts:313](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avpipeline/AudioDecodePipeline.ts#L313)
