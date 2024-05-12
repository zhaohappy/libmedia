[**libmedia**](../../../../README.md) • **Docs**

***

[libmedia](../../../../README.md) / [avnetwork/ioLoader/HlsIOLoader](../README.md) / HlsIOLoader

# Class: HlsIOLoader

## Extends

- `default`

## Constructors

### new HlsIOLoader()

> **new HlsIOLoader**(`options`): [`HlsIOLoader`](HlsIOLoader.md)

#### Parameters

• **options**: `IOLoaderOptions`= `{}`

#### Returns

[`HlsIOLoader`](HlsIOLoader.md)

#### Inherited from

`IOLoader.constructor`

#### Source

[avnetwork/ioLoader/IOLoader.ts:67](https://github.com/zhaohappy/libmedia/blob/acbbf6bd75e6ee4c968b9f441fe28c40f42f350d/src/avnetwork/ioLoader/IOLoader.ts#L67)

## Properties

### options

> **options**: `IOLoaderOptions`

#### Inherited from

`IOLoader.options`

#### Source

[avnetwork/ioLoader/IOLoader.ts:59](https://github.com/zhaohappy/libmedia/blob/acbbf6bd75e6ee4c968b9f441fe28c40f42f350d/src/avnetwork/ioLoader/IOLoader.ts#L59)

## Methods

### abort()

> **abort**(): `Promise`\<`void`\>

#### Returns

`Promise`\<`void`\>

#### Overrides

`IOLoader.abort`

#### Source

[avnetwork/ioLoader/HlsIOLoader.ts:407](https://github.com/zhaohappy/libmedia/blob/acbbf6bd75e6ee4c968b9f441fe28c40f42f350d/src/avnetwork/ioLoader/HlsIOLoader.ts#L407)

***

### getDuration()

> **getDuration**(): `number`

#### Returns

`number`

#### Source

[avnetwork/ioLoader/HlsIOLoader.ts:419](https://github.com/zhaohappy/libmedia/blob/acbbf6bd75e6ee4c968b9f441fe28c40f42f350d/src/avnetwork/ioLoader/HlsIOLoader.ts#L419)

***

### getMinBuffer()

> **getMinBuffer**(): `number`

#### Returns

`number`

#### Source

[avnetwork/ioLoader/HlsIOLoader.ts:441](https://github.com/zhaohappy/libmedia/blob/acbbf6bd75e6ee4c968b9f441fe28c40f42f350d/src/avnetwork/ioLoader/HlsIOLoader.ts#L441)

***

### getVideoList()

> **getVideoList**(): `object`

#### Returns

`object`

##### list

> **list**: `object`[]

##### selectedIndex

> **selectedIndex**: `number` = `0`

#### Source

[avnetwork/ioLoader/HlsIOLoader.ts:423](https://github.com/zhaohappy/libmedia/blob/acbbf6bd75e6ee4c968b9f441fe28c40f42f350d/src/avnetwork/ioLoader/HlsIOLoader.ts#L423)

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

[avnetwork/ioLoader/HlsIOLoader.ts:230](https://github.com/zhaohappy/libmedia/blob/acbbf6bd75e6ee4c968b9f441fe28c40f42f350d/src/avnetwork/ioLoader/HlsIOLoader.ts#L230)

***

### read()

> **read**(`buffer`): `Promise`\<`number`\>

#### Parameters

• **buffer**: `Uint8ArrayInterface`

#### Returns

`Promise`\<`number`\>

#### Overrides

`IOLoader.read`

#### Source

[avnetwork/ioLoader/HlsIOLoader.ts:292](https://github.com/zhaohappy/libmedia/blob/acbbf6bd75e6ee4c968b9f441fe28c40f42f350d/src/avnetwork/ioLoader/HlsIOLoader.ts#L292)

***

### seek()

> **seek**(`timestamp`): `Promise`\<`void`\>

#### Parameters

• **timestamp**: `int64`

#### Returns

`Promise`\<`void`\>

#### Overrides

`IOLoader.seek`

#### Source

[avnetwork/ioLoader/HlsIOLoader.ts:379](https://github.com/zhaohappy/libmedia/blob/acbbf6bd75e6ee4c968b9f441fe28c40f42f350d/src/avnetwork/ioLoader/HlsIOLoader.ts#L379)

***

### selectVideo()

> **selectVideo**(`index`): `void`

#### Parameters

• **index**: `number`

#### Returns

`void`

#### Source

[avnetwork/ioLoader/HlsIOLoader.ts:436](https://github.com/zhaohappy/libmedia/blob/acbbf6bd75e6ee4c968b9f441fe28c40f42f350d/src/avnetwork/ioLoader/HlsIOLoader.ts#L436)

***

### size()

> **size**(): `Promise`\<`bigint`\>

#### Returns

`Promise`\<`bigint`\>

#### Overrides

`IOLoader.size`

#### Source

[avnetwork/ioLoader/HlsIOLoader.ts:403](https://github.com/zhaohappy/libmedia/blob/acbbf6bd75e6ee4c968b9f441fe28c40f42f350d/src/avnetwork/ioLoader/HlsIOLoader.ts#L403)

***

### stop()

> **stop**(): `Promise`\<`void`\>

#### Returns

`Promise`\<`void`\>

#### Overrides

`IOLoader.stop`

#### Source

[avnetwork/ioLoader/HlsIOLoader.ts:414](https://github.com/zhaohappy/libmedia/blob/acbbf6bd75e6ee4c968b9f441fe28c40f42f350d/src/avnetwork/ioLoader/HlsIOLoader.ts#L414)
