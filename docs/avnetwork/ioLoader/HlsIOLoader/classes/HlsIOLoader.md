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

[avnetwork/ioLoader/HlsIOLoader.ts:444](https://github.com/zhaohappy/libmedia/blob/a88305ff5d10e91621f2d71d24c72fc85681b8f7/src/avnetwork/ioLoader/HlsIOLoader.ts#L444)

***

### getDuration()

> **getDuration**(): `number`

#### Returns

`number`

#### Source

[avnetwork/ioLoader/HlsIOLoader.ts:456](https://github.com/zhaohappy/libmedia/blob/a88305ff5d10e91621f2d71d24c72fc85681b8f7/src/avnetwork/ioLoader/HlsIOLoader.ts#L456)

***

### getMinBuffer()

> **getMinBuffer**(): `number`

#### Returns

`number`

#### Source

[avnetwork/ioLoader/HlsIOLoader.ts:478](https://github.com/zhaohappy/libmedia/blob/a88305ff5d10e91621f2d71d24c72fc85681b8f7/src/avnetwork/ioLoader/HlsIOLoader.ts#L478)

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

[avnetwork/ioLoader/HlsIOLoader.ts:460](https://github.com/zhaohappy/libmedia/blob/a88305ff5d10e91621f2d71d24c72fc85681b8f7/src/avnetwork/ioLoader/HlsIOLoader.ts#L460)

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

[avnetwork/ioLoader/HlsIOLoader.ts:232](https://github.com/zhaohappy/libmedia/blob/a88305ff5d10e91621f2d71d24c72fc85681b8f7/src/avnetwork/ioLoader/HlsIOLoader.ts#L232)

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

[avnetwork/ioLoader/HlsIOLoader.ts:299](https://github.com/zhaohappy/libmedia/blob/a88305ff5d10e91621f2d71d24c72fc85681b8f7/src/avnetwork/ioLoader/HlsIOLoader.ts#L299)

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

[avnetwork/ioLoader/HlsIOLoader.ts:414](https://github.com/zhaohappy/libmedia/blob/a88305ff5d10e91621f2d71d24c72fc85681b8f7/src/avnetwork/ioLoader/HlsIOLoader.ts#L414)

***

### selectVideo()

> **selectVideo**(`index`): `void`

#### Parameters

• **index**: `number`

#### Returns

`void`

#### Source

[avnetwork/ioLoader/HlsIOLoader.ts:473](https://github.com/zhaohappy/libmedia/blob/a88305ff5d10e91621f2d71d24c72fc85681b8f7/src/avnetwork/ioLoader/HlsIOLoader.ts#L473)

***

### size()

> **size**(): `Promise`\<`bigint`\>

#### Returns

`Promise`\<`bigint`\>

#### Overrides

`IOLoader.size`

#### Source

[avnetwork/ioLoader/HlsIOLoader.ts:440](https://github.com/zhaohappy/libmedia/blob/a88305ff5d10e91621f2d71d24c72fc85681b8f7/src/avnetwork/ioLoader/HlsIOLoader.ts#L440)

***

### stop()

> **stop**(): `Promise`\<`void`\>

#### Returns

`Promise`\<`void`\>

#### Overrides

`IOLoader.stop`

#### Source

[avnetwork/ioLoader/HlsIOLoader.ts:451](https://github.com/zhaohappy/libmedia/blob/a88305ff5d10e91621f2d71d24c72fc85681b8f7/src/avnetwork/ioLoader/HlsIOLoader.ts#L451)
