[**libmedia**](../../../../README.md) • **Docs**

***

[libmedia](../../../../README.md) / [avcodec/webcodec/AudioEncoder](../README.md) / WebAudioEncoderOptions

# Type alias: WebAudioEncoderOptions

> **WebAudioEncoderOptions**: `object`

## Type declaration

### avframePool?

> `optional` **avframePool**: [`AVFramePool`](../../../../avutil/struct/avframe/interfaces/AVFramePool.md)

### avpacketPool?

> `optional` **avpacketPool**: [`AVPacketPool`](../../../../avutil/struct/avpacket/interfaces/AVPacketPool.md)

### onError()

> **onError**: (`error`?) => `void`

#### Parameters

• **error?**: `Error`

#### Returns

`void`

### onReceivePacket()

> **onReceivePacket**: (`avpacket`) => `void`

#### Parameters

• **avpacket**: `pointer`\<[`AVPacket`](../../../../avutil/struct/avpacket/classes/AVPacket.md)\>

#### Returns

`void`

## Source

[avcodec/webcodec/AudioEncoder.ts:39](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avcodec/webcodec/AudioEncoder.ts#L39)
