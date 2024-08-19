[**libmedia**](../../../../README.md) • **Docs**

***

[libmedia](../../../../README.md) / [avcodec/webcodec/VideoDecoder](../README.md) / WebVideoDecoderOptions

# Type alias: WebVideoDecoderOptions

> **WebVideoDecoderOptions**: `object`

## Type declaration

### enableHardwareAcceleration?

> `optional` **enableHardwareAcceleration**: `boolean`

### onError()

> **onError**: (`error`?) => `void`

#### Parameters

• **error?**: `Error`

#### Returns

`void`

### onReceiveFrame()

> **onReceiveFrame**: (`frame`) => `void`

#### Parameters

• **frame**: `VideoFrame`

#### Returns

`void`

## Source

[avcodec/webcodec/VideoDecoder.ts:37](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avcodec/webcodec/VideoDecoder.ts#L37)
