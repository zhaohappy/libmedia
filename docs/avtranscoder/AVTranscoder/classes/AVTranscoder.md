[**libmedia**](../../../README.md) • **Docs**

***

[libmedia](../../../README.md) / [avtranscoder/AVTranscoder](../README.md) / AVTranscoder

# Class: AVTranscoder

## Extends

- `default`

## Implements

- `ControllerObserver`

## Constructors

### new AVTranscoder()

> **new AVTranscoder**(`options`): [`AVTranscoder`](AVTranscoder.md)

#### Parameters

• **options**: [`AVTranscoderOptions`](../interfaces/AVTranscoderOptions.md)

#### Returns

[`AVTranscoder`](AVTranscoder.md)

#### Overrides

`Emitter.constructor`

#### Source

[avtranscoder/AVTranscoder.ts:265](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avtranscoder/AVTranscoder.ts#L265)

## Properties

### listeners

> **listeners**: `Record`\<`string`, `EmitterOptions`[]\>

已注册的事件监听

#### Inherited from

`Emitter.listeners`

#### Source

common/event/Emitter.ts:55

***

### nativeListeners?

> `optional` **nativeListeners**: `Record`\<`string`, `NativeListener`\>

原生事件监听，一个事件对应一个 listener

#### Inherited from

`Emitter.nativeListeners`

#### Source

common/event/Emitter.ts:60

***

### ns

> **ns**: `boolean`

是否开启命名空间

#### Inherited from

`Emitter.ns`

#### Source

common/event/Emitter.ts:50

***

### Resource

> `static` **Resource**: `Map`\<`string`, `WebAssemblyResource`\>

#### Source

[avtranscoder/AVTranscoder.ts:235](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avtranscoder/AVTranscoder.ts#L235)

## Methods

### addTask()

> **addTask**(`taskOptions`): `Promise`\<`string`\>

#### Parameters

• **taskOptions**: [`TaskOptions`](../interfaces/TaskOptions.md)

#### Returns

`Promise`\<`string`\>

#### Source

[avtranscoder/AVTranscoder.ts:1584](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avtranscoder/AVTranscoder.ts#L1584)

***

### cancelTask()

> **cancelTask**(`taskId`): `Promise`\<`void`\>

#### Parameters

• **taskId**: `string`

#### Returns

`Promise`\<`void`\>

#### Source

[avtranscoder/AVTranscoder.ts:1760](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avtranscoder/AVTranscoder.ts#L1760)

***

### destroy()

> **destroy**(): `Promise`\<`void`\>

#### Returns

`Promise`\<`void`\>

#### Source

[avtranscoder/AVTranscoder.ts:1771](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avtranscoder/AVTranscoder.ts#L1771)

***

### fire()

> **fire**(`type`, `args`, `filter`?): `boolean`

发射事件

#### Parameters

• **type**: `string` \| `Namespace`

事件名称或命名空间

• **args**: `void` \| `any`[]

事件处理函数的参数列表

• **filter?**

自定义过滤器

#### Returns

`boolean`

#### Inherited from

`Emitter.fire`

#### Source

common/event/Emitter.ts:74

***

### has()

> **has**(`type`, `listener`?): `boolean`

是否已监听某个事件

#### Parameters

• **type**: `string` \| `Namespace`

• **listener?**: `Function`

#### Returns

`boolean`

#### Inherited from

`Emitter.has`

#### Source

common/event/Emitter.ts:315

***

### off()

> **off**(`type`?, `listener`?): `void`

取消监听

#### Parameters

• **type?**: `string` \| `Namespace`

• **listener?**: `Function`

#### Returns

`void`

#### Inherited from

`Emitter.off`

#### Source

common/event/Emitter.ts:224

***

### on()

> **on**(`type`, `listener`): `default`

注册监听

#### Parameters

• **type**: `string` \| `Namespace`

• **listener**: `Function` \| `EmitterOptions`

#### Returns

`default`

#### Inherited from

`Emitter.on`

#### Source

common/event/Emitter.ts:174

***

### onGetDecoderResource()

> **onGetDecoderResource**(`mediaType`, `codecId`): `Promise`\<`WebAssemblyResource`\>

#### Parameters

• **mediaType**: `AVMediaType`

• **codecId**: `AVCodecID`

#### Returns

`Promise`\<`WebAssemblyResource`\>

#### Implementation of

`ControllerObserver.onGetDecoderResource`

#### Source

[avtranscoder/AVTranscoder.ts:1873](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avtranscoder/AVTranscoder.ts#L1873)

***

### one()

> **one**(`type`, `listener`): `default`

#### Parameters

• **type**: `string` \| `Namespace`

• **listener**: `Function` \| `EmitterOptions`

#### Returns

`default`

#### Inherited from

`Emitter.one`

#### Source

common/event/Emitter.ts:202

***

### parse()

> **parse**(`type`): `Namespace`

把事件类型解析成命名空间格式

#### Parameters

• **type**: `string`

#### Returns

`Namespace`

#### Inherited from

`Emitter.parse`

#### Source

common/event/Emitter.ts:376

***

### pauseTask()

> **pauseTask**(`taskId`): `Promise`\<`void`\>

#### Parameters

• **taskId**: `string`

#### Returns

`Promise`\<`void`\>

#### Source

[avtranscoder/AVTranscoder.ts:1740](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avtranscoder/AVTranscoder.ts#L1740)

***

### ready()

> **ready**(): `Promise`\<`void`\>

#### Returns

`Promise`\<`void`\>

#### Source

[avtranscoder/AVTranscoder.ts:471](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avtranscoder/AVTranscoder.ts#L471)

***

### setLogLevel()

> **setLogLevel**(`level`): `void`

#### Parameters

• **level**: `number`

#### Returns

`void`

#### Source

[avtranscoder/AVTranscoder.ts:1838](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avtranscoder/AVTranscoder.ts#L1838)

***

### startTask()

> **startTask**(`taskId`): `Promise`\<`void`\>

#### Parameters

• **taskId**: `string`

#### Returns

`Promise`\<`void`\>

#### Source

[avtranscoder/AVTranscoder.ts:1665](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avtranscoder/AVTranscoder.ts#L1665)

***

### unpauseTask()

> **unpauseTask**(`taskId`): `Promise`\<`void`\>

#### Parameters

• **taskId**: `string`

#### Returns

`Promise`\<`void`\>

#### Source

[avtranscoder/AVTranscoder.ts:1750](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avtranscoder/AVTranscoder.ts#L1750)
