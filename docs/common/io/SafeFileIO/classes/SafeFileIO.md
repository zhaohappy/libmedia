[**libmedia**](../../../../README.md) • **Docs**

***

[libmedia](../../../../README.md) / [common/io/SafeFileIO](../README.md) / SafeFileIO

# Class: SafeFileIO

## Extends

- `default`

## Constructors

### new SafeFileIO()

> **new SafeFileIO**(`handler`, `append`): [`SafeFileIO`](SafeFileIO.md)

#### Parameters

• **handler**: `FileHandler`

• **append**: `boolean`= `false`

#### Returns

[`SafeFileIO`](SafeFileIO.md)

#### Overrides

`FileIO.constructor`

#### Source

common/io/SafeFileIO.ts:8

## Accessors

### writeQueueSize

> `get` **writeQueueSize**(): `number`

#### Returns

`number`

#### Source

common/io/SafeFileIO.ts:61

## Methods

### appendBufferByPosition()

> **appendBufferByPosition**(`buffer`, `position`): `Promise`\<`void`\>

#### Parameters

• **buffer**: `ArrayBuffer` \| `Uint8Array`

• **position**: `number`

#### Returns

`Promise`\<`void`\>

#### Overrides

`FileIO.appendBufferByPosition`

#### Source

common/io/SafeFileIO.ts:43

***

### close()

> **close**(): `Promise`\<`void`\>

#### Returns

`Promise`\<`void`\>

#### Overrides

`FileIO.close`

#### Source

common/io/SafeFileIO.ts:49

***

### destroy()

> **destroy**(): `Promise`\<`void`\>

#### Returns

`Promise`\<`void`\>

#### Overrides

`FileIO.destroy`

#### Source

common/io/SafeFileIO.ts:55

***

### getFile()

> **getFile**(): `File`

#### Returns

`File`

#### Inherited from

`FileIO.getFile`

#### Source

common/io/FileIO.ts:155

***

### getHandle()

> **getHandle**(): `FileHandler`

#### Returns

`FileHandler`

#### Inherited from

`FileIO.getHandle`

#### Source

common/io/FileIO.ts:159

***

### getPos()

> **getPos**(): `number`

#### Returns

`number`

#### Inherited from

`FileIO.getPos`

#### Source

common/io/FileIO.ts:163

***

### getSize()

> **getSize**(): `number`

#### Returns

`number`

#### Inherited from

`FileIO.getSize`

#### Source

common/io/FileIO.ts:167

***

### read()

> **read**(`start`, `end`): `Promise`\<`ArrayBuffer`\>

#### Parameters

• **start**: `number`

• **end**: `number`

#### Returns

`Promise`\<`ArrayBuffer`\>

#### Overrides

`FileIO.read`

#### Source

common/io/SafeFileIO.ts:37

***

### read\_()

> **read\_**(`start`, `end`): `Promise`\<`ArrayBuffer`\>

#### Parameters

• **start**: `number`

• **end**: `number`

#### Returns

`Promise`\<`ArrayBuffer`\>

#### Inherited from

`FileIO.read_`

#### Source

common/io/FileIO.ts:99

***

### ready()

> **ready**(): `Promise`\<`void`\>

#### Returns

`Promise`\<`void`\>

#### Inherited from

`FileIO.ready`

#### Source

common/io/FileIO.ts:35

***

### resize()

> **resize**(`size`): `Promise`\<`void`\>

#### Parameters

• **size**: `number`

#### Returns

`Promise`\<`void`\>

#### Overrides

`FileIO.resize`

#### Source

common/io/SafeFileIO.ts:31

***

### seek()

> **seek**(`position`): `Promise`\<`void`\>

#### Parameters

• **position**: `number`

#### Returns

`Promise`\<`void`\>

#### Overrides

`FileIO.seek`

#### Source

common/io/SafeFileIO.ts:19

***

### seekToEnd()

> **seekToEnd**(): `Promise`\<`void`\>

#### Returns

`Promise`\<`void`\>

#### Overrides

`FileIO.seekToEnd`

#### Source

common/io/SafeFileIO.ts:25

***

### write()

> **write**(`data`): `Promise`\<`void`\>

#### Parameters

• **data**: `ArrayBuffer` \| `ArrayBufferView`

#### Returns

`Promise`\<`void`\>

#### Overrides

`FileIO.write`

#### Source

common/io/SafeFileIO.ts:13
