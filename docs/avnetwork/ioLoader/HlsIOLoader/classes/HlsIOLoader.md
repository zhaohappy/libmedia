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

[avnetwork/ioLoader/IOLoader.ts:67](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avnetwork/ioLoader/IOLoader.ts#L67)

## Properties

### options

> **options**: `IOLoaderOptions`

#### Inherited from

`IOLoader.options`

#### Source

[avnetwork/ioLoader/IOLoader.ts:59](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avnetwork/ioLoader/IOLoader.ts#L59)

## Methods

### abort()

> **abort**(): `Promise`\<`void`\>

#### Returns

`Promise`\<`void`\>

#### Overrides

`IOLoader.abort`

#### Source

[avnetwork/ioLoader/HlsIOLoader.ts:439](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avnetwork/ioLoader/HlsIOLoader.ts#L439)

***

### getDuration()

> **getDuration**(): `number`

#### Returns

`number`

#### Source

[avnetwork/ioLoader/HlsIOLoader.ts:451](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avnetwork/ioLoader/HlsIOLoader.ts#L451)

***

### getMinBuffer()

> **getMinBuffer**(): `number`

#### Returns

`number`

#### Source

[avnetwork/ioLoader/HlsIOLoader.ts:473](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avnetwork/ioLoader/HlsIOLoader.ts#L473)

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

[avnetwork/ioLoader/HlsIOLoader.ts:455](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avnetwork/ioLoader/HlsIOLoader.ts#L455)

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

[avnetwork/ioLoader/HlsIOLoader.ts:232](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avnetwork/ioLoader/HlsIOLoader.ts#L232)

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

[avnetwork/ioLoader/HlsIOLoader.ts:299](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avnetwork/ioLoader/HlsIOLoader.ts#L299)

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

[avnetwork/ioLoader/HlsIOLoader.ts:411](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avnetwork/ioLoader/HlsIOLoader.ts#L411)

***

### selectVideo()

> **selectVideo**(`index`): `void`

#### Parameters

• **index**: `number`

#### Returns

`void`

#### Source

[avnetwork/ioLoader/HlsIOLoader.ts:468](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avnetwork/ioLoader/HlsIOLoader.ts#L468)

***

### size()

> **size**(): `Promise`\<`bigint`\>

#### Returns

`Promise`\<`bigint`\>

#### Overrides

`IOLoader.size`

#### Source

[avnetwork/ioLoader/HlsIOLoader.ts:435](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avnetwork/ioLoader/HlsIOLoader.ts#L435)

***

### stop()

> **stop**(): `Promise`\<`void`\>

#### Returns

`Promise`\<`void`\>

#### Overrides

`IOLoader.stop`

#### Source

[avnetwork/ioLoader/HlsIOLoader.ts:446](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avnetwork/ioLoader/HlsIOLoader.ts#L446)
