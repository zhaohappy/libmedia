[**libmedia**](../../../../README.md) • **Docs**

***

[libmedia](../../../../README.md) / [common/io/IOWriter](../README.md) / IOWriter

# Class: IOWriter

## Implements

- `BytesWriter`

## Constructors

### new IOWriter()

> **new IOWriter**(`size`, `bigEndian`, `map`?): [`IOWriter`](IOWriter.md)

#### Parameters

• **size**: `number`= `undefined`

• **bigEndian**: `boolean`= `true`

是否按大端字节序写，默认大端字节序（网络字节序）

• **map?**: `Uint8ArrayInterface`

#### Returns

[`IOWriter`](IOWriter.md)

#### Source

common/io/IOWriter.ts:32

## Properties

### error

> **error**: `number`

#### Source

common/io/IOWriter.ts:23

***

### onFlush()

> **onFlush**: (`data`, `pos`?) => `Promise`\<`number`\>

#### Parameters

• **data**: `Uint8Array`

• **pos?**: `bigint`

#### Returns

`Promise`\<`number`\>

#### Source

common/io/IOWriter.ts:25

***

### onSeek()

> **onSeek**: (`seek`) => `Promise`\<`number`\>

#### Parameters

• **seek**: `bigint`

#### Returns

`Promise`\<`number`\>

#### Source

common/io/IOWriter.ts:26

## Methods

### back()

> **back**(`length`): `void`

#### Parameters

• **length**: `number`

#### Returns

`void`

#### Source

common/io/IOWriter.ts:324

***

### encodeString()

> **encodeString**(`str`): `Uint8Array`

#### Parameters

• **str**: `string`

#### Returns

`Uint8Array`

#### Source

common/io/IOWriter.ts:259

***

### flush()

> **flush**(): `Promise`\<`void`\>

#### Returns

`Promise`\<`void`\>

#### Source

common/io/IOWriter.ts:263

***

### flushToPos()

> **flushToPos**(`pos`): `Promise`\<`void`\>

#### Parameters

• **pos**: `bigint`

#### Returns

`Promise`\<`void`\>

#### Source

common/io/IOWriter.ts:279

***

### getBuffer()

> **getBuffer**(): `Uint8Array`

#### Returns

`Uint8Array`

#### Source

common/io/IOWriter.ts:330

***

### getBufferSize()

> **getBufferSize**(): `number`

#### Returns

`number`

#### Source

common/io/IOWriter.ts:344

***

### getPointer()

> **getPointer**(): `number`

获取当前写指针

#### Returns

`number`

#### Source

common/io/IOWriter.ts:200

***

### getPos()

> **getPos**(): `bigint`

#### Returns

`bigint`

#### Source

common/io/IOWriter.ts:204

***

### remainingLength()

> **remainingLength**(): `number`

获取剩余可写节数

#### Returns

`number`

#### Source

common/io/IOWriter.ts:213

***

### reset()

> **reset**(): `void`

#### Returns

`void`

#### Source

common/io/IOWriter.ts:338

***

### seek()

> **seek**(`pos`): `Promise`\<`void`\>

#### Parameters

• **pos**: `bigint`

#### Returns

`Promise`\<`void`\>

#### Source

common/io/IOWriter.ts:294

***

### seekInline()

> **seekInline**(`pos`): `void`

#### Parameters

• **pos**: `number`

#### Returns

`void`

#### Source

common/io/IOWriter.ts:312

***

### setEndian()

> **setEndian**(`bigEndian`): `void`

#### Parameters

• **bigEndian**: `boolean`

#### Returns

`void`

#### Source

common/io/IOWriter.ts:334

***

### skip()

> **skip**(`length`): `void`

#### Parameters

• **length**: `number`

#### Returns

`void`

#### Source

common/io/IOWriter.ts:318

***

### writeBuffer()

> **writeBuffer**(`buffer`): `Promise`\<`void`\>

写指定长度的二进制 buffer 数据

#### Parameters

• **buffer**: `Uint8ArrayInterface`

#### Returns

`Promise`\<`void`\>

#### Source

common/io/IOWriter.ts:223

***

### writeDouble()

> **writeDouble**(`value`): `Promise`\<`void`\>

写双精度浮点数

#### Parameters

• **value**: `number`

#### Returns

`Promise`\<`void`\>

#### Source

common/io/IOWriter.ts:186

***

### writeFloat()

> **writeFloat**(`value`): `Promise`\<`void`\>

写单精度浮点数

#### Parameters

• **value**: `number`

#### Returns

`Promise`\<`void`\>

#### Source

common/io/IOWriter.ts:174

***

### writeInt16()

> **writeInt16**(`value`): `Promise`\<`void`\>

写 16 位有符号整数

#### Parameters

• **value**: `number`

#### Returns

`Promise`\<`void`\>

#### Source

common/io/IOWriter.ts:136

***

### writeInt32()

> **writeInt32**(`value`): `Promise`\<`void`\>

写 32 位有符号整数

#### Parameters

• **value**: `number`

#### Returns

`Promise`\<`void`\>

#### Source

common/io/IOWriter.ts:148

***

### writeInt64()

> **writeInt64**(`value`): `Promise`\<`void`\>

写 64 位有符号整数

#### Parameters

• **value**: `bigint`

#### Returns

`Promise`\<`void`\>

#### Source

common/io/IOWriter.ts:160

***

### writeInt8()

> **writeInt8**(`value`): `Promise`\<`void`\>

写 8 位有符号整数

#### Parameters

• **value**: `number`

#### Returns

`Promise`\<`void`\>

#### Source

common/io/IOWriter.ts:124

***

### writeString()

> **writeString**(`str`): `Promise`\<`number`\>

写一个字符串

#### Parameters

• **str**: `string`

#### Returns

`Promise`\<`number`\>

#### Source

common/io/IOWriter.ts:253

***

### writeUint16()

> **writeUint16**(`value`): `Promise`\<`void`\>

读取 16 位无符号整数

#### Parameters

• **value**: `number`

#### Returns

`Promise`\<`void`\>

#### Source

common/io/IOWriter.ts:64

***

### writeUint24()

> **writeUint24**(`value`): `Promise`\<`void`\>

写 24 位无符号整数

#### Parameters

• **value**: `number`

#### Returns

`Promise`\<`void`\>

#### Source

common/io/IOWriter.ts:76

***

### writeUint32()

> **writeUint32**(`value`): `Promise`\<`void`\>

写 32 位无符号整数

#### Parameters

• **value**: `number`

#### Returns

`Promise`\<`void`\>

#### Source

common/io/IOWriter.ts:98

***

### writeUint64()

> **writeUint64**(`value`): `Promise`\<`void`\>

写 64 位无符号整数

#### Parameters

• **value**: `bigint`

#### Returns

`Promise`\<`void`\>

#### Source

common/io/IOWriter.ts:110

***

### writeUint8()

> **writeUint8**(`value`): `Promise`\<`void`\>

写 8 位无符号整数

#### Parameters

• **value**: `number`

#### Returns

`Promise`\<`void`\>

#### Implementation of

`BytesWriter.writeUint8`

#### Source

common/io/IOWriter.ts:52
