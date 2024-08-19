[**libmedia**](../../../README.md) • **Docs**

***

[libmedia](../../../README.md) / [avtranscoder/AVTranscoder](../README.md) / AVTranscoderOptions

# Interface: AVTranscoderOptions

## Properties

### enableHardware?

> `optional` **enableHardware**: `boolean`

#### Source

[avtranscoder/AVTranscoder.ts:100](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avtranscoder/AVTranscoder.ts#L100)

***

### getWasm()

> **getWasm**: (`type`, `codec`?, `mediaType`?) => `string` \| `ArrayBuffer` \| `WebAssemblyResource`

#### Parameters

• **type**: `"encoder"` \| `"decoder"` \| `"resampler"` \| `"scaler"`

• **codec?**: `AVCodecID`

• **mediaType?**: `AVMediaType`

#### Returns

`string` \| `ArrayBuffer` \| `WebAssemblyResource`

#### Source

[avtranscoder/AVTranscoder.ts:99](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avtranscoder/AVTranscoder.ts#L99)

***

### onprogress()?

> `optional` **onprogress**: (`taskId`, `progress`) => `void`

#### Parameters

• **taskId**: `string`

• **progress**: `number`

#### Returns

`void`

#### Source

[avtranscoder/AVTranscoder.ts:101](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avtranscoder/AVTranscoder.ts#L101)
