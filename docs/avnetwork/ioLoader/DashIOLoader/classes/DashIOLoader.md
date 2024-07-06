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

[avnetwork/ioLoader/IOLoader.ts:67](https://github.com/zhaohappy/libmedia/blob/a88305ff5d10e91621f2d71d24c72fc85681b8f7/src/avnetwork/ioLoader/IOLoader.ts#L67)

## Properties

### options

> **options**: `IOLoaderOptions`

#### Inherited from

`IOLoader.options`

#### Source

[avnetwork/ioLoader/IOLoader.ts:59](https://github.com/zhaohappy/libmedia/blob/a88305ff5d10e91621f2d71d24c72fc85681b8f7/src/avnetwork/ioLoader/IOLoader.ts#L59)

## Methods

### abort()

> **abort**(): `Promise`\<`void`\>

#### Returns

`Promise`\<`void`\>

#### Overrides

`IOLoader.abort`

#### Source

[avnetwork/ioLoader/DashIOLoader.ts:491](https://github.com/zhaohappy/libmedia/blob/a88305ff5d10e91621f2d71d24c72fc85681b8f7/src/avnetwork/ioLoader/DashIOLoader.ts#L491)

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

[avnetwork/ioLoader/DashIOLoader.ts:542](https://github.com/zhaohappy/libmedia/blob/a88305ff5d10e91621f2d71d24c72fc85681b8f7/src/avnetwork/ioLoader/DashIOLoader.ts#L542)

***

### getDuration()

> **getDuration**(): `number`

#### Returns

`number`

#### Source

[avnetwork/ioLoader/DashIOLoader.ts:507](https://github.com/zhaohappy/libmedia/blob/a88305ff5d10e91621f2d71d24c72fc85681b8f7/src/avnetwork/ioLoader/DashIOLoader.ts#L507)

***

### getMinBuffer()

> **getMinBuffer**(): `number`

#### Returns

`number`

#### Source

[avnetwork/ioLoader/DashIOLoader.ts:617](https://github.com/zhaohappy/libmedia/blob/a88305ff5d10e91621f2d71d24c72fc85681b8f7/src/avnetwork/ioLoader/DashIOLoader.ts#L617)

***

### getSubtitleList()

> **getSubtitleList**(): `object`

#### Returns

`object`

##### list

> **list**: `object`[]

##### selectedIndex

> **selectedIndex**: `number` = `0`

#### Source

[avnetwork/ioLoader/DashIOLoader.ts:559](https://github.com/zhaohappy/libmedia/blob/a88305ff5d10e91621f2d71d24c72fc85681b8f7/src/avnetwork/ioLoader/DashIOLoader.ts#L559)

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

[avnetwork/ioLoader/DashIOLoader.ts:523](https://github.com/zhaohappy/libmedia/blob/a88305ff5d10e91621f2d71d24c72fc85681b8f7/src/avnetwork/ioLoader/DashIOLoader.ts#L523)

***

### hasAudio()

> **hasAudio**(): `boolean`

#### Returns

`boolean`

#### Source

[avnetwork/ioLoader/DashIOLoader.ts:515](https://github.com/zhaohappy/libmedia/blob/a88305ff5d10e91621f2d71d24c72fc85681b8f7/src/avnetwork/ioLoader/DashIOLoader.ts#L515)

***

### hasSubtitle()

> **hasSubtitle**(): `boolean`

#### Returns

`boolean`

#### Source

[avnetwork/ioLoader/DashIOLoader.ts:519](https://github.com/zhaohappy/libmedia/blob/a88305ff5d10e91621f2d71d24c72fc85681b8f7/src/avnetwork/ioLoader/DashIOLoader.ts#L519)

***

### hasVideo()

> **hasVideo**(): `boolean`

#### Returns

`boolean`

#### Source

[avnetwork/ioLoader/DashIOLoader.ts:511](https://github.com/zhaohappy/libmedia/blob/a88305ff5d10e91621f2d71d24c72fc85681b8f7/src/avnetwork/ioLoader/DashIOLoader.ts#L511)

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

[avnetwork/ioLoader/DashIOLoader.ts:202](https://github.com/zhaohappy/libmedia/blob/a88305ff5d10e91621f2d71d24c72fc85681b8f7/src/avnetwork/ioLoader/DashIOLoader.ts#L202)

***

### read()

> **read**(`buffer`, `options`): `Promise`\<`number`\>

#### Parameters

• **buffer**: `Uint8ArrayInterface`

• **options**

• **options.mediaType**: `"audio"` \| `"video"`

#### Returns

`Promise`\<`number`\>

#### Overrides

`IOLoader.read`

#### Source

[avnetwork/ioLoader/DashIOLoader.ts:429](https://github.com/zhaohappy/libmedia/blob/a88305ff5d10e91621f2d71d24c72fc85681b8f7/src/avnetwork/ioLoader/DashIOLoader.ts#L429)

***

### seek()

> **seek**(`timestamp`, `options`): `Promise`\<`void`\>

#### Parameters

• **timestamp**: `int64`

• **options**

• **options.mediaType**: `"audio"` \| `"video"`

#### Returns

`Promise`\<`void`\>

#### Overrides

`IOLoader.seek`

#### Source

[avnetwork/ioLoader/DashIOLoader.ts:440](https://github.com/zhaohappy/libmedia/blob/a88305ff5d10e91621f2d71d24c72fc85681b8f7/src/avnetwork/ioLoader/DashIOLoader.ts#L440)

***

### selectAudio()

> **selectAudio**(`index`): `void`

#### Parameters

• **index**: `number`

#### Returns

`void`

#### Source

[avnetwork/ioLoader/DashIOLoader.ts:595](https://github.com/zhaohappy/libmedia/blob/a88305ff5d10e91621f2d71d24c72fc85681b8f7/src/avnetwork/ioLoader/DashIOLoader.ts#L595)

***

### selectSubtitle()

> **selectSubtitle**(`index`): `void`

#### Parameters

• **index**: `number`

#### Returns

`void`

#### Source

[avnetwork/ioLoader/DashIOLoader.ts:613](https://github.com/zhaohappy/libmedia/blob/a88305ff5d10e91621f2d71d24c72fc85681b8f7/src/avnetwork/ioLoader/DashIOLoader.ts#L613)

***

### selectVideo()

> **selectVideo**(`index`): `void`

#### Parameters

• **index**: `number`

#### Returns

`void`

#### Source

[avnetwork/ioLoader/DashIOLoader.ts:577](https://github.com/zhaohappy/libmedia/blob/a88305ff5d10e91621f2d71d24c72fc85681b8f7/src/avnetwork/ioLoader/DashIOLoader.ts#L577)

***

### size()

> **size**(): `Promise`\<`bigint`\>

#### Returns

`Promise`\<`bigint`\>

#### Overrides

`IOLoader.size`

#### Source

[avnetwork/ioLoader/DashIOLoader.ts:487](https://github.com/zhaohappy/libmedia/blob/a88305ff5d10e91621f2d71d24c72fc85681b8f7/src/avnetwork/ioLoader/DashIOLoader.ts#L487)

***

### stop()

> **stop**(): `Promise`\<`void`\>

#### Returns

`Promise`\<`void`\>

#### Overrides

`IOLoader.stop`

#### Source

[avnetwork/ioLoader/DashIOLoader.ts:502](https://github.com/zhaohappy/libmedia/blob/a88305ff5d10e91621f2d71d24c72fc85681b8f7/src/avnetwork/ioLoader/DashIOLoader.ts#L502)
