[**libmedia**](../../../README.md) • **Docs**

***

[libmedia](../../../README.md) / [avplayer/AVPlayer](../README.md) / AVPlayer

# Class: AVPlayer

## Extends

- `default`

## Implements

- `ControllerObserver`

## Constructors

### new AVPlayer()

> **new AVPlayer**(`options`): [`AVPlayer`](AVPlayer.md)

#### Parameters

• **options**: [`AVPlayerOptions`](../interfaces/AVPlayerOptions.md)

#### Returns

[`AVPlayer`](AVPlayer.md)

#### Overrides

`Emitter.constructor`

#### Source

[avplayer/AVPlayer.ts:217](https://github.com/zhaohappy/libmedia/blob/b4bb608d2b1c00d036d73fc8d222b1a97be53694/src/avplayer/AVPlayer.ts#L217)

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

### AudioDecoderThread

> `static` **AudioDecoderThread**: `Thread`\<[`AudioDecodePipeline`](../../../avpipeline/AudioDecodePipeline/classes/AudioDecodePipeline.md)\>

#### Source

[avplayer/AVPlayer.ts:162](https://github.com/zhaohappy/libmedia/blob/b4bb608d2b1c00d036d73fc8d222b1a97be53694/src/avplayer/AVPlayer.ts#L162)

***

### AudioRenderThread

> `static` **AudioRenderThread**: `Thread`\<[`AudioRenderPipeline`](../../../avpipeline/AudioRenderPipeline/classes/AudioRenderPipeline.md)\>

#### Source

[avplayer/AVPlayer.ts:163](https://github.com/zhaohappy/libmedia/blob/b4bb608d2b1c00d036d73fc8d222b1a97be53694/src/avplayer/AVPlayer.ts#L163)

***

### AudioThreadReady

> `static` **AudioThreadReady**: `Promise`\<`void`\>

#### Source

[avplayer/AVPlayer.ts:155](https://github.com/zhaohappy/libmedia/blob/b4bb608d2b1c00d036d73fc8d222b1a97be53694/src/avplayer/AVPlayer.ts#L155)

***

### DemuxThreadReady

> `static` **DemuxThreadReady**: `Promise`\<`void`\>

#### Source

[avplayer/AVPlayer.ts:154](https://github.com/zhaohappy/libmedia/blob/b4bb608d2b1c00d036d73fc8d222b1a97be53694/src/avplayer/AVPlayer.ts#L154)

***

### DemuxerThread

> `static` **DemuxerThread**: `Thread`\<`default`\>

#### Source

[avplayer/AVPlayer.ts:161](https://github.com/zhaohappy/libmedia/blob/b4bb608d2b1c00d036d73fc8d222b1a97be53694/src/avplayer/AVPlayer.ts#L161)

***

### IOThread

> `static` **IOThread**: `Thread`\<[`IOPipeline`](../../../avpipeline/IOPipeline/classes/IOPipeline.md)\>

#### Source

[avplayer/AVPlayer.ts:160](https://github.com/zhaohappy/libmedia/blob/b4bb608d2b1c00d036d73fc8d222b1a97be53694/src/avplayer/AVPlayer.ts#L160)

***

### MSEThread

> `static` **MSEThread**: `Thread`\<`default`\>

#### Source

[avplayer/AVPlayer.ts:165](https://github.com/zhaohappy/libmedia/blob/b4bb608d2b1c00d036d73fc8d222b1a97be53694/src/avplayer/AVPlayer.ts#L165)

***

### MSEThreadReady

> `static` **MSEThreadReady**: `Promise`\<`void`\>

#### Source

[avplayer/AVPlayer.ts:157](https://github.com/zhaohappy/libmedia/blob/b4bb608d2b1c00d036d73fc8d222b1a97be53694/src/avplayer/AVPlayer.ts#L157)

***

### VideoRenderThread

> `static` **VideoRenderThread**: `Thread`\<[`VideoRenderPipeline`](../../../avpipeline/VideoRenderPipeline/classes/VideoRenderPipeline.md)\>

#### Source

[avplayer/AVPlayer.ts:164](https://github.com/zhaohappy/libmedia/blob/b4bb608d2b1c00d036d73fc8d222b1a97be53694/src/avplayer/AVPlayer.ts#L164)

***

### VideoThreadReady

> `static` **VideoThreadReady**: `Promise`\<`void`\>

#### Source

[avplayer/AVPlayer.ts:156](https://github.com/zhaohappy/libmedia/blob/b4bb608d2b1c00d036d73fc8d222b1a97be53694/src/avplayer/AVPlayer.ts#L156)

***

### audioContext

> `static` **audioContext**: `AudioContext`

#### Source

[avplayer/AVPlayer.ts:167](https://github.com/zhaohappy/libmedia/blob/b4bb608d2b1c00d036d73fc8d222b1a97be53694/src/avplayer/AVPlayer.ts#L167)

***

### level

> `static` **level**: `number` = `logger.INFO`

#### Source

[avplayer/AVPlayer.ts:152](https://github.com/zhaohappy/libmedia/blob/b4bb608d2b1c00d036d73fc8d222b1a97be53694/src/avplayer/AVPlayer.ts#L152)

## Methods

### destroy()

> **destroy**(): `Promise`\<`void`\>

#### Returns

`Promise`\<`void`\>

#### Source

[avplayer/AVPlayer.ts:1775](https://github.com/zhaohappy/libmedia/blob/b4bb608d2b1c00d036d73fc8d222b1a97be53694/src/avplayer/AVPlayer.ts#L1775)

***

### enableHorizontalFlip()

> **enableHorizontalFlip**(`enable`): `void`

#### Parameters

• **enable**: `boolean`

#### Returns

`void`

#### Source

[avplayer/AVPlayer.ts:1640](https://github.com/zhaohappy/libmedia/blob/b4bb608d2b1c00d036d73fc8d222b1a97be53694/src/avplayer/AVPlayer.ts#L1640)

***

### enableVerticalFlip()

> **enableVerticalFlip**(`enable`): `void`

#### Parameters

• **enable**: `boolean`

#### Returns

`void`

#### Source

[avplayer/AVPlayer.ts:1651](https://github.com/zhaohappy/libmedia/blob/b4bb608d2b1c00d036d73fc8d222b1a97be53694/src/avplayer/AVPlayer.ts#L1651)

***

### enterFullscreen()

> **enterFullscreen**(): `void`

全屏

#### Returns

`void`

#### Source

[avplayer/AVPlayer.ts:1718](https://github.com/zhaohappy/libmedia/blob/b4bb608d2b1c00d036d73fc8d222b1a97be53694/src/avplayer/AVPlayer.ts#L1718)

***

### exitFullscreen()

> **exitFullscreen**(): `void`

退出全屏

#### Returns

`void`

#### Source

[avplayer/AVPlayer.ts:1738](https://github.com/zhaohappy/libmedia/blob/b4bb608d2b1c00d036d73fc8d222b1a97be53694/src/avplayer/AVPlayer.ts#L1738)

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

### getAudioList()

> **getAudioList**(): `Promise`\<`object`\>

#### Returns

`Promise`\<`object`\>

##### list

> **list**: `object`[]

##### selectedIndex

> **selectedIndex**: `number`

#### Source

[avplayer/AVPlayer.ts:1695](https://github.com/zhaohappy/libmedia/blob/b4bb608d2b1c00d036d73fc8d222b1a97be53694/src/avplayer/AVPlayer.ts#L1695)

***

### getDuration()

> **getDuration**(): `bigint`

获取总时长（毫秒）

#### Returns

`bigint`

#### Source

[avplayer/AVPlayer.ts:1368](https://github.com/zhaohappy/libmedia/blob/b4bb608d2b1c00d036d73fc8d222b1a97be53694/src/avplayer/AVPlayer.ts#L1368)

***

### getPlaybackRate()

> **getPlaybackRate**(): `double`

获取倍数值

#### Returns

`double`

#### Source

[avplayer/AVPlayer.ts:1500](https://github.com/zhaohappy/libmedia/blob/b4bb608d2b1c00d036d73fc8d222b1a97be53694/src/avplayer/AVPlayer.ts#L1500)

***

### getRenderMode()

> **getRenderMode**(): `RenderMode`

获取渲染模式

#### Returns

`RenderMode`

#### Source

[avplayer/AVPlayer.ts:1587](https://github.com/zhaohappy/libmedia/blob/b4bb608d2b1c00d036d73fc8d222b1a97be53694/src/avplayer/AVPlayer.ts#L1587)

***

### getStats()

> **getStats**(): `default`

#### Returns

`default`

#### Source

[avplayer/AVPlayer.ts:1771](https://github.com/zhaohappy/libmedia/blob/b4bb608d2b1c00d036d73fc8d222b1a97be53694/src/avplayer/AVPlayer.ts#L1771)

***

### getStreams()

> **getStreams**(): `AVStreamInterface`[]

#### Returns

`AVStreamInterface`[]

#### Source

[avplayer/AVPlayer.ts:1359](https://github.com/zhaohappy/libmedia/blob/b4bb608d2b1c00d036d73fc8d222b1a97be53694/src/avplayer/AVPlayer.ts#L1359)

***

### getSubtitleList()

> **getSubtitleList**(): `Promise`\<`object`\>

#### Returns

`Promise`\<`object`\>

##### list

> **list**: `object`[]

##### selectedIndex

> **selectedIndex**: `number` = `0`

#### Source

[avplayer/AVPlayer.ts:1699](https://github.com/zhaohappy/libmedia/blob/b4bb608d2b1c00d036d73fc8d222b1a97be53694/src/avplayer/AVPlayer.ts#L1699)

***

### getVideoList()

> **getVideoList**(): `Promise`\<`object`\>

#### Returns

`Promise`\<`object`\>

##### list

> **list**: `object`[]

##### selectedIndex

> **selectedIndex**: `number`

#### Source

[avplayer/AVPlayer.ts:1691](https://github.com/zhaohappy/libmedia/blob/b4bb608d2b1c00d036d73fc8d222b1a97be53694/src/avplayer/AVPlayer.ts#L1691)

***

### getVolume()

> **getVolume**(): `double`

获取播放音量

#### Returns

`double`

#### Source

[avplayer/AVPlayer.ts:1546](https://github.com/zhaohappy/libmedia/blob/b4bb608d2b1c00d036d73fc8d222b1a97be53694/src/avplayer/AVPlayer.ts#L1546)

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

### isMSE()

> **isMSE**(): `boolean`

#### Returns

`boolean`

#### Source

[avplayer/AVPlayer.ts:1687](https://github.com/zhaohappy/libmedia/blob/b4bb608d2b1c00d036d73fc8d222b1a97be53694/src/avplayer/AVPlayer.ts#L1687)

***

### load()

> **load**(`source`): `Promise`\<`void`\>

#### Parameters

• **source**: `string` \| `File`

#### Returns

`Promise`\<`void`\>

#### Source

[avplayer/AVPlayer.ts:473](https://github.com/zhaohappy/libmedia/blob/b4bb608d2b1c00d036d73fc8d222b1a97be53694/src/avplayer/AVPlayer.ts#L473)

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

### onAudioEnded()

> **onAudioEnded**(): `void`

#### Returns

`void`

#### Implementation of

`ControllerObserver.onAudioEnded`

#### Source

[avplayer/AVPlayer.ts:1807](https://github.com/zhaohappy/libmedia/blob/b4bb608d2b1c00d036d73fc8d222b1a97be53694/src/avplayer/AVPlayer.ts#L1807)

***

### onCanvasUpdated()

> **onCanvasUpdated**(): `void`

#### Returns

`void`

#### Implementation of

`ControllerObserver.onCanvasUpdated`

#### Source

[avplayer/AVPlayer.ts:1812](https://github.com/zhaohappy/libmedia/blob/b4bb608d2b1c00d036d73fc8d222b1a97be53694/src/avplayer/AVPlayer.ts#L1812)

***

### onFirstAudioRendered()

> **onFirstAudioRendered**(): `void`

#### Returns

`void`

#### Source

[avplayer/AVPlayer.ts:1827](https://github.com/zhaohappy/libmedia/blob/b4bb608d2b1c00d036d73fc8d222b1a97be53694/src/avplayer/AVPlayer.ts#L1827)

***

### onFirstVideoRendered()

> **onFirstVideoRendered**(): `void`

#### Returns

`void`

#### Implementation of

`ControllerObserver.onFirstVideoRendered`

#### Source

[avplayer/AVPlayer.ts:1822](https://github.com/zhaohappy/libmedia/blob/b4bb608d2b1c00d036d73fc8d222b1a97be53694/src/avplayer/AVPlayer.ts#L1822)

***

### onFirstVideoRenderedAfterUpdateCanvas()

> **onFirstVideoRenderedAfterUpdateCanvas**(): `void`

#### Returns

`void`

#### Implementation of

`ControllerObserver.onFirstVideoRenderedAfterUpdateCanvas`

#### Source

[avplayer/AVPlayer.ts:1836](https://github.com/zhaohappy/libmedia/blob/b4bb608d2b1c00d036d73fc8d222b1a97be53694/src/avplayer/AVPlayer.ts#L1836)

***

### onMSESeek()

> **onMSESeek**(`time`): `void`

#### Parameters

• **time**: `number`

#### Returns

`void`

#### Implementation of

`ControllerObserver.onMSESeek`

#### Source

[avplayer/AVPlayer.ts:1851](https://github.com/zhaohappy/libmedia/blob/b4bb608d2b1c00d036d73fc8d222b1a97be53694/src/avplayer/AVPlayer.ts#L1851)

***

### onStutter()

> **onStutter**(): `void`

#### Returns

`void`

#### Source

[avplayer/AVPlayer.ts:1832](https://github.com/zhaohappy/libmedia/blob/b4bb608d2b1c00d036d73fc8d222b1a97be53694/src/avplayer/AVPlayer.ts#L1832)

***

### onTimeUpdate()

> **onTimeUpdate**(`pts`): `void`

#### Parameters

• **pts**: `int64`

#### Returns

`void`

#### Implementation of

`ControllerObserver.onTimeUpdate`

#### Source

[avplayer/AVPlayer.ts:1847](https://github.com/zhaohappy/libmedia/blob/b4bb608d2b1c00d036d73fc8d222b1a97be53694/src/avplayer/AVPlayer.ts#L1847)

***

### onVideoEnded()

> **onVideoEnded**(): `void`

#### Returns

`void`

#### Implementation of

`ControllerObserver.onVideoEnded`

#### Source

[avplayer/AVPlayer.ts:1802](https://github.com/zhaohappy/libmedia/blob/b4bb608d2b1c00d036d73fc8d222b1a97be53694/src/avplayer/AVPlayer.ts#L1802)

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

### pause()

> **pause**(): `Promise`\<`void`\>

暂停播放

#### Returns

`Promise`\<`void`\>

#### Source

[avplayer/AVPlayer.ts:1188](https://github.com/zhaohappy/libmedia/blob/b4bb608d2b1c00d036d73fc8d222b1a97be53694/src/avplayer/AVPlayer.ts#L1188)

***

### play()

> **play**(`options`): `Promise`\<`void`\>

#### Parameters

• **options**= `undefined`

• **options.audio?**: `boolean`

• **options.video?**: `boolean`

#### Returns

`Promise`\<`void`\>

#### Source

[avplayer/AVPlayer.ts:712](https://github.com/zhaohappy/libmedia/blob/b4bb608d2b1c00d036d73fc8d222b1a97be53694/src/avplayer/AVPlayer.ts#L712)

***

### resize()

> **resize**(`width`, `height`): `void`

重置渲染视图大小

#### Parameters

• **width**: `number`

• **height**: `number`

#### Returns

`void`

#### Source

[avplayer/AVPlayer.ts:1680](https://github.com/zhaohappy/libmedia/blob/b4bb608d2b1c00d036d73fc8d222b1a97be53694/src/avplayer/AVPlayer.ts#L1680)

***

### resume()

> **resume**(): `Promise`\<`void`\>

resume 音频

#### Returns

`Promise`\<`void`\>

#### Source

[avplayer/AVPlayer.ts:1507](https://github.com/zhaohappy/libmedia/blob/b4bb608d2b1c00d036d73fc8d222b1a97be53694/src/avplayer/AVPlayer.ts#L1507)

***

### seek()

> **seek**(`timestamp`): `Promise`\<`void`\>

跳转到指定时间戳位置播放（只支持点播）
某些文件可能不会 seek 成功

#### Parameters

• **timestamp**: `double`

毫秒

#### Returns

`Promise`\<`void`\>

#### Source

[avplayer/AVPlayer.ts:1239](https://github.com/zhaohappy/libmedia/blob/b4bb608d2b1c00d036d73fc8d222b1a97be53694/src/avplayer/AVPlayer.ts#L1239)

***

### selectAudio()

> **selectAudio**(`index`): `Promise`\<`void`\>

#### Parameters

• **index**: `number`

#### Returns

`Promise`\<`void`\>

#### Source

[avplayer/AVPlayer.ts:1707](https://github.com/zhaohappy/libmedia/blob/b4bb608d2b1c00d036d73fc8d222b1a97be53694/src/avplayer/AVPlayer.ts#L1707)

***

### selectSubtitle()

> **selectSubtitle**(`index`): `Promise`\<`void`\>

#### Parameters

• **index**: `number`

#### Returns

`Promise`\<`void`\>

#### Source

[avplayer/AVPlayer.ts:1711](https://github.com/zhaohappy/libmedia/blob/b4bb608d2b1c00d036d73fc8d222b1a97be53694/src/avplayer/AVPlayer.ts#L1711)

***

### selectVideo()

> **selectVideo**(`index`): `Promise`\<`void`\>

#### Parameters

• **index**: `number`

#### Returns

`Promise`\<`void`\>

#### Source

[avplayer/AVPlayer.ts:1703](https://github.com/zhaohappy/libmedia/blob/b4bb608d2b1c00d036d73fc8d222b1a97be53694/src/avplayer/AVPlayer.ts#L1703)

***

### setLoop()

> **setLoop**(`enable`): `void`

设置是否循环播放

#### Parameters

• **enable**: `boolean`

#### Returns

`void`

#### Source

[avplayer/AVPlayer.ts:1667](https://github.com/zhaohappy/libmedia/blob/b4bb608d2b1c00d036d73fc8d222b1a97be53694/src/avplayer/AVPlayer.ts#L1667)

***

### setPlaybackRate()

> **setPlaybackRate**(`rate`): `void`

#### Parameters

• **rate**: `number`

#### Returns

`void`

#### Source

[avplayer/AVPlayer.ts:1471](https://github.com/zhaohappy/libmedia/blob/b4bb608d2b1c00d036d73fc8d222b1a97be53694/src/avplayer/AVPlayer.ts#L1471)

***

### setRenderMode()

> **setRenderMode**(`mode`): `void`

设置画面填充模式

- 0 自适应
- 1 填充

#### Parameters

• **mode**: `RenderMode`

#### Returns

`void`

#### Source

[avplayer/AVPlayer.ts:1599](https://github.com/zhaohappy/libmedia/blob/b4bb608d2b1c00d036d73fc8d222b1a97be53694/src/avplayer/AVPlayer.ts#L1599)

***

### setRotate()

> **setRotate**(`angle`): `void`

设置视频渲染旋转角度

#### Parameters

• **angle**: `double`

#### Returns

`void`

#### Source

[avplayer/AVPlayer.ts:1629](https://github.com/zhaohappy/libmedia/blob/b4bb608d2b1c00d036d73fc8d222b1a97be53694/src/avplayer/AVPlayer.ts#L1629)

***

### setVolume()

> **setVolume**(`volume`, `force`): `void`

设置播放音量

#### Parameters

• **volume**: `number`

[0, 3]

• **force**: `boolean`= `false`

#### Returns

`void`

#### Source

[avplayer/AVPlayer.ts:1556](https://github.com/zhaohappy/libmedia/blob/b4bb608d2b1c00d036d73fc8d222b1a97be53694/src/avplayer/AVPlayer.ts#L1556)

***

### snapshot()

> **snapshot**(`type`, `quality`): `string`

获取截图

#### Parameters

• **type**: `"png"` \| `"jpeg"` \| `"webp"`= `'png'`

生成图片格式

• **quality**: `number`= `1`

生成图片质量

#### Returns

`string`

#### Source

[avplayer/AVPlayer.ts:1757](https://github.com/zhaohappy/libmedia/blob/b4bb608d2b1c00d036d73fc8d222b1a97be53694/src/avplayer/AVPlayer.ts#L1757)

***

### stop()

> **stop**(): `Promise`\<`void`\>

#### Returns

`Promise`\<`void`\>

#### Source

[avplayer/AVPlayer.ts:1389](https://github.com/zhaohappy/libmedia/blob/b4bb608d2b1c00d036d73fc8d222b1a97be53694/src/avplayer/AVPlayer.ts#L1389)

***

### setLogLevel()

> `static` **setLogLevel**(`level`): `void`

#### Parameters

• **level**: `number`

#### Returns

`void`

#### Source

[avplayer/AVPlayer.ts:2002](https://github.com/zhaohappy/libmedia/blob/b4bb608d2b1c00d036d73fc8d222b1a97be53694/src/avplayer/AVPlayer.ts#L2002)

***

### startAudioPipeline()

> `static` **startAudioPipeline**(): `Promise`\<`void`\>

#### Returns

`Promise`\<`void`\>

#### Source

[avplayer/AVPlayer.ts:1894](https://github.com/zhaohappy/libmedia/blob/b4bb608d2b1c00d036d73fc8d222b1a97be53694/src/avplayer/AVPlayer.ts#L1894)

***

### startDemuxPipeline()

> `static` **startDemuxPipeline**(): `Promise`\<`void`\>

#### Returns

`Promise`\<`void`\>

#### Source

[avplayer/AVPlayer.ts:1875](https://github.com/zhaohappy/libmedia/blob/b4bb608d2b1c00d036d73fc8d222b1a97be53694/src/avplayer/AVPlayer.ts#L1875)

***

### startMSEPipeline()

> `static` **startMSEPipeline**(): `Promise`\<`void`\>

#### Returns

`Promise`\<`void`\>

#### Source

[avplayer/AVPlayer.ts:1939](https://github.com/zhaohappy/libmedia/blob/b4bb608d2b1c00d036d73fc8d222b1a97be53694/src/avplayer/AVPlayer.ts#L1939)

***

### startPipelines()

> `static` **startPipelines**(): `Promise`\<`void`\>

#### Returns

`Promise`\<`void`\>

#### Source

[avplayer/AVPlayer.ts:1956](https://github.com/zhaohappy/libmedia/blob/b4bb608d2b1c00d036d73fc8d222b1a97be53694/src/avplayer/AVPlayer.ts#L1956)

***

### startVideoRenderPipeline()

> `static` **startVideoRenderPipeline**(): `Promise`\<`void`\>

#### Returns

`Promise`\<`void`\>

#### Source

[avplayer/AVPlayer.ts:1924](https://github.com/zhaohappy/libmedia/blob/b4bb608d2b1c00d036d73fc8d222b1a97be53694/src/avplayer/AVPlayer.ts#L1924)

***

### stopPipelines()

> `static` **stopPipelines**(): `Promise`\<`void`\>

#### Returns

`Promise`\<`void`\>

#### Source

[avplayer/AVPlayer.ts:1964](https://github.com/zhaohappy/libmedia/blob/b4bb608d2b1c00d036d73fc8d222b1a97be53694/src/avplayer/AVPlayer.ts#L1964)
