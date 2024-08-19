[**libmedia**](../../../../README.md) • **Docs**

***

[libmedia](../../../../README.md) / [avnetwork/ioLoader/DashIOLoader](../README.md) / DashIOLoader

# Class: DashIOLoader

## Extends

- `default`

## Constructors

### new DashIOLoader()

> **new DashIOLoader**(`options`): [`DashIOLoader`](DashIOLoader.md)

#### Parameters

• **options**: `IOLoaderOptions`= `{}`

#### Returns

[`DashIOLoader`](DashIOLoader.md)

#### Inherited from

`IOLoader.constructor`

#### Source

[avnetwork/ioLoader/IOLoader.ts:67](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avnetwork/ioLoader/IOLoader.ts#L67)

## Properties

### options

> **options**: `IOLoaderOptions`

#### Inherited from

`IOLoader.options`

#### Source

[avnetwork/ioLoader/IOLoader.ts:59](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avnetwork/ioLoader/IOLoader.ts#L59)

## Methods

### abort()

> **abort**(): `Promise`\<`void`\>

#### Returns

`Promise`\<`void`\>

#### Overrides

`IOLoader.abort`

#### Source

[avnetwork/ioLoader/DashIOLoader.ts:416](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avnetwork/ioLoader/DashIOLoader.ts#L416)

***

### getAudioList()

> **getAudioList**(): `object`

#### Returns

`object`

##### list

> **list**: `object`[]

##### selectedIndex

> **selectedIndex**: `number`

#### Source

[avnetwork/ioLoader/DashIOLoader.ts:471](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avnetwork/ioLoader/DashIOLoader.ts#L471)

***

### getDuration()

> **getDuration**(): `number`

#### Returns

`number`

#### Source

[avnetwork/ioLoader/DashIOLoader.ts:436](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avnetwork/ioLoader/DashIOLoader.ts#L436)

***

### getMinBuffer()

> **getMinBuffer**(): `number`

#### Returns

`number`

#### Source

[avnetwork/ioLoader/DashIOLoader.ts:560](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avnetwork/ioLoader/DashIOLoader.ts#L560)

***

### getSubtitleList()

> **getSubtitleList**(): `object`

#### Returns

`object`

##### list

> **list**: `object`[]

##### selectedIndex

> **selectedIndex**: `number`

#### Source

[avnetwork/ioLoader/DashIOLoader.ts:488](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avnetwork/ioLoader/DashIOLoader.ts#L488)

***

### getVideoList()

> **getVideoList**(): `object`

#### Returns

`object`

##### list

> **list**: `object`[]

##### selectedIndex

> **selectedIndex**: `number`

#### Source

[avnetwork/ioLoader/DashIOLoader.ts:452](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avnetwork/ioLoader/DashIOLoader.ts#L452)

***

### hasAudio()

> **hasAudio**(): `boolean`

#### Returns

`boolean`

#### Source

[avnetwork/ioLoader/DashIOLoader.ts:444](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avnetwork/ioLoader/DashIOLoader.ts#L444)

***

### hasSubtitle()

> **hasSubtitle**(): `boolean`

#### Returns

`boolean`

#### Source

[avnetwork/ioLoader/DashIOLoader.ts:448](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avnetwork/ioLoader/DashIOLoader.ts#L448)

***

### hasVideo()

> **hasVideo**(): `boolean`

#### Returns

`boolean`

#### Source

[avnetwork/ioLoader/DashIOLoader.ts:440](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avnetwork/ioLoader/DashIOLoader.ts#L440)

***

### open()

> **open**(`info`, `range`): `Promise`\<`void`\>

#### Parameters

• **info**: [`FetchInfo`](../interfaces/FetchInfo.md)

• **range**: `Range`

#### Returns

`Promise`\<`void`\>

#### Overrides

`IOLoader.open`

#### Source

[avnetwork/ioLoader/DashIOLoader.ts:225](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avnetwork/ioLoader/DashIOLoader.ts#L225)

***

### read()

> **read**(`buffer`, `options`): `Promise`\<`number`\>

#### Parameters

• **buffer**: `Uint8ArrayInterface`

• **options**

• **options.mediaType**: `MediaType`

#### Returns

`Promise`\<`number`\>

#### Overrides

`IOLoader.read`

#### Source

[avnetwork/ioLoader/DashIOLoader.ts:348](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avnetwork/ioLoader/DashIOLoader.ts#L348)

***

### seek()

> **seek**(`timestamp`, `options`): `Promise`\<`void`\>

#### Parameters

• **timestamp**: `int64`

• **options**

• **options.mediaType**: `MediaType`

#### Returns

`Promise`\<`void`\>

#### Overrides

`IOLoader.seek`

#### Source

[avnetwork/ioLoader/DashIOLoader.ts:393](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avnetwork/ioLoader/DashIOLoader.ts#L393)

***

### selectAudio()

> **selectAudio**(`index`): `void`

#### Parameters

• **index**: `number`

#### Returns

`void`

#### Source

[avnetwork/ioLoader/DashIOLoader.ts:524](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avnetwork/ioLoader/DashIOLoader.ts#L524)

***

### selectSubtitle()

> **selectSubtitle**(`index`): `void`

#### Parameters

• **index**: `number`

#### Returns

`void`

#### Source

[avnetwork/ioLoader/DashIOLoader.ts:542](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avnetwork/ioLoader/DashIOLoader.ts#L542)

***

### selectVideo()

> **selectVideo**(`index`): `void`

#### Parameters

• **index**: `number`

#### Returns

`void`

#### Source

[avnetwork/ioLoader/DashIOLoader.ts:506](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avnetwork/ioLoader/DashIOLoader.ts#L506)

***

### size()

> **size**(): `Promise`\<`bigint`\>

#### Returns

`Promise`\<`bigint`\>

#### Overrides

`IOLoader.size`

#### Source

[avnetwork/ioLoader/DashIOLoader.ts:412](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avnetwork/ioLoader/DashIOLoader.ts#L412)

***

### stop()

> **stop**(): `Promise`\<`void`\>

#### Returns

`Promise`\<`void`\>

#### Overrides

`IOLoader.stop`

#### Source

[avnetwork/ioLoader/DashIOLoader.ts:431](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avnetwork/ioLoader/DashIOLoader.ts#L431)
