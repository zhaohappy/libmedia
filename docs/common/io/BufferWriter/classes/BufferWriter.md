[**libmedia**](../../../../README.md) • **Docs**

***

[libmedia](../../../../README.md) / [common/io/BufferWriter](../README.md) / BufferWriter

# Class: BufferWriter

## Implements

- `BytesWriterSync`

## Constructors

### new BufferWriter()

> **new BufferWriter**(`data`, `bigEndian`): [`BufferWriter`](BufferWriter.md)

#### Parameters

• **data**: `Uint8ArrayInterface`

待写的 Uint8Array

• **bigEndian**: `boolean`= `true`

是否按大端字节序写，默认大端字节序（网络字节序）

#### Returns

[`BufferWriter`](BufferWriter.md)

#### Source

common/io/BufferWriter.ts:27

## Methods

### back()

> **back**(`length`): `void`

返回指定字节长度

#### Parameters

• **length**: `number`

#### Returns

`void`

#### Source

common/io/BufferWriter.ts:188

***

### getPos()

> **getPos**(): `number`

获取当前写指针

#### Returns

`number`

#### Source

common/io/BufferWriter.ts:158

***

### getWroteBuffer()

> **getWroteBuffer**(): `Uint8Array`

#### Returns

`Uint8Array`

#### Source

common/io/BufferWriter.ts:226

***

### remainingSize()

> **remainingSize**(): `number`

获取剩余可写节数

#### Returns

`number`

#### Source

common/io/BufferWriter.ts:197

***

### resetBuffer()

> **resetBuffer**(`data`, `bigEndian`): `void`

#### Parameters

• **data**: `Uint8ArrayInterface`

• **bigEndian**: `boolean`= `true`

#### Returns

`void`

#### Source

common/io/BufferWriter.ts:230

***

### seek()

> **seek**(`pos`): `void`

seek 写指针

#### Parameters

• **pos**: `number`

#### Returns

`void`

#### Source

common/io/BufferWriter.ts:167

***

### skip()

> **skip**(`length`): `void`

跳过指定字节长度

#### Parameters

• **length**: `number`

#### Returns

`void`

#### Source

common/io/BufferWriter.ts:179

***

### writeBuffer()

> **writeBuffer**(`buffer`): `void`

写指定长度的二进制 buffer 数据

#### Parameters

• **buffer**: `Uint8ArrayInterface`

#### Returns

`void`

#### Source

common/io/BufferWriter.ts:207

***

### writeDouble()

> **writeDouble**(`value`): `void`

写双精度浮点数

#### Parameters

• **value**: `number`

#### Returns

`void`

#### Source

common/io/BufferWriter.ts:148

***

### writeFloat()

> **writeFloat**(`value`): `void`

写单精度浮点数

#### Parameters

• **value**: `number`

#### Returns

`void`

#### Source

common/io/BufferWriter.ts:140

***

### writeInt16()

> **writeInt16**(`value`): `void`

写 16 位有符号整数

#### Parameters

• **value**: `number`

#### Returns

`void`

#### Source

common/io/BufferWriter.ts:106

***

### writeInt32()

> **writeInt32**(`value`): `void`

写 32 位有符号整数

#### Parameters

• **value**: `number`

#### Returns

`void`

#### Source

common/io/BufferWriter.ts:114

***

### writeInt64()

> **writeInt64**(`value`): `void`

写 64 位有符号整数

#### Parameters

• **value**: `bigint`

#### Returns

`void`

#### Source

common/io/BufferWriter.ts:122

***

### writeInt8()

> **writeInt8**(`value`): `void`

写 8 位有符号整数

#### Parameters

• **value**: `number`

#### Returns

`void`

#### Source

common/io/BufferWriter.ts:99

***

### writeString()

> **writeString**(`str`): `number`

写一个字符串

#### Parameters

• **str**: `string`

#### Returns

`number`

#### Source

common/io/BufferWriter.ts:220

***

### writeUint16()

> **writeUint16**(`value`): `void`

读取 16 位无符号整数

#### Parameters

• **value**: `number`

#### Returns

`void`

#### Source

common/io/BufferWriter.ts:46

***

### writeUint24()

> **writeUint24**(`value`): `void`

写 24 位无符号整数

#### Parameters

• **value**: `number`

#### Returns

`void`

#### Source

common/io/BufferWriter.ts:54

***

### writeUint32()

> **writeUint32**(`value`): `void`

写 32 位无符号整数

#### Parameters

• **value**: `number`

#### Returns

`void`

#### Source

common/io/BufferWriter.ts:73

***

### writeUint64()

> **writeUint64**(`value`): `void`

写 64 位无符号整数

#### Parameters

• **value**: `bigint`

#### Returns

`void`

#### Source

common/io/BufferWriter.ts:81

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

common/io/BufferWriter.ts:39
