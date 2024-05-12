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

[avcodec/webcodec/VideoDecoder.ts:36](https://github.com/zhaohappy/libmedia/blob/acbbf6bd75e6ee4c968b9f441fe28c40f42f350d/src/avcodec/webcodec/VideoDecoder.ts#L36)
