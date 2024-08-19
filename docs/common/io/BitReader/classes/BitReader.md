[**libmedia**](../../../../README.md) • **Docs**

***

[libmedia](../../../../README.md) / [common/io/BitReader](../README.md) / BitReader

# Class: BitReader

## Constructors

### new BitReader()

> **new BitReader**(`size`): [`BitReader`](BitReader.md)

#### Parameters

• **size**: `number`= `undefined`

#### Returns

[`BitReader`](BitReader.md)

#### Source

common/io/BitReader.ts:29

## Properties

### error

> **error**: `number`

#### Source

common/io/BitReader.ts:21

***

### onFlush()

> **onFlush**: (`data`) => `number`

#### Parameters

• **data**: `Uint8Array`

#### Returns

`number`

#### Source

common/io/BitReader.ts:23

## Methods

### appendBuffer()

> **appendBuffer**(`buffer`): `void`

#### Parameters

• **buffer**: `Uint8ArrayInterface`

#### Returns

`void`

#### Source

common/io/BitReader.ts:171

***

### clear()

> **clear**(): `void`

#### Returns

`void`

#### Source

common/io/BitReader.ts:195

***

### flush()

> **flush**(): `void`

#### Returns

`void`

#### Source

common/io/BitReader.ts:125

***

### getBuffer()

> **getBuffer**(): `Uint8Array`

#### Returns

`Uint8Array`

#### Source

common/io/BitReader.ts:167

***

### getPos()

> **getPos**(): `number`

#### Returns

`number`

#### Source

common/io/BitReader.ts:105

***

### peekU1()

> **peekU1**(): `number`

不影响原读取操作的情况下，读取 1 个比特

#### Returns

`number`

#### Source

common/io/BitReader.ts:43

***

### readU()

> **readU**(`n`): `number`

读取 n 个比特

#### Parameters

• **n**: `number`

#### Returns

`number`

#### Source

common/io/BitReader.ts:88

***

### readU1()

> **readU1**(): `number`

读取 1 个比特

#### Returns

`number`

#### Source

common/io/BitReader.ts:64

***

### remainingLength()

> **remainingLength**(): `number`

获取剩余可读字节数

#### Returns

`number`

#### Source

common/io/BitReader.ts:101

***

### skip()

> **skip**(`n`): `void`

#### Parameters

• **n**: `number`

#### Returns

`void`

#### Source

common/io/BitReader.ts:109

***

### skipPadding()

> **skipPadding**(): `void`

#### Returns

`void`

#### Source

common/io/BitReader.ts:201
