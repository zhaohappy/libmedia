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

### onReceiveFrame()?

> `optional` **onReceiveFrame**: (`frame`) => `void`

#### Parameters

• **frame**: `VideoFrame`

#### Returns

`void`

## Source

[avcodec/webcodec/VideoDecoder.ts:36](https://github.com/zhaohappy/libmedia/blob/b4bb608d2b1c00d036d73fc8d222b1a97be53694/src/avcodec/webcodec/VideoDecoder.ts#L36)
