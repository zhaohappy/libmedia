[**libmedia**](../../../../README.md) • **Docs**

***

[libmedia](../../../../README.md) / [common/io/IOReader](../README.md) / IOReader

# Class: IOReader

## Implements

- `BytesReader`

## Constructors

### new IOReader()

> **new IOReader**(`size`, `bigEndian`, `map`?): [`IOReader`](IOReader.md)

#### Parameters

• **size**: `number`= `undefined`

• **bigEndian**: `boolean`= `true`

是否按大端字节序读取，默认大端字节序（网络字节序）

• **map?**: `Uint8ArrayInterface`

#### Returns

[`IOReader`](IOReader.md)

#### Source

common/io/IOReader.ts:44

## Properties

### error

> **error**: `number`

#### Source

common/io/IOReader.ts:30

***

### flags

> **flags**: `number`

#### Source

common/io/IOReader.ts:38

***

### onFlush()

> **onFlush**: (`buffer`) => `number` \| `Promise`\<`number`\>

#### Parameters

• **buffer**: `Uint8Array`

#### Returns

`number` \| `Promise`\<`number`\>

#### Source

common/io/IOReader.ts:32

***

### onSeek()

> **onSeek**: (`seek`) => `number` \| `Promise`\<`number`\>

#### Parameters

• **seek**: `bigint`

#### Returns

`number` \| `Promise`\<`number`\>

#### Source

common/io/IOReader.ts:34

***

### onSize()

> **onSize**: () => `bigint` \| `Promise`\<`bigint`\>

#### Returns

`bigint` \| `Promise`\<`bigint`\>

#### Source

common/io/IOReader.ts:36

## Methods

### appendBuffer()

> **appendBuffer**(`buffer`): `void`

#### Parameters

• **buffer**: `Uint8Array`

#### Returns

`void`

#### Source

common/io/IOReader.ts:635

***

### fileSize()

> **fileSize**(): `Promise`\<`bigint`\>

#### Returns

`Promise`\<`bigint`\>

#### Source

common/io/IOReader.ts:669

***

### flush()

> **flush**(`need`): `Promise`\<`void`\>

#### Parameters

• **need**: `number`= `0`

#### Returns

`Promise`\<`void`\>

#### Source

common/io/IOReader.ts:550

***

### getBuffer()

> **getBuffer**(): `Uint8ArrayInterface`

#### Returns

`Uint8ArrayInterface`

#### Source

common/io/IOReader.ts:631

***

### getBufferSize()

> **getBufferSize**(): `number`

#### Returns

`number`

#### Source

common/io/IOReader.ts:681

***

### getPointer()

> **getPointer**(): `number`

获取当前读取指针

#### Returns

`number`

#### Source

common/io/IOReader.ts:496

***

### getPos()

> **getPos**(): `bigint`

获取已读字节偏移

#### Returns

`bigint`

#### Implementation of

`BytesReader.getPos`

#### Source

common/io/IOReader.ts:505

***

### peekBuffer()

#### peekBuffer(length)

> **peekBuffer**(`length`): `Promise`\<`Uint8Array`\>

##### Parameters

• **length**: `number`

##### Returns

`Promise`\<`Uint8Array`\>

##### Source

common/io/IOReader.ts:394

#### peekBuffer(length, buffer)

> **peekBuffer**\<`T`\>(`length`, `buffer`): `Promise`\<`T`\>

##### Type parameters

• **T** *extends* `Uint8ArrayInterface`

##### Parameters

• **length**: `number`

• **buffer**: `T`

##### Returns

`Promise`\<`T`\>

##### Source

common/io/IOReader.ts:395

***

### peekDouble()

> **peekDouble**(): `Promise`\<`number`\>

#### Returns

`Promise`\<`number`\>

#### Source

common/io/IOReader.ts:299

***

### peekFloat()

> **peekFloat**(): `Promise`\<`number`\>

#### Returns

`Promise`\<`number`\>

#### Source

common/io/IOReader.ts:278

***

### peekHex()

> **peekHex**(`length`): `Promise`\<`string`\>

#### Parameters

• **length**: `number`= `1`

#### Returns

`Promise`\<`string`\>

#### Source

common/io/IOReader.ts:320

***

### peekInt16()

> **peekInt16**(): `Promise`\<`number`\>

#### Returns

`Promise`\<`number`\>

#### Source

common/io/IOReader.ts:214

***

### peekInt32()

> **peekInt32**(): `Promise`\<`number`\>

#### Returns

`Promise`\<`number`\>

#### Source

common/io/IOReader.ts:235

***

### peekInt64()

> **peekInt64**(): `Promise`\<`bigint`\>

#### Returns

`Promise`\<`bigint`\>

#### Source

common/io/IOReader.ts:257

***

### peekInt8()

> **peekInt8**(): `Promise`\<`number`\>

#### Returns

`Promise`\<`number`\>

#### Source

common/io/IOReader.ts:193

***

### peekLine()

> **peekLine**(): `Promise`\<`string`\>

#### Returns

`Promise`\<`string`\>

#### Source

common/io/IOReader.ts:468

***

### peekString()

> **peekString**(`length`): `Promise`\<`string`\>

#### Parameters

• **length**: `number`= `1`

#### Returns

`Promise`\<`string`\>

#### Source

common/io/IOReader.ts:426

***

### peekUint16()

> **peekUint16**(): `Promise`\<`number`\>

#### Returns

`Promise`\<`number`\>

#### Source

common/io/IOReader.ts:100

***

### peekUint24()

> **peekUint24**(): `Promise`\<`number`\>

#### Returns

`Promise`\<`number`\>

#### Source

common/io/IOReader.ts:120

***

### peekUint32()

> **peekUint32**(): `Promise`\<`number`\>

#### Returns

`Promise`\<`number`\>

#### Source

common/io/IOReader.ts:151

***

### peekUint64()

> **peekUint64**(): `Promise`\<`bigint`\>

#### Returns

`Promise`\<`bigint`\>

#### Source

common/io/IOReader.ts:172

***

### peekUint8()

> **peekUint8**(): `Promise`\<`number`\>

#### Returns

`Promise`\<`number`\>

#### Source

common/io/IOReader.ts:79

***

### pipe()

> **pipe**(`ioWriter`, `length`?): `Promise`\<`void`\>

#### Parameters

• **ioWriter**: [`IOWriter`](../../IOWriter/classes/IOWriter.md)

• **length?**: `number`

#### Returns

`Promise`\<`void`\>

#### Source

common/io/IOReader.ts:685

***

### readBuffer()

#### readBuffer(length)

> **readBuffer**(`length`): `Promise`\<`Uint8Array`\>

读取指定长度的二进制 buffer 数据

##### Parameters

• **length**: `number`

##### Returns

`Promise`\<`Uint8Array`\>

##### Source

common/io/IOReader.ts:352

#### readBuffer(length, buffer)

> **readBuffer**\<`T`\>(`length`, `buffer`): `Promise`\<`T`\>

##### Type parameters

• **T** *extends* `Uint8ArrayInterface`

##### Parameters

• **length**: `number`

• **buffer**: `T`

##### Returns

`Promise`\<`T`\>

##### Source

common/io/IOReader.ts:353

***

### readDouble()

> **readDouble**(): `Promise`\<`number`\>

读取双精度浮点数

#### Returns

`Promise`\<`number`\>

#### Source

common/io/IOReader.ts:290

***

### readFloat()

> **readFloat**(): `Promise`\<`number`\>

读取单精度浮点数

#### Returns

`Promise`\<`number`\>

#### Source

common/io/IOReader.ts:269

***

### readHex()

> **readHex**(`length`): `Promise`\<`string`\>

读取指定长度的字节，并以 16 进制字符串返回

#### Parameters

• **length**: `number`= `1`

默认 1

#### Returns

`Promise`\<`string`\>

#### Source

common/io/IOReader.ts:312

***

### readInt16()

> **readInt16**(): `Promise`\<`number`\>

读取 16 位有符号整数

#### Returns

`Promise`\<`number`\>

#### Source

common/io/IOReader.ts:205

***

### readInt32()

> **readInt32**(): `Promise`\<`number`\>

读取 32 位有符号整数

#### Returns

`Promise`\<`number`\>

#### Source

common/io/IOReader.ts:226

***

### readInt64()

> **readInt64**(): `Promise`\<`bigint`\>

读取 64 位有符号整数

#### Returns

`Promise`\<`bigint`\>

#### Source

common/io/IOReader.ts:247

***

### readInt8()

> **readInt8**(): `Promise`\<`number`\>

读取 8 位有符号整数

#### Returns

`Promise`\<`number`\>

#### Source

common/io/IOReader.ts:184

***

### readLine()

> **readLine**(): `Promise`\<`string`\>

读取一行字符

#### Returns

`Promise`\<`string`\>

#### Source

common/io/IOReader.ts:434

***

### readString()

> **readString**(`length`): `Promise`\<`string`\>

读取指定长度的字符串

#### Parameters

• **length**: `number`= `1`

默认 1

#### Returns

`Promise`\<`string`\>

#### Source

common/io/IOReader.ts:422

***

### readUint16()

> **readUint16**(): `Promise`\<`number`\>

读取 16 位无符号整数

#### Returns

`Promise`\<`number`\>

#### Source

common/io/IOReader.ts:91

***

### readUint24()

> **readUint24**(): `Promise`\<`number`\>

读取 24 位无符号整数

#### Returns

`Promise`\<`number`\>

#### Source

common/io/IOReader.ts:112

***

### readUint32()

> **readUint32**(): `Promise`\<`number`\>

读取 32 位无符号整数

#### Returns

`Promise`\<`number`\>

#### Source

common/io/IOReader.ts:142

***

### readUint64()

> **readUint64**(): `Promise`\<`bigint`\>

读取 64 位无符号整数

#### Returns

`Promise`\<`bigint`\>

#### Source

common/io/IOReader.ts:163

***

### readUint8()

> **readUint8**(): `Promise`\<`number`\>

读取 8 位无符号整数

#### Returns

`Promise`\<`number`\>

#### Implementation of

`BytesReader.readUint8`

#### Source

common/io/IOReader.ts:70

***

### remainingLength()

> **remainingLength**(): `number`

获取剩余可读字节数

#### Returns

`number`

#### Source

common/io/IOReader.ts:536

***

### reset()

> **reset**(): `void`

#### Returns

`void`

#### Source

common/io/IOReader.ts:659

***

### seek()

> **seek**(`pos`, `force`, `flush`): `Promise`\<`void`\>

#### Parameters

• **pos**: `bigint`

• **force**: `boolean`= `false`

• **flush**: `boolean`= `true`

#### Returns

`Promise`\<`void`\>

#### Source

common/io/IOReader.ts:593

***

### setEndian()

> **setEndian**(`bigEndian`): `void`

#### Parameters

• **bigEndian**: `boolean`

#### Returns

`void`

#### Source

common/io/IOReader.ts:665

***

### skip()

> **skip**(`length`): `Promise`\<`void`\>

跳过指定字节长度

#### Parameters

• **length**: `number`

#### Returns

`Promise`\<`void`\>

#### Source

common/io/IOReader.ts:514
