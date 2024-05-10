[**libmedia**](../../../../README.md) • **Docs**

***

[libmedia](../../../../README.md) / [avutil/struct/avpacket](../README.md) / AVPacketPool

# Interface: AVPacketPool

## Properties

### alloc()

> **alloc**: () => `pointer`\<[`AVPacket`](../classes/AVPacket.md)\>

#### Returns

`pointer`\<[`AVPacket`](../classes/AVPacket.md)\>

#### Source

[avutil/struct/avpacket.ts:172](https://github.com/zhaohappy/libmedia/blob/b4bb608d2b1c00d036d73fc8d222b1a97be53694/src/avutil/struct/avpacket.ts#L172)

***

### release()

> **release**: (`avpacket`) => `void`

#### Parameters

• **avpacket**: `pointer`\<[`AVPacket`](../classes/AVPacket.md)\>

#### Returns

`void`

#### Source

[avutil/struct/avpacket.ts:173](https://github.com/zhaohappy/libmedia/blob/b4bb608d2b1c00d036d73fc8d222b1a97be53694/src/avutil/struct/avpacket.ts#L173)
