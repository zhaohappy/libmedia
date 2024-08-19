[**libmedia**](../../../../README.md) • **Docs**

***

[libmedia](../../../../README.md) / [avnetwork/ioLoader/FetchIOLoader](../README.md) / FetchIOLoader

# Class: FetchIOLoader

## Extends

- `default`

## Constructors

### new FetchIOLoader()

> **new FetchIOLoader**(`options`): [`FetchIOLoader`](FetchIOLoader.md)

#### Parameters

• **options**: [`FetchIOLoaderOptions`](../interfaces/FetchIOLoaderOptions.md)= `{}`

#### Returns

[`FetchIOLoader`](FetchIOLoader.md)

#### Overrides

`IOLoader.constructor`

#### Source

[avnetwork/ioLoader/FetchIOLoader.ts:69](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avnetwork/ioLoader/FetchIOLoader.ts#L69)

## Properties

### options

> **options**: [`FetchIOLoaderOptions`](../interfaces/FetchIOLoaderOptions.md)

#### Overrides

`IOLoader.options`

#### Source

[avnetwork/ioLoader/FetchIOLoader.ts:47](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avnetwork/ioLoader/FetchIOLoader.ts#L47)

## Methods

### abort()

> **abort**(): `Promise`\<`void`\>

#### Returns

`Promise`\<`void`\>

#### Overrides

`IOLoader.abort`

#### Source

[avnetwork/ioLoader/FetchIOLoader.ts:305](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avnetwork/ioLoader/FetchIOLoader.ts#L305)

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

[avnetwork/ioLoader/FetchIOLoader.ts:73](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avnetwork/ioLoader/FetchIOLoader.ts#L73)

***

### read()

> **read**(`buffer`): `Promise`\<`int32`\>

#### Parameters

• **buffer**: `Uint8ArrayInterface`

#### Returns

`Promise`\<`int32`\>

#### Overrides

`IOLoader.read`

#### Source

[avnetwork/ioLoader/FetchIOLoader.ts:281](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avnetwork/ioLoader/FetchIOLoader.ts#L281)

***

### seek()

> **seek**(`pos`): `Promise`\<`void`\>

#### Parameters

• **pos**: `int64`

#### Returns

`Promise`\<`void`\>

#### Overrides

`IOLoader.seek`

#### Source

[avnetwork/ioLoader/FetchIOLoader.ts:285](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avnetwork/ioLoader/FetchIOLoader.ts#L285)

***

### size()

> **size**(): `Promise`\<`int64` \| `0n`\>

#### Returns

`Promise`\<`int64` \| `0n`\>

#### Overrides

`IOLoader.size`

#### Source

[avnetwork/ioLoader/FetchIOLoader.ts:298](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avnetwork/ioLoader/FetchIOLoader.ts#L298)

***

### stop()

> **stop**(): `Promise`\<`void`\>

#### Returns

`Promise`\<`void`\>

#### Overrides

`IOLoader.stop`

#### Source

[avnetwork/ioLoader/FetchIOLoader.ts:316](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avnetwork/ioLoader/FetchIOLoader.ts#L316)
