[**libmedia**](../../../README.md) • **Docs**

***

[libmedia](../../../README.md) / [avpipeline/IOPipeline](../README.md) / IOPipeline

# Class: IOPipeline

## Extends

- `default`

## Constructors

### new IOPipeline()

> **new IOPipeline**(): [`IOPipeline`](IOPipeline.md)

#### Returns

[`IOPipeline`](IOPipeline.md)

#### Overrides

`Pipeline.constructor`

#### Source

[avpipeline/IOPipeline.ts:62](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avpipeline/IOPipeline.ts#L62)

## Properties

### tasks

> **tasks**: `Map`\<`string`, `SelfTask`\>

#### Overrides

`Pipeline.tasks`

#### Source

[avpipeline/IOPipeline.ts:60](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avpipeline/IOPipeline.ts#L60)

## Methods

### clear()

> **clear**(): `Promise`\<`void`\>

#### Returns

`Promise`\<`void`\>

#### Inherited from

`Pipeline.clear`

#### Source

[avpipeline/Pipeline.ts:48](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avpipeline/Pipeline.ts#L48)

***

### getAudioList()

> **getAudioList**(`taskId`): `Promise`\<`object`\>

#### Parameters

• **taskId**: `string`

#### Returns

`Promise`\<`object`\>

##### list

> **list**: `object`[]

##### selectedIndex

> **selectedIndex**: `number`

#### Source

[avpipeline/IOPipeline.ts:249](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avpipeline/IOPipeline.ts#L249)

***

### getDuration()

> **getDuration**(`taskId`): `Promise`\<`number`\>

#### Parameters

• **taskId**: `string`

#### Returns

`Promise`\<`number`\>

#### Source

[avpipeline/IOPipeline.ts:183](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avpipeline/IOPipeline.ts#L183)

***

### getMinBuffer()

> **getMinBuffer**(`taskId`): `Promise`\<`number`\>

#### Parameters

• **taskId**: `string`

#### Returns

`Promise`\<`number`\>

#### Source

[avpipeline/IOPipeline.ts:315](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avpipeline/IOPipeline.ts#L315)

***

### getSubtitleList()

> **getSubtitleList**(`taskId`): `Promise`\<`object`\>

#### Parameters

• **taskId**: `string`

#### Returns

`Promise`\<`object`\>

##### list

> **list**: `object`[]

##### selectedIndex

> **selectedIndex**: `number` = `0`

#### Source

[avpipeline/IOPipeline.ts:264](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avpipeline/IOPipeline.ts#L264)

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

### getVideoList()

> **getVideoList**(`taskId`): `Promise`\<`object`\>

#### Parameters

• **taskId**: `string`

#### Returns

`Promise`\<`object`\>

##### list

> **list**: `object`[]

##### selectedIndex

> **selectedIndex**: `number`

#### Source

[avpipeline/IOPipeline.ts:231](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avpipeline/IOPipeline.ts#L231)

***

### hasAudio()

> **hasAudio**(`taskId`): `Promise`\<`boolean`\>

#### Parameters

• **taskId**: `string`

#### Returns

`Promise`\<`boolean`\>

#### Source

[avpipeline/IOPipeline.ts:195](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avpipeline/IOPipeline.ts#L195)

***

### hasSubtitle()

> **hasSubtitle**(`taskId`): `Promise`\<`boolean`\>

#### Parameters

• **taskId**: `string`

#### Returns

`Promise`\<`boolean`\>

#### Source

[avpipeline/IOPipeline.ts:219](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avpipeline/IOPipeline.ts#L219)

***

### hasVideo()

> **hasVideo**(`taskId`): `Promise`\<`boolean`\>

#### Parameters

• **taskId**: `string`

#### Returns

`Promise`\<`boolean`\>

#### Source

[avpipeline/IOPipeline.ts:207](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avpipeline/IOPipeline.ts#L207)

***

### open()

> **open**(`id`): `Promise`\<`number`\>

#### Parameters

• **id**: `string`

#### Returns

`Promise`\<`number`\>

#### Source

[avpipeline/IOPipeline.ts:175](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avpipeline/IOPipeline.ts#L175)

***

### registerTask()

> **registerTask**(`options`): `Promise`\<`number`\>

#### Parameters

• **options**: [`IOTaskOptions`](../interfaces/IOTaskOptions.md)

#### Returns

`Promise`\<`number`\>

#### Overrides

`Pipeline.registerTask`

#### Source

[avpipeline/IOPipeline.ts:332](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avpipeline/IOPipeline.ts#L332)

***

### selectAudio()

> **selectAudio**(`taskId`, `index`): `Promise`\<`void`\>

#### Parameters

• **taskId**: `string`

• **index**: `number`

#### Returns

`Promise`\<`void`\>

#### Source

[avpipeline/IOPipeline.ts:293](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avpipeline/IOPipeline.ts#L293)

***

### selectSubtitle()

> **selectSubtitle**(`taskId`, `index`): `Promise`\<`void`\>

#### Parameters

• **taskId**: `string`

• **index**: `number`

#### Returns

`Promise`\<`void`\>

#### Source

[avpipeline/IOPipeline.ts:304](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avpipeline/IOPipeline.ts#L304)

***

### selectVideo()

> **selectVideo**(`taskId`, `index`): `Promise`\<`void`\>

#### Parameters

• **taskId**: `string`

• **index**: `number`

#### Returns

`Promise`\<`void`\>

#### Source

[avpipeline/IOPipeline.ts:279](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avpipeline/IOPipeline.ts#L279)

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

### unregisterTask()

> **unregisterTask**(`id`): `Promise`\<`void`\>

#### Parameters

• **id**: `string`

#### Returns

`Promise`\<`void`\>

#### Overrides

`Pipeline.unregisterTask`

#### Source

[avpipeline/IOPipeline.ts:339](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avpipeline/IOPipeline.ts#L339)
