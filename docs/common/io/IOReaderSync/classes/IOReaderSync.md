[**libmedia**](../../../../README.md) • **Docs**

***

[libmedia](../../../../README.md) / [common/io/IOReaderSync](../README.md) / IOReaderSync

# Class: IOReaderSync

## Implements

- `BytesReaderSync`

## Constructors

### new IOReaderSync()

> **new IOReaderSync**(`size`, `bigEndian`, `map`?): [`IOReaderSync`](IOReaderSync.md)

#### Parameters

• **size**: `number`= `undefined`

• **bigEndian**: `boolean`= `true`

是否按大端字节序读取，默认大端字节序（网络字节序）

• **map?**: `Uint8ArrayInterface`

#### Returns

[`IOReaderSync`](IOReaderSync.md)

#### Source

common/io/IOReaderSync.ts:43

## Properties

### error

> **error**: `number`

#### Source

common/io/IOReaderSync.ts:29

***

### flags

> **flags**: `number`

#### Source

common/io/IOReaderSync.ts:37

***

### onFlush()

> **onFlush**: (`buffer`) => `number`

#### Parameters

• **buffer**: `Uint8Array`

#### Returns

`number`

#### Source

common/io/IOReaderSync.ts:31

***

### onSeek()

> **onSeek**: (`seek`) => `number`

#### Parameters

• **seek**: `bigint`

#### Returns

`number`

#### Source

common/io/IOReaderSync.ts:33

***

### onSize()

> **onSize**: () => `bigint`

#### Returns

`bigint`

#### Source

common/io/IOReaderSync.ts:35

## Methods

### appendBuffer()

> **appendBuffer**(`buffer`): `void`

#### Parameters

• **buffer**: `Uint8ArrayInterface`

#### Returns

`void`

#### Source

common/io/IOReaderSync.ts:641

***

### fileSize()

> **fileSize**(): `bigint`

#### Returns

`bigint`

#### Source

common/io/IOReaderSync.ts:675

***

### flush()

> **flush**(`need`): `void`

#### Parameters

• **need**: `number`= `0`

#### Returns

`void`

#### Source

common/io/IOReaderSync.ts:556

***

### getBuffer()

> **getBuffer**(): `Uint8ArrayInterface`

#### Returns

`Uint8ArrayInterface`

#### Source

common/io/IOReaderSync.ts:637

***

### getBufferSize()

> **getBufferSize**(): `number`

#### Returns

`number`

#### Source

common/io/IOReaderSync.ts:687

***

### getPointer()

> **getPointer**(): `number`

获取当前读取指针

#### Returns

`number`

#### Source

common/io/IOReaderSync.ts:512

***

### getPos()

> **getPos**(): `bigint`

获取已读字节偏移

#### Returns

`bigint`

#### Implementation of

`BytesReaderSync.getPos`

#### Source

common/io/IOReaderSync.ts:521

***

### peekBuffer()

#### peekBuffer(length)

> **peekBuffer**(`length`): `Uint8Array`

##### Parameters

• **length**: `number`

##### Returns

`Uint8Array`

##### Source

common/io/IOReaderSync.ts:405

#### peekBuffer(length, buffer)

> **peekBuffer**\<`T`\>(`length`, `buffer`): `T`

##### Type parameters

• **T** *extends* `Uint8ArrayInterface`

##### Parameters

• **length**: `number`

• **buffer**: `T`

##### Returns

`T`

##### Source

common/io/IOReaderSync.ts:406

***

### peekDouble()

> **peekDouble**(): `number`

#### Returns

`number`

#### Source

common/io/IOReaderSync.ts:305

***

### peekFloat()

> **peekFloat**(): `number`

#### Returns

`number`

#### Source

common/io/IOReaderSync.ts:283

***

### peekHex()

> **peekHex**(`length`): `string`

#### Parameters

• **length**: `number`= `1`

#### Returns

`string`

#### Source

common/io/IOReaderSync.ts:327

***

### peekInt16()

> **peekInt16**(): `number`

#### Returns

`number`

#### Source

common/io/IOReaderSync.ts:217

***

### peekInt32()

> **peekInt32**(): `number`

#### Returns

`number`

#### Source

common/io/IOReaderSync.ts:239

***

### peekInt64()

> **peekInt64**(): `bigint`

#### Returns

`bigint`

#### Source

common/io/IOReaderSync.ts:261

***

### peekInt8()

> **peekInt8**(): `number`

#### Returns

`number`

#### Source

common/io/IOReaderSync.ts:195

***

### peekLine()

> **peekLine**(): `string`

#### Returns

`string`

#### Source

common/io/IOReaderSync.ts:484

***

### peekString()

> **peekString**(`length`): `string`

#### Parameters

• **length**: `number`= `1`

#### Returns

`string`

#### Source

common/io/IOReaderSync.ts:441

***

### peekUint16()

> **peekUint16**(): `number`

#### Returns

`number`

#### Source

common/io/IOReaderSync.ts:101

***

### peekUint24()

> **peekUint24**(): `number`

#### Returns

`number`

#### Source

common/io/IOReaderSync.ts:119

***

### peekUint32()

> **peekUint32**(): `number`

#### Returns

`number`

#### Source

common/io/IOReaderSync.ts:151

***

### peekUint64()

> **peekUint64**(): `bigint`

#### Returns

`bigint`

#### Source

common/io/IOReaderSync.ts:173

***

### peekUint8()

> **peekUint8**(): `number`

#### Returns

`number`

#### Source

common/io/IOReaderSync.ts:79

***

### pipe()

> **pipe**(`ioWriter`, `length`?): `void`

#### Parameters

• **ioWriter**: [`IOWriterSync`](../../IOWriterSync/classes/IOWriterSync.md)

• **length?**: `number`

#### Returns

`void`

#### Source

common/io/IOReaderSync.ts:691

***

### readBuffer()

#### readBuffer(length)

> **readBuffer**(`length`): `Uint8Array`

读取指定长度的二进制 buffer 数据

##### Parameters

• **length**: `number`

##### Returns

`Uint8Array`

##### Source

common/io/IOReaderSync.ts:359

#### readBuffer(length, buffer)

> **readBuffer**\<`T`\>(`length`, `buffer`): `T`

##### Type parameters

• **T** *extends* `Uint8ArrayInterface`

##### Parameters

• **length**: `number`

• **buffer**: `T`

##### Returns

`T`

##### Source

common/io/IOReaderSync.ts:360

***

### readDouble()

> **readDouble**(): `number`

读取双精度浮点数

#### Returns

`number`

#### Source

common/io/IOReaderSync.ts:295

***

### readFloat()

> **readFloat**(): `number`

读取单精度浮点数

#### Returns

`number`

#### Source

common/io/IOReaderSync.ts:273

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

common/io/IOReaderSync.ts:318

***

### readInt16()

> **readInt16**(): `number`

读取 16 位有符号整数

#### Returns

`number`

#### Source

common/io/IOReaderSync.ts:207

***

### readInt32()

> **readInt32**(): `number`

读取 32 位有符号整数

#### Returns

`number`

#### Source

common/io/IOReaderSync.ts:229

***

### readInt64()

> **readInt64**(): `bigint`

读取 64 位有符号整数

#### Returns

`bigint`

#### Source

common/io/IOReaderSync.ts:251

***

### readInt8()

> **readInt8**(): `number`

读取 8 位有符号整数

#### Returns

`number`

#### Source

common/io/IOReaderSync.ts:185

***

### readLine()

> **readLine**(): `string`

读取一行字符

#### Returns

`string`

#### Source

common/io/IOReaderSync.ts:449

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

common/io/IOReaderSync.ts:437

***

### readUint16()

> **readUint16**(): `number`

读取 16 位无符号整数

#### Returns

`number`

#### Source

common/io/IOReaderSync.ts:91

***

### readUint24()

> **readUint24**(): `number`

读取 24 位无符号整数

#### Returns

`number`

#### Source

common/io/IOReaderSync.ts:113

***

### readUint32()

> **readUint32**(): `number`

读取 32 位无符号整数

#### Returns

`number`

#### Source

common/io/IOReaderSync.ts:141

***

### readUint64()

> **readUint64**(): `bigint`

读取 64 位无符号整数

#### Returns

`bigint`

#### Source

common/io/IOReaderSync.ts:163

***

### readUint8()

> **readUint8**(): `number`

读取 8 位无符号整数

#### Returns

`number`

#### Implementation of

`BytesReaderSync.readUint8`

#### Source

common/io/IOReaderSync.ts:69

***

### remainingLength()

> **remainingLength**(): `number`

获取剩余可读字节数

#### Returns

`number`

#### Source

common/io/IOReaderSync.ts:552

***

### reset()

> **reset**(): `void`

#### Returns

`void`

#### Source

common/io/IOReaderSync.ts:665

***

### seek()

> **seek**(`pos`, `force`, `flush`): `void`

#### Parameters

• **pos**: `bigint`

• **force**: `boolean`= `false`

• **flush**: `boolean`= `true`

#### Returns

`void`

#### Source

common/io/IOReaderSync.ts:598

***

### setEndian()

> **setEndian**(`bigEndian`): `void`

#### Parameters

• **bigEndian**: `boolean`

#### Returns

`void`

#### Source

common/io/IOReaderSync.ts:671

***

### skip()

> **skip**(`length`): `void`

跳过指定字节长度

#### Parameters

• **length**: `number`

#### Returns

`void`

#### Source

common/io/IOReaderSync.ts:530
