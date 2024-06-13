[**libmedia**](../../../../README.md) • **Docs**

***

[libmedia](../../../../README.md) / [common/io/IOWriterSync](../README.md) / IOWriterSync

# Class: IOWriterSync

## Implements

- `BytesWriterSync`

## Constructors

### new IOWriterSync()

> **new IOWriterSync**(`size`, `bigEndian`, `map`?): [`IOWriterSync`](IOWriterSync.md)

#### Parameters

• **size**: `number`= `undefined`

• **bigEndian**: `boolean`= `true`

是否按大端字节序写，默认大端字节序（网络字节序）

• **map?**: `Uint8ArrayInterface`

#### Returns

[`IOWriterSync`](IOWriterSync.md)

#### Source

common/io/IOWriterSync.ts:32

## Properties

### error

> **error**: `number`

#### Source

common/io/IOWriterSync.ts:23

***

### onFlush()

> **onFlush**: (`data`, `pos`?) => `number`

#### Parameters

• **data**: `Uint8Array`

• **pos?**: `bigint`

#### Returns

`number`

#### Source

common/io/IOWriterSync.ts:25

***

### onSeek()

> **onSeek**: (`seek`) => `number`

#### Parameters

• **seek**: `bigint`

#### Returns

`number`

#### Source

common/io/IOWriterSync.ts:26

## Methods

### back()

> **back**(`length`): `void`

#### Parameters

• **length**: `number`

#### Returns

`void`

#### Source

common/io/IOWriterSync.ts:335

***

### encodeString()

> **encodeString**(`str`): `Uint8Array`

#### Parameters

• **str**: `string`

#### Returns

`Uint8Array`

#### Source

common/io/IOWriterSync.ts:270

***

### flush()

> **flush**(): `void`

#### Returns

`void`

#### Source

common/io/IOWriterSync.ts:274

***

### flushToPos()

> **flushToPos**(`pos`): `void`

#### Parameters

• **pos**: `bigint`

#### Returns

`void`

#### Source

common/io/IOWriterSync.ts:290

***

### getBuffer()

> **getBuffer**(): `Uint8Array`

#### Returns

`Uint8Array`

#### Source

common/io/IOWriterSync.ts:341

***

### getBufferSize()

> **getBufferSize**(): `number`

#### Returns

`number`

#### Source

common/io/IOWriterSync.ts:355

***

### getPointer()

> **getPointer**(): `number`

获取当前写指针

#### Returns

`number`

#### Source

common/io/IOWriterSync.ts:211

***

### getPos()

> **getPos**(): `bigint`

#### Returns

`bigint`

#### Source

common/io/IOWriterSync.ts:215

***

### remainingLength()

> **remainingLength**(): `number`

获取剩余可写节数

#### Returns

`number`

#### Source

common/io/IOWriterSync.ts:224

***

### reset()

> **reset**(): `void`

#### Returns

`void`

#### Source

common/io/IOWriterSync.ts:349

***

### seek()

> **seek**(`pos`): `void`

#### Parameters

• **pos**: `bigint`

#### Returns

`void`

#### Source

common/io/IOWriterSync.ts:305

***

### seekInline()

> **seekInline**(`pos`): `void`

#### Parameters

• **pos**: `number`

#### Returns

`void`

#### Source

common/io/IOWriterSync.ts:323

***

### setEndian()

> **setEndian**(`bigEndian`): `void`

#### Parameters

• **bigEndian**: `boolean`

#### Returns

`void`

#### Source

common/io/IOWriterSync.ts:345

***

### skip()

> **skip**(`length`): `void`

#### Parameters

• **length**: `number`

#### Returns

`void`

#### Source

common/io/IOWriterSync.ts:329

***

### writeBuffer()

> **writeBuffer**(`buffer`): `void`

写指定长度的二进制 buffer 数据

#### Parameters

• **buffer**: `Uint8ArrayInterface`

#### Returns

`void`

#### Source

common/io/IOWriterSync.ts:234

***

### writeDouble()

> **writeDouble**(`value`): `void`

写双精度浮点数

#### Parameters

• **value**: `number`

#### Returns

`void`

#### Source

common/io/IOWriterSync.ts:197

***

### writeFloat()

> **writeFloat**(`value`): `void`

写单精度浮点数

#### Parameters

• **value**: `number`

#### Returns

`void`

#### Source

common/io/IOWriterSync.ts:185

***

### writeInt16()

> **writeInt16**(`value`): `void`

写 16 位有符号整数

#### Parameters

• **value**: `number`

#### Returns

`void`

#### Source

common/io/IOWriterSync.ts:147

***

### writeInt32()

> **writeInt32**(`value`): `void`

写 32 位有符号整数

#### Parameters

• **value**: `number`

#### Returns

`void`

#### Source

common/io/IOWriterSync.ts:159

***

### writeInt64()

> **writeInt64**(`value`): `void`

写 64 位有符号整数

#### Parameters

• **value**: `bigint`

#### Returns

`void`

#### Source

common/io/IOWriterSync.ts:171

***

### writeInt8()

> **writeInt8**(`value`): `void`

写 8 位有符号整数

#### Parameters

• **value**: `number`

#### Returns

`void`

#### Source

common/io/IOWriterSync.ts:135

***

### writeString()

> **writeString**(`str`): `number`

写一个字符串

#### Parameters

• **str**: `string`

#### Returns

`number`

#### Source

common/io/IOWriterSync.ts:264

***

### writeUint16()

> **writeUint16**(`value`): `void`

读取 16 位无符号整数

#### Parameters

• **value**: `number`

#### Returns

`void`

#### Source

common/io/IOWriterSync.ts:75

***

### writeUint24()

> **writeUint24**(`value`): `void`

写 24 位无符号整数

#### Parameters

• **value**: `number`

#### Returns

`void`

#### Source

common/io/IOWriterSync.ts:87

***

### writeUint32()

> **writeUint32**(`value`): `void`

写 32 位无符号整数

#### Parameters

• **value**: `number`

#### Returns

`void`

#### Source

common/io/IOWriterSync.ts:109

***

### writeUint64()

> **writeUint64**(`value`): `void`

写 64 位无符号整数

#### Parameters

• **value**: `bigint`

#### Returns

`void`

#### Source

common/io/IOWriterSync.ts:121

***

### writeUint8()

> **writeUint8**(`value`): `void`

写 8 位无符号整数

#### Parameters

• **value**: `number`

#### Returns

`void`

#### Implementation of

`BytesWriterSync.writeUint8`

#### Source

common/io/IOWriterSync.ts:63
