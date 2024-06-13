[**libmedia**](../../../../README.md) • **Docs**

***

[libmedia](../../../../README.md) / [avnetwork/ioLoader/FileIOLoader](../README.md) / FileIOLoader

# Class: FileIOLoader

## Extends

- `default`

## Constructors

### new FileIOLoader()

> **new FileIOLoader**(`options`): [`FileIOLoader`](FileIOLoader.md)

#### Parameters

• **options**: `IOLoaderOptions`= `{}`

#### Returns

[`FileIOLoader`](FileIOLoader.md)

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

[avnetwork/ioLoader/FileIOLoader.ts:119](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avnetwork/ioLoader/FileIOLoader.ts#L119)

***

### open()

> **open**(`info`, `range`): `Promise`\<`void`\>

#### Parameters

• **info**: [`FileInfo`](../interfaces/FileInfo.md)

• **range**: `Range`

#### Returns

`Promise`\<`void`\>

#### Overrides

`IOLoader.open`

#### Source

[avnetwork/ioLoader/FileIOLoader.ts:48](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avnetwork/ioLoader/FileIOLoader.ts#L48)

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

[avnetwork/ioLoader/FileIOLoader.ts:83](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avnetwork/ioLoader/FileIOLoader.ts#L83)

***

### seek()

> **seek**(`pos`): `Promise`\<`number`\>

#### Parameters

• **pos**: `int64`

#### Returns

`Promise`\<`number`\>

#### Overrides

`IOLoader.seek`

#### Source

[avnetwork/ioLoader/FileIOLoader.ts:106](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avnetwork/ioLoader/FileIOLoader.ts#L106)

***

### size()

> **size**(): `Promise`\<`int64`\>

#### Returns

`Promise`\<`int64`\>

#### Overrides

`IOLoader.size`

#### Source

[avnetwork/ioLoader/FileIOLoader.ts:115](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avnetwork/ioLoader/FileIOLoader.ts#L115)

***

### stop()

> **stop**(): `Promise`\<`void`\>

#### Returns

`Promise`\<`void`\>

#### Overrides

`IOLoader.stop`

#### Source

[avnetwork/ioLoader/FileIOLoader.ts:123](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avnetwork/ioLoader/FileIOLoader.ts#L123)
