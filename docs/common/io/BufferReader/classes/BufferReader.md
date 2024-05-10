[**libmedia**](../../../../README.md) • **Docs**

***

[libmedia](../../../../README.md) / [common/io/BufferReader](../README.md) / BufferReader

# Class: BufferReader

## Implements

- `BytesReaderSync`

## Constructors

### new BufferReader()

> **new BufferReader**(`data`, `bigEndian`): [`BufferReader`](BufferReader.md)

#### Parameters

• **data**: `Uint8ArrayInterface`

待读取的字节

• **bigEndian**: `boolean`= `true`

是否按大端字节序读取，默认大端字节序（网络字节序）

#### Returns

[`BufferReader`](BufferReader.md)

#### Source

common/io/BufferReader.ts:27

## Methods

### appendBuffer()

> **appendBuffer**(`buffer`): `void`

追加 buffer

#### Parameters

• **buffer**: `Uint8ArrayInterface`

#### Returns

`void`

#### Source

common/io/BufferReader.ts:296

***

### back()

> **back**(`length`): `void`

返回指定字节长度

#### Parameters

• **length**: `number`

#### Returns

`void`

#### Source

common/io/BufferReader.ts:265

***

### getPos()

> **getPos**(): `bigint`

获取当前读取指针

#### Returns

`bigint`

#### Implementation of

`BytesReaderSync.getPos`

#### Source

common/io/BufferReader.ts:235

***

### readBuffer()

> **readBuffer**(`length`): `Uint8Array`

读取指定长度的二进制 buffer 数据

#### Parameters

• **length**: `number`

#### Returns

`Uint8Array`

#### Source

common/io/BufferReader.ts:284

***

### readDouble()

> **readDouble**(): `number`

读取双精度浮点数

#### Returns

`number`

#### Source

common/io/BufferReader.ts:158

***

### readFloat()

> **readFloat**(): `number`

读取单精度浮点数

#### Returns

`number`

#### Source

common/io/BufferReader.ts:147

***

### readHex()

> **readHex**(`length`): `string`

读取指定长度的字节，并以 16 进制字符串返回

#### Parameters

• **length**: `number`= `1`

默认 1

#### Returns

`string`

#### Source

common/io/BufferReader.ts:170

***

### readInt16()

> **readInt16**(): `number`

读取 16 位有符号整数

#### Returns

`number`

#### Source

common/io/BufferReader.ts:109

***

### readInt32()

> **readInt32**(): `number`

读取 32 位有符号整数

#### Returns

`number`

#### Source

common/io/BufferReader.ts:120

***

### readInt64()

> **readInt64**(): `bigint`

读取 64 位有符号整数

#### Returns

`bigint`

#### Source

common/io/BufferReader.ts:131

***

### readInt8()

> **readInt8**(): `number`

读取 8 位有符号整数

#### Returns

`number`

#### Source

common/io/BufferReader.ts:100

***

### readLine()

> **readLine**(): `string`

读取一行字符

#### Returns

`string`

#### Source

common/io/BufferReader.ts:207

***

### readString()

> **readString**(`length`): `string`

读取指定长度的字符串

#### Parameters

• **length**: `number`= `1`

默认 1

#### Returns

`string`

#### Source

common/io/BufferReader.ts:185

***

### readUint16()

> **readUint16**(): `number`

读取 16 位无符号整数

#### Returns

`number`

#### Source

common/io/BufferReader.ts:51

***

### readUint24()

> **readUint24**(): `number`

读取 24 位无符号整数

#### Returns

`number`

#### Source

common/io/BufferReader.ts:62

***

### readUint32()

> **readUint32**(): `number`

读取 32 位无符号整数

#### Returns

`number`

#### Source

common/io/BufferReader.ts:73

***

### readUint64()

> **readUint64**(): `bigint`

读取 64 位无符号整数

#### Returns

`bigint`

#### Source

common/io/BufferReader.ts:84

***

### readUint8()

> **readUint8**(): `number`

读取 8 位无符号整数

#### Returns

`number`

#### Implementation of

`BytesReaderSync.readUint8`

#### Source

common/io/BufferReader.ts:42

***

### remainingSize()

> **remainingSize**(): `number`

获取剩余可读字节数

#### Returns

`number`

#### Source

common/io/BufferReader.ts:274

***

### resetBuffer()

> **resetBuffer**(`data`, `bigEndian`): `void`

#### Parameters

• **data**: `Uint8ArrayInterface`

• **bigEndian**: `boolean`= `true`

#### Returns

`void`

#### Source

common/io/BufferReader.ts:306

***

### seek()

> **seek**(`pos`): `void`

seek 读取指针

#### Parameters

• **pos**: `number`

#### Returns

`void`

#### Source

common/io/BufferReader.ts:244

***

### skip()

> **skip**(`length`): `void`

跳过指定字节长度

#### Parameters

• **length**: `number`

#### Returns

`void`

#### Source

common/io/BufferReader.ts:256
