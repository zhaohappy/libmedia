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

[avplayer/AVPlayer.ts:197](https://github.com/zhaohappy/libmedia/blob/a88305ff5d10e91621f2d71d24c72fc85681b8f7/src/avplayer/AVPlayer.ts#L197)

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

[avplayer/AVPlayer.ts:142](https://github.com/zhaohappy/libmedia/blob/a88305ff5d10e91621f2d71d24c72fc85681b8f7/src/avplayer/AVPlayer.ts#L142)

***

### AudioRenderThread

> `static` **AudioRenderThread**: `Thread`\<[`AudioRenderPipeline`](../../../avpipeline/AudioRenderPipeline/classes/AudioRenderPipeline.md)\>

#### Source

[avplayer/AVPlayer.ts:143](https://github.com/zhaohappy/libmedia/blob/a88305ff5d10e91621f2d71d24c72fc85681b8f7/src/avplayer/AVPlayer.ts#L143)

***

### AudioThreadReady

> `static` **AudioThreadReady**: `Promise`\<`void`\>

#### Source

[avplayer/AVPlayer.ts:135](https://github.com/zhaohappy/libmedia/blob/a88305ff5d10e91621f2d71d24c72fc85681b8f7/src/avplayer/AVPlayer.ts#L135)

***

### DemuxThreadReady

> `static` **DemuxThreadReady**: `Promise`\<`void`\>

#### Source

[avplayer/AVPlayer.ts:134](https://github.com/zhaohappy/libmedia/blob/a88305ff5d10e91621f2d71d24c72fc85681b8f7/src/avplayer/AVPlayer.ts#L134)

***

### DemuxerThread

> `static` **DemuxerThread**: `Thread`\<[`DemuxPipeline`](../../../avpipeline/DemuxPipeline/classes/DemuxPipeline.md)\>

#### Source

[avplayer/AVPlayer.ts:141](https://github.com/zhaohappy/libmedia/blob/a88305ff5d10e91621f2d71d24c72fc85681b8f7/src/avplayer/AVPlayer.ts#L141)

***

### IOThread

> `static` **IOThread**: `Thread`\<[`IOPipeline`](../../../avpipeline/IOPipeline/classes/IOPipeline.md)\>

#### Source

[avplayer/AVPlayer.ts:140](https://github.com/zhaohappy/libmedia/blob/a88305ff5d10e91621f2d71d24c72fc85681b8f7/src/avplayer/AVPlayer.ts#L140)

***

### MSEThread

> `static` **MSEThread**: `Thread`\<`default`\>

#### Source

[avplayer/AVPlayer.ts:145](https://github.com/zhaohappy/libmedia/blob/a88305ff5d10e91621f2d71d24c72fc85681b8f7/src/avplayer/AVPlayer.ts#L145)

***

### MSEThreadReady

> `static` **MSEThreadReady**: `Promise`\<`void`\>

#### Source

[avplayer/AVPlayer.ts:137](https://github.com/zhaohappy/libmedia/blob/a88305ff5d10e91621f2d71d24c72fc85681b8f7/src/avplayer/AVPlayer.ts#L137)

***

### VideoRenderThread

> `static` **VideoRenderThread**: `Thread`\<[`VideoRenderPipeline`](../../../avpipeline/VideoRenderPipeline/classes/VideoRenderPipeline.md)\>

#### Source

[avplayer/AVPlayer.ts:144](https://github.com/zhaohappy/libmedia/blob/a88305ff5d10e91621f2d71d24c72fc85681b8f7/src/avplayer/AVPlayer.ts#L144)

***

### VideoThreadReady

> `static` **VideoThreadReady**: `Promise`\<`void`\>

#### Source

[avplayer/AVPlayer.ts:136](https://github.com/zhaohappy/libmedia/blob/a88305ff5d10e91621f2d71d24c72fc85681b8f7/src/avplayer/AVPlayer.ts#L136)

***

### audioContext

> `static` **audioContext**: `AudioContext`

#### Source

[avplayer/AVPlayer.ts:147](https://github.com/zhaohappy/libmedia/blob/a88305ff5d10e91621f2d71d24c72fc85681b8f7/src/avplayer/AVPlayer.ts#L147)

***

### level

> `static` **level**: `number` = `logger.INFO`

#### Source

[avplayer/AVPlayer.ts:132](https://github.com/zhaohappy/libmedia/blob/a88305ff5d10e91621f2d71d24c72fc85681b8f7/src/avplayer/AVPlayer.ts#L132)

## Methods

### destroy()

> **destroy**(): `Promise`\<`void`\>

#### Returns

`Promise`\<`void`\>

#### Source

[avplayer/AVPlayer.ts:1827](https://github.com/zhaohappy/libmedia/blob/a88305ff5d10e91621f2d71d24c72fc85681b8f7/src/avplayer/AVPlayer.ts#L1827)

***

### enableHorizontalFlip()

> **enableHorizontalFlip**(`enable`): `void`

#### Parameters

• **enable**: `boolean`

#### Returns

`void`

#### Source

[avplayer/AVPlayer.ts:1692](https://github.com/zhaohappy/libmedia/blob/a88305ff5d10e91621f2d71d24c72fc85681b8f7/src/avplayer/AVPlayer.ts#L1692)

***

### enableVerticalFlip()

> **enableVerticalFlip**(`enable`): `void`

#### Parameters

• **enable**: `boolean`

#### Returns

`void`

#### Source

[avplayer/AVPlayer.ts:1703](https://github.com/zhaohappy/libmedia/blob/a88305ff5d10e91621f2d71d24c72fc85681b8f7/src/avplayer/AVPlayer.ts#L1703)

***

### enterFullscreen()

> **enterFullscreen**(): `void`

全屏

#### Returns

`void`

#### Source

[avplayer/AVPlayer.ts:1770](https://github.com/zhaohappy/libmedia/blob/a88305ff5d10e91621f2d71d24c72fc85681b8f7/src/avplayer/AVPlayer.ts#L1770)

***

### exitFullscreen()

> **exitFullscreen**(): `void`

退出全屏

#### Returns

`void`

#### Source

[avplayer/AVPlayer.ts:1790](https://github.com/zhaohappy/libmedia/blob/a88305ff5d10e91621f2d71d24c72fc85681b8f7/src/avplayer/AVPlayer.ts#L1790)

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

[avplayer/AVPlayer.ts:1747](https://github.com/zhaohappy/libmedia/blob/a88305ff5d10e91621f2d71d24c72fc85681b8f7/src/avplayer/AVPlayer.ts#L1747)

***

### getDuration()

> **getDuration**(): `bigint`

获取总时长（毫秒）

#### Returns

`bigint`

#### Source

[avplayer/AVPlayer.ts:1415](https://github.com/zhaohappy/libmedia/blob/a88305ff5d10e91621f2d71d24c72fc85681b8f7/src/avplayer/AVPlayer.ts#L1415)

***

### getPlaybackRate()

> **getPlaybackRate**(): `double`

获取倍数值

#### Returns

`double`

#### Source

[avplayer/AVPlayer.ts:1549](https://github.com/zhaohappy/libmedia/blob/a88305ff5d10e91621f2d71d24c72fc85681b8f7/src/avplayer/AVPlayer.ts#L1549)

***

### getRenderMode()

> **getRenderMode**(): `RenderMode`

获取渲染模式

#### Returns

`RenderMode`

#### Source

[avplayer/AVPlayer.ts:1639](https://github.com/zhaohappy/libmedia/blob/a88305ff5d10e91621f2d71d24c72fc85681b8f7/src/avplayer/AVPlayer.ts#L1639)

***

### getStats()

> **getStats**(): `default`

#### Returns

`default`

#### Source

[avplayer/AVPlayer.ts:1823](https://github.com/zhaohappy/libmedia/blob/a88305ff5d10e91621f2d71d24c72fc85681b8f7/src/avplayer/AVPlayer.ts#L1823)

***

### getStreams()

> **getStreams**(): `AVStreamInterface`[]

#### Returns

`AVStreamInterface`[]

#### Source

[avplayer/AVPlayer.ts:1406](https://github.com/zhaohappy/libmedia/blob/a88305ff5d10e91621f2d71d24c72fc85681b8f7/src/avplayer/AVPlayer.ts#L1406)

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

[avplayer/AVPlayer.ts:1751](https://github.com/zhaohappy/libmedia/blob/a88305ff5d10e91621f2d71d24c72fc85681b8f7/src/avplayer/AVPlayer.ts#L1751)

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

[avplayer/AVPlayer.ts:1743](https://github.com/zhaohappy/libmedia/blob/a88305ff5d10e91621f2d71d24c72fc85681b8f7/src/avplayer/AVPlayer.ts#L1743)

***

### getVolume()

> **getVolume**(): `double`

获取播放音量

#### Returns

`double`

#### Source

[avplayer/AVPlayer.ts:1595](https://github.com/zhaohappy/libmedia/blob/a88305ff5d10e91621f2d71d24c72fc85681b8f7/src/avplayer/AVPlayer.ts#L1595)

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

[avplayer/AVPlayer.ts:1739](https://github.com/zhaohappy/libmedia/blob/a88305ff5d10e91621f2d71d24c72fc85681b8f7/src/avplayer/AVPlayer.ts#L1739)

***

### load()

> **load**(`source`): `Promise`\<`void`\>

#### Parameters

• **source**: `string` \| `File`

#### Returns

`Promise`\<`void`\>

#### Source

[avplayer/AVPlayer.ts:469](https://github.com/zhaohappy/libmedia/blob/a88305ff5d10e91621f2d71d24c72fc85681b8f7/src/avplayer/AVPlayer.ts#L469)

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

[avplayer/AVPlayer.ts:1869](https://github.com/zhaohappy/libmedia/blob/a88305ff5d10e91621f2d71d24c72fc85681b8f7/src/avplayer/AVPlayer.ts#L1869)

***

### onCanvasUpdated()

> **onCanvasUpdated**(): `void`

#### Returns

`void`

#### Implementation of

`ControllerObserver.onCanvasUpdated`

#### Source

[avplayer/AVPlayer.ts:1874](https://github.com/zhaohappy/libmedia/blob/a88305ff5d10e91621f2d71d24c72fc85681b8f7/src/avplayer/AVPlayer.ts#L1874)

***

### onFirstAudioRendered()

> **onFirstAudioRendered**(): `void`

#### Returns

`void`

#### Source

[avplayer/AVPlayer.ts:1889](https://github.com/zhaohappy/libmedia/blob/a88305ff5d10e91621f2d71d24c72fc85681b8f7/src/avplayer/AVPlayer.ts#L1889)

***

### onFirstVideoRendered()

> **onFirstVideoRendered**(): `void`

#### Returns

`void`

#### Implementation of

`ControllerObserver.onFirstVideoRendered`

#### Source

[avplayer/AVPlayer.ts:1884](https://github.com/zhaohappy/libmedia/blob/a88305ff5d10e91621f2d71d24c72fc85681b8f7/src/avplayer/AVPlayer.ts#L1884)

***

### onFirstVideoRenderedAfterUpdateCanvas()

> **onFirstVideoRenderedAfterUpdateCanvas**(): `void`

#### Returns

`void`

#### Implementation of

`ControllerObserver.onFirstVideoRenderedAfterUpdateCanvas`

#### Source

[avplayer/AVPlayer.ts:1898](https://github.com/zhaohappy/libmedia/blob/a88305ff5d10e91621f2d71d24c72fc85681b8f7/src/avplayer/AVPlayer.ts#L1898)

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

[avplayer/AVPlayer.ts:1913](https://github.com/zhaohappy/libmedia/blob/a88305ff5d10e91621f2d71d24c72fc85681b8f7/src/avplayer/AVPlayer.ts#L1913)

***

### onStutter()

> **onStutter**(): `void`

#### Returns

`void`

#### Source

[avplayer/AVPlayer.ts:1894](https://github.com/zhaohappy/libmedia/blob/a88305ff5d10e91621f2d71d24c72fc85681b8f7/src/avplayer/AVPlayer.ts#L1894)

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

[avplayer/AVPlayer.ts:1909](https://github.com/zhaohappy/libmedia/blob/a88305ff5d10e91621f2d71d24c72fc85681b8f7/src/avplayer/AVPlayer.ts#L1909)

***

### onVideoEnded()

> **onVideoEnded**(): `void`

#### Returns

`void`

#### Implementation of

`ControllerObserver.onVideoEnded`

#### Source

[avplayer/AVPlayer.ts:1864](https://github.com/zhaohappy/libmedia/blob/a88305ff5d10e91621f2d71d24c72fc85681b8f7/src/avplayer/AVPlayer.ts#L1864)

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

[avplayer/AVPlayer.ts:1235](https://github.com/zhaohappy/libmedia/blob/a88305ff5d10e91621f2d71d24c72fc85681b8f7/src/avplayer/AVPlayer.ts#L1235)

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

[avplayer/AVPlayer.ts:710](https://github.com/zhaohappy/libmedia/blob/a88305ff5d10e91621f2d71d24c72fc85681b8f7/src/avplayer/AVPlayer.ts#L710)

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

[avplayer/AVPlayer.ts:1732](https://github.com/zhaohappy/libmedia/blob/a88305ff5d10e91621f2d71d24c72fc85681b8f7/src/avplayer/AVPlayer.ts#L1732)

***

### resume()

> **resume**(): `Promise`\<`void`\>

resume 音频

#### Returns

`Promise`\<`void`\>

#### Source

[avplayer/AVPlayer.ts:1556](https://github.com/zhaohappy/libmedia/blob/a88305ff5d10e91621f2d71d24c72fc85681b8f7/src/avplayer/AVPlayer.ts#L1556)

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

[avplayer/AVPlayer.ts:1286](https://github.com/zhaohappy/libmedia/blob/a88305ff5d10e91621f2d71d24c72fc85681b8f7/src/avplayer/AVPlayer.ts#L1286)

***

### selectAudio()

> **selectAudio**(`index`): `Promise`\<`void`\>

#### Parameters

• **index**: `number`

#### Returns

`Promise`\<`void`\>

#### Source

[avplayer/AVPlayer.ts:1759](https://github.com/zhaohappy/libmedia/blob/a88305ff5d10e91621f2d71d24c72fc85681b8f7/src/avplayer/AVPlayer.ts#L1759)

***

### selectSubtitle()

> **selectSubtitle**(`index`): `Promise`\<`void`\>

#### Parameters

• **index**: `number`

#### Returns

`Promise`\<`void`\>

#### Source

[avplayer/AVPlayer.ts:1763](https://github.com/zhaohappy/libmedia/blob/a88305ff5d10e91621f2d71d24c72fc85681b8f7/src/avplayer/AVPlayer.ts#L1763)

***

### selectVideo()

> **selectVideo**(`index`): `Promise`\<`void`\>

#### Parameters

• **index**: `number`

#### Returns

`Promise`\<`void`\>

#### Source

[avplayer/AVPlayer.ts:1755](https://github.com/zhaohappy/libmedia/blob/a88305ff5d10e91621f2d71d24c72fc85681b8f7/src/avplayer/AVPlayer.ts#L1755)

***

### setLoop()

> **setLoop**(`enable`): `void`

设置是否循环播放

#### Parameters

• **enable**: `boolean`

#### Returns

`void`

#### Source

[avplayer/AVPlayer.ts:1719](https://github.com/zhaohappy/libmedia/blob/a88305ff5d10e91621f2d71d24c72fc85681b8f7/src/avplayer/AVPlayer.ts#L1719)

***

### setPlaybackRate()

> **setPlaybackRate**(`rate`): `void`

#### Parameters

• **rate**: `number`

#### Returns

`void`

#### Source

[avplayer/AVPlayer.ts:1520](https://github.com/zhaohappy/libmedia/blob/a88305ff5d10e91621f2d71d24c72fc85681b8f7/src/avplayer/AVPlayer.ts#L1520)

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

[avplayer/AVPlayer.ts:1651](https://github.com/zhaohappy/libmedia/blob/a88305ff5d10e91621f2d71d24c72fc85681b8f7/src/avplayer/AVPlayer.ts#L1651)

***

### setRotate()

> **setRotate**(`angle`): `void`

设置视频渲染旋转角度

#### Parameters

• **angle**: `double`

#### Returns

`void`

#### Source

[avplayer/AVPlayer.ts:1681](https://github.com/zhaohappy/libmedia/blob/a88305ff5d10e91621f2d71d24c72fc85681b8f7/src/avplayer/AVPlayer.ts#L1681)

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

[avplayer/AVPlayer.ts:1605](https://github.com/zhaohappy/libmedia/blob/a88305ff5d10e91621f2d71d24c72fc85681b8f7/src/avplayer/AVPlayer.ts#L1605)

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

[avplayer/AVPlayer.ts:1809](https://github.com/zhaohappy/libmedia/blob/a88305ff5d10e91621f2d71d24c72fc85681b8f7/src/avplayer/AVPlayer.ts#L1809)

***

### stop()

> **stop**(): `Promise`\<`void`\>

#### Returns

`Promise`\<`void`\>

#### Source

[avplayer/AVPlayer.ts:1436](https://github.com/zhaohappy/libmedia/blob/a88305ff5d10e91621f2d71d24c72fc85681b8f7/src/avplayer/AVPlayer.ts#L1436)

***

### setLogLevel()

> `static` **setLogLevel**(`level`): `void`

#### Parameters

• **level**: `number`

#### Returns

`void`

#### Source

[avplayer/AVPlayer.ts:2062](https://github.com/zhaohappy/libmedia/blob/a88305ff5d10e91621f2d71d24c72fc85681b8f7/src/avplayer/AVPlayer.ts#L2062)

***

### startAudioPipeline()

> `static` **startAudioPipeline**(): `Promise`\<`void`\>

#### Returns

`Promise`\<`void`\>

#### Source

[avplayer/AVPlayer.ts:1954](https://github.com/zhaohappy/libmedia/blob/a88305ff5d10e91621f2d71d24c72fc85681b8f7/src/avplayer/AVPlayer.ts#L1954)

***

### startDemuxPipeline()

> `static` **startDemuxPipeline**(): `Promise`\<`void`\>

#### Returns

`Promise`\<`void`\>

#### Source

[avplayer/AVPlayer.ts:1935](https://github.com/zhaohappy/libmedia/blob/a88305ff5d10e91621f2d71d24c72fc85681b8f7/src/avplayer/AVPlayer.ts#L1935)

***

### startMSEPipeline()

> `static` **startMSEPipeline**(): `Promise`\<`void`\>

#### Returns

`Promise`\<`void`\>

#### Source

[avplayer/AVPlayer.ts:1999](https://github.com/zhaohappy/libmedia/blob/a88305ff5d10e91621f2d71d24c72fc85681b8f7/src/avplayer/AVPlayer.ts#L1999)

***

### startPipelines()

> `static` **startPipelines**(): `Promise`\<`void`\>

#### Returns

`Promise`\<`void`\>

#### Source

[avplayer/AVPlayer.ts:2016](https://github.com/zhaohappy/libmedia/blob/a88305ff5d10e91621f2d71d24c72fc85681b8f7/src/avplayer/AVPlayer.ts#L2016)

***

### startVideoRenderPipeline()

> `static` **startVideoRenderPipeline**(): `Promise`\<`void`\>

#### Returns

`Promise`\<`void`\>

#### Source

[avplayer/AVPlayer.ts:1984](https://github.com/zhaohappy/libmedia/blob/a88305ff5d10e91621f2d71d24c72fc85681b8f7/src/avplayer/AVPlayer.ts#L1984)

***

### stopPipelines()

> `static` **stopPipelines**(): `Promise`\<`void`\>

#### Returns

`Promise`\<`void`\>

#### Source

[avplayer/AVPlayer.ts:2024](https://github.com/zhaohappy/libmedia/blob/a88305ff5d10e91621f2d71d24c72fc85681b8f7/src/avplayer/AVPlayer.ts#L2024)
