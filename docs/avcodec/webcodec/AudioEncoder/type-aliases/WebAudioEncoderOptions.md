[**libmedia**](../../../../README.md) • **Docs**

***

[libmedia](../../../../README.md) / [avcodec/webcodec/AudioEncoder](../README.md) / WebAudioEncoderOptions

# Type alias: WebAudioEncoderOptions

> **WebAudioEncoderOptions**: `object`

## Type declaration

### avpacketPool?

> `optional` **avpacketPool**: [`AVPacketPool`](../../../../avutil/struct/avpacket/interfaces/AVPacketPool.md)

### onError()

> **onError**: (`error`?) => `void`

#### Parameters

• **error?**: `Error`

#### Returns

`void`

### onReceivePacket()

> **onReceivePacket**: (`avpacket`, `avframe`?) => `void`

#### Parameters

• **avpacket**: `pointer`\<[`AVPacket`](../../../../avutil/struct/avpacket/classes/AVPacket.md)\>

• **avframe?**: `pointer`\<[`AVFrame`](../../../../avutil/struct/avframe/classes/AVFrame.md)\>

#### Returns

`void`

## Source

[avcodec/webcodec/AudioEncoder.ts:38](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avcodec/webcodec/AudioEncoder.ts#L38)
