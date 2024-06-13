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

[avplayer/AVPlayer.ts:221](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avplayer/AVPlayer.ts#L221)

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

[avplayer/AVPlayer.ts:166](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avplayer/AVPlayer.ts#L166)

***

### AudioRenderThread

> `static` **AudioRenderThread**: `Thread`\<[`AudioRenderPipeline`](../../../avpipeline/AudioRenderPipeline/classes/AudioRenderPipeline.md)\>

#### Source

[avplayer/AVPlayer.ts:167](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avplayer/AVPlayer.ts#L167)

***

### AudioThreadReady

> `static` **AudioThreadReady**: `Promise`\<`void`\>

#### Source

[avplayer/AVPlayer.ts:159](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avplayer/AVPlayer.ts#L159)

***

### DemuxThreadReady

> `static` **DemuxThreadReady**: `Promise`\<`void`\>

#### Source

[avplayer/AVPlayer.ts:158](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avplayer/AVPlayer.ts#L158)

***

### DemuxerThread

> `static` **DemuxerThread**: `Thread`\<[`DemuxPipeline`](../../../avpipeline/DemuxPipeline/classes/DemuxPipeline.md)\>

#### Source

[avplayer/AVPlayer.ts:165](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avplayer/AVPlayer.ts#L165)

***

### IOThread

> `static` **IOThread**: `Thread`\<[`IOPipeline`](../../../avpipeline/IOPipeline/classes/IOPipeline.md)\>

#### Source

[avplayer/AVPlayer.ts:164](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avplayer/AVPlayer.ts#L164)

***

### MSEThread

> `static` **MSEThread**: `Thread`\<`default`\>

#### Source

[avplayer/AVPlayer.ts:169](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avplayer/AVPlayer.ts#L169)

***

### MSEThreadReady

> `static` **MSEThreadReady**: `Promise`\<`void`\>

#### Source

[avplayer/AVPlayer.ts:161](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avplayer/AVPlayer.ts#L161)

***

### VideoRenderThread

> `static` **VideoRenderThread**: `Thread`\<[`VideoRenderPipeline`](../../../avpipeline/VideoRenderPipeline/classes/VideoRenderPipeline.md)\>

#### Source

[avplayer/AVPlayer.ts:168](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avplayer/AVPlayer.ts#L168)

***

### VideoThreadReady

> `static` **VideoThreadReady**: `Promise`\<`void`\>

#### Source

[avplayer/AVPlayer.ts:160](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avplayer/AVPlayer.ts#L160)

***

### audioContext

> `static` **audioContext**: `AudioContext`

#### Source

[avplayer/AVPlayer.ts:171](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avplayer/AVPlayer.ts#L171)

***

### level

> `static` **level**: `number` = `logger.INFO`

#### Source

[avplayer/AVPlayer.ts:156](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avplayer/AVPlayer.ts#L156)

## Methods

### destroy()

> **destroy**(): `Promise`\<`void`\>

#### Returns

`Promise`\<`void`\>

#### Source

[avplayer/AVPlayer.ts:1846](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avplayer/AVPlayer.ts#L1846)

***

### enableHorizontalFlip()

> **enableHorizontalFlip**(`enable`): `void`

#### Parameters

• **enable**: `boolean`

#### Returns

`void`

#### Source

[avplayer/AVPlayer.ts:1711](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avplayer/AVPlayer.ts#L1711)

***

### enableVerticalFlip()

> **enableVerticalFlip**(`enable`): `void`

#### Parameters

• **enable**: `boolean`

#### Returns

`void`

#### Source

[avplayer/AVPlayer.ts:1722](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avplayer/AVPlayer.ts#L1722)

***

### enterFullscreen()

> **enterFullscreen**(): `void`

全屏

#### Returns

`void`

#### Source

[avplayer/AVPlayer.ts:1789](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avplayer/AVPlayer.ts#L1789)

***

### exitFullscreen()

> **exitFullscreen**(): `void`

退出全屏

#### Returns

`void`

#### Source

[avplayer/AVPlayer.ts:1809](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avplayer/AVPlayer.ts#L1809)

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

[avplayer/AVPlayer.ts:1766](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avplayer/AVPlayer.ts#L1766)

***

### getDuration()

> **getDuration**(): `bigint`

获取总时长（毫秒）

#### Returns

`bigint`

#### Source

[avplayer/AVPlayer.ts:1434](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avplayer/AVPlayer.ts#L1434)

***

### getPlaybackRate()

> **getPlaybackRate**(): `double`

获取倍数值

#### Returns

`double`

#### Source

[avplayer/AVPlayer.ts:1568](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avplayer/AVPlayer.ts#L1568)

***

### getRenderMode()

> **getRenderMode**(): `RenderMode`

获取渲染模式

#### Returns

`RenderMode`

#### Source

[avplayer/AVPlayer.ts:1658](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avplayer/AVPlayer.ts#L1658)

***

### getStats()

> **getStats**(): `default`

#### Returns

`default`

#### Source

[avplayer/AVPlayer.ts:1842](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avplayer/AVPlayer.ts#L1842)

***

### getStreams()

> **getStreams**(): [`AVStreamInterface`](../../../avpipeline/DemuxPipeline/interfaces/AVStreamInterface.md)[]

#### Returns

[`AVStreamInterface`](../../../avpipeline/DemuxPipeline/interfaces/AVStreamInterface.md)[]

#### Source

[avplayer/AVPlayer.ts:1425](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avplayer/AVPlayer.ts#L1425)

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

[avplayer/AVPlayer.ts:1770](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avplayer/AVPlayer.ts#L1770)

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

[avplayer/AVPlayer.ts:1762](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avplayer/AVPlayer.ts#L1762)

***

### getVolume()

> **getVolume**(): `double`

获取播放音量

#### Returns

`double`

#### Source

[avplayer/AVPlayer.ts:1614](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avplayer/AVPlayer.ts#L1614)

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

[avplayer/AVPlayer.ts:1758](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avplayer/AVPlayer.ts#L1758)

***

### load()

> **load**(`source`): `Promise`\<`void`\>

#### Parameters

• **source**: `string` \| `File`

#### Returns

`Promise`\<`void`\>

#### Source

[avplayer/AVPlayer.ts:488](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avplayer/AVPlayer.ts#L488)

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

[avplayer/AVPlayer.ts:1888](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avplayer/AVPlayer.ts#L1888)

***

### onCanvasUpdated()

> **onCanvasUpdated**(): `void`

#### Returns

`void`

#### Implementation of

`ControllerObserver.onCanvasUpdated`

#### Source

[avplayer/AVPlayer.ts:1893](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avplayer/AVPlayer.ts#L1893)

***

### onFirstAudioRendered()

> **onFirstAudioRendered**(): `void`

#### Returns

`void`

#### Source

[avplayer/AVPlayer.ts:1908](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avplayer/AVPlayer.ts#L1908)

***

### onFirstVideoRendered()

> **onFirstVideoRendered**(): `void`

#### Returns

`void`

#### Implementation of

`ControllerObserver.onFirstVideoRendered`

#### Source

[avplayer/AVPlayer.ts:1903](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avplayer/AVPlayer.ts#L1903)

***

### onFirstVideoRenderedAfterUpdateCanvas()

> **onFirstVideoRenderedAfterUpdateCanvas**(): `void`

#### Returns

`void`

#### Implementation of

`ControllerObserver.onFirstVideoRenderedAfterUpdateCanvas`

#### Source

[avplayer/AVPlayer.ts:1917](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avplayer/AVPlayer.ts#L1917)

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

[avplayer/AVPlayer.ts:1932](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avplayer/AVPlayer.ts#L1932)

***

### onStutter()

> **onStutter**(): `void`

#### Returns

`void`

#### Source

[avplayer/AVPlayer.ts:1913](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avplayer/AVPlayer.ts#L1913)

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

[avplayer/AVPlayer.ts:1928](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avplayer/AVPlayer.ts#L1928)

***

### onVideoEnded()

> **onVideoEnded**(): `void`

#### Returns

`void`

#### Implementation of

`ControllerObserver.onVideoEnded`

#### Source

[avplayer/AVPlayer.ts:1883](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avplayer/AVPlayer.ts#L1883)

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

[avplayer/AVPlayer.ts:1254](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avplayer/AVPlayer.ts#L1254)

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

[avplayer/AVPlayer.ts:729](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avplayer/AVPlayer.ts#L729)

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

[avplayer/AVPlayer.ts:1751](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avplayer/AVPlayer.ts#L1751)

***

### resume()

> **resume**(): `Promise`\<`void`\>

resume 音频

#### Returns

`Promise`\<`void`\>

#### Source

[avplayer/AVPlayer.ts:1575](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avplayer/AVPlayer.ts#L1575)

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

[avplayer/AVPlayer.ts:1305](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avplayer/AVPlayer.ts#L1305)

***

### selectAudio()

> **selectAudio**(`index`): `Promise`\<`void`\>

#### Parameters

• **index**: `number`

#### Returns

`Promise`\<`void`\>

#### Source

[avplayer/AVPlayer.ts:1778](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avplayer/AVPlayer.ts#L1778)

***

### selectSubtitle()

> **selectSubtitle**(`index`): `Promise`\<`void`\>

#### Parameters

• **index**: `number`

#### Returns

`Promise`\<`void`\>

#### Source

[avplayer/AVPlayer.ts:1782](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avplayer/AVPlayer.ts#L1782)

***

### selectVideo()

> **selectVideo**(`index`): `Promise`\<`void`\>

#### Parameters

• **index**: `number`

#### Returns

`Promise`\<`void`\>

#### Source

[avplayer/AVPlayer.ts:1774](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avplayer/AVPlayer.ts#L1774)

***

### setLoop()

> **setLoop**(`enable`): `void`

设置是否循环播放

#### Parameters

• **enable**: `boolean`

#### Returns

`void`

#### Source

[avplayer/AVPlayer.ts:1738](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avplayer/AVPlayer.ts#L1738)

***

### setPlaybackRate()

> **setPlaybackRate**(`rate`): `void`

#### Parameters

• **rate**: `number`

#### Returns

`void`

#### Source

[avplayer/AVPlayer.ts:1539](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avplayer/AVPlayer.ts#L1539)

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

[avplayer/AVPlayer.ts:1670](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avplayer/AVPlayer.ts#L1670)

***

### setRotate()

> **setRotate**(`angle`): `void`

设置视频渲染旋转角度

#### Parameters

• **angle**: `double`

#### Returns

`void`

#### Source

[avplayer/AVPlayer.ts:1700](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avplayer/AVPlayer.ts#L1700)

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

[avplayer/AVPlayer.ts:1624](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avplayer/AVPlayer.ts#L1624)

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

[avplayer/AVPlayer.ts:1828](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avplayer/AVPlayer.ts#L1828)

***

### stop()

> **stop**(): `Promise`\<`void`\>

#### Returns

`Promise`\<`void`\>

#### Source

[avplayer/AVPlayer.ts:1455](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avplayer/AVPlayer.ts#L1455)

***

### setLogLevel()

> `static` **setLogLevel**(`level`): `void`

#### Parameters

• **level**: `number`

#### Returns

`void`

#### Source

[avplayer/AVPlayer.ts:2081](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avplayer/AVPlayer.ts#L2081)

***

### startAudioPipeline()

> `static` **startAudioPipeline**(): `Promise`\<`void`\>

#### Returns

`Promise`\<`void`\>

#### Source

[avplayer/AVPlayer.ts:1973](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avplayer/AVPlayer.ts#L1973)

***

### startDemuxPipeline()

> `static` **startDemuxPipeline**(): `Promise`\<`void`\>

#### Returns

`Promise`\<`void`\>

#### Source

[avplayer/AVPlayer.ts:1954](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avplayer/AVPlayer.ts#L1954)

***

### startMSEPipeline()

> `static` **startMSEPipeline**(): `Promise`\<`void`\>

#### Returns

`Promise`\<`void`\>

#### Source

[avplayer/AVPlayer.ts:2018](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avplayer/AVPlayer.ts#L2018)

***

### startPipelines()

> `static` **startPipelines**(): `Promise`\<`void`\>

#### Returns

`Promise`\<`void`\>

#### Source

[avplayer/AVPlayer.ts:2035](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avplayer/AVPlayer.ts#L2035)

***

### startVideoRenderPipeline()

> `static` **startVideoRenderPipeline**(): `Promise`\<`void`\>

#### Returns

`Promise`\<`void`\>

#### Source

[avplayer/AVPlayer.ts:2003](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avplayer/AVPlayer.ts#L2003)

***

### stopPipelines()

> `static` **stopPipelines**(): `Promise`\<`void`\>

#### Returns

`Promise`\<`void`\>

#### Source

[avplayer/AVPlayer.ts:2043](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avplayer/AVPlayer.ts#L2043)
