[**libmedia**](../../../../README.md) • **Docs**

***

[libmedia](../../../../README.md) / [common/io/BitWriter](../README.md) / BitWriter

# Class: BitWriter

写字节流工具

## Constructors

### new BitWriter()

> **new BitWriter**(`size`): [`BitWriter`](BitWriter.md)

#### Parameters

• **size**: `number`= `undefined`

#### Returns

[`BitWriter`](BitWriter.md)

#### Source

common/io/BitWriter.ts:28

## Properties

### error

> **error**: `number`

#### Source

common/io/BitWriter.ts:21

***

### onFlush()

> **onFlush**: (`data`, `pos`?) => `number`

#### Parameters

• **data**: `Uint8Array`

• **pos?**: `number`

#### Returns

`number`

#### Source

common/io/BitWriter.ts:23

## Methods

### clear()

> **clear**(): `void`

#### Returns

`void`

#### Source

common/io/BitWriter.ts:116

***

### flush()

> **flush**(): `void`

#### Returns

`void`

#### Source

common/io/BitWriter.ts:83

***

### getBuffer()

> **getBuffer**(): `Uint8Array`

#### Returns

`Uint8Array`

#### Source

common/io/BitWriter.ts:122

***

### getPointer()

> **getPointer**(): `number`

#### Returns

`number`

#### Source

common/io/BitWriter.ts:126

***

### padding()

> **padding**(): `void`

#### Returns

`void`

#### Source

common/io/BitWriter.ts:110

***

### remainingLength()

> **remainingLength**(): `number`

获取剩余可写节数

#### Returns

`number`

#### Source

common/io/BitWriter.ts:79

***

### writeU()

> **writeU**(`n`, `v`): `void`

写 n 个比特

#### Parameters

• **n**: `number`

• **v**: `number`

#### Returns

`void`

#### Source

common/io/BitWriter.ts:68

***

### writeU1()

> **writeU1**(`bit`): `void`

写一个 bit

#### Parameters

• **bit**: `number`

#### Returns

`void`

#### Source

common/io/BitWriter.ts:42
