[**libmedia**](../../../README.md) • **Docs**

***

[libmedia](../../../README.md) / [avtranscoder/AVTranscoder](../README.md) / AVTranscoderOptions

# Interface: AVTranscoderOptions

## Properties

### enableHardware?

> `optional` **enableHardware**: `boolean`

#### Source

[avtranscoder/AVTranscoder.ts:92](https://github.com/zhaohappy/libmedia/blob/a88305ff5d10e91621f2d71d24c72fc85681b8f7/src/avtranscoder/AVTranscoder.ts#L92)

***

### getWasm()

> **getWasm**: (`type`, `codec`?) => `string` \| `ArrayBuffer` \| `WebAssemblyResource`

#### Parameters

• **type**: `"encoder"` \| `"decoder"` \| `"resampler"` \| `"scaler"`

• **codec?**: `AVCodecID`

#### Returns

`string` \| `ArrayBuffer` \| `WebAssemblyResource`

#### Source

[avtranscoder/AVTranscoder.ts:91](https://github.com/zhaohappy/libmedia/blob/a88305ff5d10e91621f2d71d24c72fc85681b8f7/src/avtranscoder/AVTranscoder.ts#L91)

***

### onprogress()?

> `optional` **onprogress**: (`taskId`, `progress`) => `void`

#### Parameters

• **taskId**: `string`

• **progress**: `number`

#### Returns

`void`

#### Source

[avtranscoder/AVTranscoder.ts:93](https://github.com/zhaohappy/libmedia/blob/a88305ff5d10e91621f2d71d24c72fc85681b8f7/src/avtranscoder/AVTranscoder.ts#L93)
