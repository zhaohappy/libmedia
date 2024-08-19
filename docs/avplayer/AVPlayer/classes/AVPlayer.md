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

[avplayer/AVPlayer.ts:268](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avplayer/AVPlayer.ts#L268)

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

[avplayer/AVPlayer.ts:202](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avplayer/AVPlayer.ts#L202)

***

### AudioRenderThread

> `static` **AudioRenderThread**: `Thread`\<[`AudioRenderPipeline`](../../../avpipeline/AudioRenderPipeline/classes/AudioRenderPipeline.md)\>

#### Source

[avplayer/AVPlayer.ts:203](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avplayer/AVPlayer.ts#L203)

***

### AudioThreadReady

> `static` **AudioThreadReady**: `Promise`\<`void`\>

#### Source

[avplayer/AVPlayer.ts:195](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avplayer/AVPlayer.ts#L195)

***

### DemuxThreadReady

> `static` **DemuxThreadReady**: `Promise`\<`void`\>

#### Source

[avplayer/AVPlayer.ts:194](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avplayer/AVPlayer.ts#L194)

***

### DemuxerThread

> `static` **DemuxerThread**: `Thread`\<[`DemuxPipeline`](../../../avpipeline/DemuxPipeline/classes/DemuxPipeline.md)\>

#### Source

[avplayer/AVPlayer.ts:201](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avplayer/AVPlayer.ts#L201)

***

### IOThread

> `static` **IOThread**: `Thread`\<[`IOPipeline`](../../../avpipeline/IOPipeline/classes/IOPipeline.md)\>

#### Source

[avplayer/AVPlayer.ts:200](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avplayer/AVPlayer.ts#L200)

***

### MSEThread

> `static` **MSEThread**: `Thread`\<`default`\>

#### Source

[avplayer/AVPlayer.ts:205](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avplayer/AVPlayer.ts#L205)

***

### MSEThreadReady

> `static` **MSEThreadReady**: `Promise`\<`void`\>

#### Source

[avplayer/AVPlayer.ts:197](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avplayer/AVPlayer.ts#L197)

***

### Resource

> `static` **Resource**: `Map`\<`string`, `WebAssemblyResource`\>

#### Source

[avplayer/AVPlayer.ts:208](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avplayer/AVPlayer.ts#L208)

***

### VideoRenderThread

> `static` **VideoRenderThread**: `Thread`\<[`VideoRenderPipeline`](../../../avpipeline/VideoRenderPipeline/classes/VideoRenderPipeline.md)\>

#### Source

[avplayer/AVPlayer.ts:204](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avplayer/AVPlayer.ts#L204)

***

### VideoThreadReady

> `static` **VideoThreadReady**: `Promise`\<`void`\>

#### Source

[avplayer/AVPlayer.ts:196](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avplayer/AVPlayer.ts#L196)

***

### audioContext

> `static` **audioContext**: `AudioContext`

#### Source

[avplayer/AVPlayer.ts:207](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avplayer/AVPlayer.ts#L207)

***

### level

> `static` **level**: `number` = `logger.INFO`

#### Source

[avplayer/AVPlayer.ts:192](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avplayer/AVPlayer.ts#L192)

## Accessors

### currentTime

> `get` **currentTime**(): `int64` \| `0n`

当前播放时间戳（毫秒）

#### Returns

`int64` \| `0n`

#### Source

[avplayer/AVPlayer.ts:296](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avplayer/AVPlayer.ts#L296)

## Methods

### destroy()

> **destroy**(): `Promise`\<`void`\>

销毁播放器

#### Returns

`Promise`\<`void`\>

#### Source

[avplayer/AVPlayer.ts:2587](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avplayer/AVPlayer.ts#L2587)

***

### enableHorizontalFlip()

> **enableHorizontalFlip**(`enable`): `void`

#### Parameters

• **enable**: `boolean`

#### Returns

`void`

#### Source

[avplayer/AVPlayer.ts:2190](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avplayer/AVPlayer.ts#L2190)

***

### enableVerticalFlip()

> **enableVerticalFlip**(`enable`): `void`

#### Parameters

• **enable**: `boolean`

#### Returns

`void`

#### Source

[avplayer/AVPlayer.ts:2201](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avplayer/AVPlayer.ts#L2201)

***

### enterFullscreen()

> **enterFullscreen**(): `void`

全屏

#### Returns

`void`

#### Source

[avplayer/AVPlayer.ts:2520](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avplayer/AVPlayer.ts#L2520)

***

### exitFullscreen()

> **exitFullscreen**(): `void`

退出全屏

#### Returns

`void`

#### Source

[avplayer/AVPlayer.ts:2540](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avplayer/AVPlayer.ts#L2540)

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

获取音频列表（ dash 使用）

#### Returns

`Promise`\<`object`\>

##### list

> **list**: `object`[]

##### selectedIndex

> **selectedIndex**: `number`

#### Source

[avplayer/AVPlayer.ts:2295](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avplayer/AVPlayer.ts#L2295)

***

### getChapters()

> **getChapters**(): [`AVChapter`](../../../avformat/AVFormatContext/interfaces/AVChapter.md)[]

获取章节信息

#### Returns

[`AVChapter`](../../../avformat/AVFormatContext/interfaces/AVChapter.md)[]

#### Source

[avplayer/AVPlayer.ts:1881](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avplayer/AVPlayer.ts#L1881)

***

### getDuration()

> **getDuration**(): `bigint`

获取总时长（毫秒）

#### Returns

`bigint`

#### Source

[avplayer/AVPlayer.ts:1890](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avplayer/AVPlayer.ts#L1890)

***

### getPlaybackRate()

> **getPlaybackRate**(): `double`

获取倍数值

#### Returns

`double`

#### Source

[avplayer/AVPlayer.ts:2047](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avplayer/AVPlayer.ts#L2047)

***

### getRenderMode()

> **getRenderMode**(): `RenderMode`

获取渲染模式

#### Returns

`RenderMode`

#### Source

[avplayer/AVPlayer.ts:2137](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avplayer/AVPlayer.ts#L2137)

***

### getSelectedAudioStreamId()

> **getSelectedAudioStreamId**(): `number`

获取当前选择播放的音频流 id

#### Returns

`number`

#### Source

[avplayer/AVPlayer.ts:1857](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avplayer/AVPlayer.ts#L1857)

***

### getSelectedSubtitleStreamId()

> **getSelectedSubtitleStreamId**(): `number`

获取当前选择播放的字幕流 id

#### Returns

`number`

#### Source

[avplayer/AVPlayer.ts:1869](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avplayer/AVPlayer.ts#L1869)

***

### getSelectedVideoStreamId()

> **getSelectedVideoStreamId**(): `number`

获取当前选择播放的视频流 id

#### Returns

`number`

#### Source

[avplayer/AVPlayer.ts:1845](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avplayer/AVPlayer.ts#L1845)

***

### getStats()

> **getStats**(): `default`

获取统计数据

#### Returns

`default`

#### Source

[avplayer/AVPlayer.ts:2578](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avplayer/AVPlayer.ts#L2578)

***

### getStreams()

> **getStreams**(): `object`[]

获取流信息

#### Returns

`object`[]

#### Source

[avplayer/AVPlayer.ts:1826](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avplayer/AVPlayer.ts#L1826)

***

### getSubtitleList()

> **getSubtitleList**(): `Promise`\<`object`\>

获取字幕列表（ dash 使用）

#### Returns

`Promise`\<`object`\>

##### list

> **list**: `object`[]

##### selectedIndex

> **selectedIndex**: `number`

#### Source

[avplayer/AVPlayer.ts:2304](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avplayer/AVPlayer.ts#L2304)

***

### getVideoList()

> **getVideoList**(): `Promise`\<`object`\>

获取视频列表（ dash 使用）

#### Returns

`Promise`\<`object`\>

##### list

> **list**: `object`[]

##### selectedIndex

> **selectedIndex**: `number`

#### Source

[avplayer/AVPlayer.ts:2286](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avplayer/AVPlayer.ts#L2286)

***

### getVolume()

> **getVolume**(): `double`

获取播放音量

#### Returns

`double`

#### Source

[avplayer/AVPlayer.ts:2093](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avplayer/AVPlayer.ts#L2093)

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

### isDash()

> **isDash**(): `boolean`

当前播放的源是否是 dash

#### Returns

`boolean`

#### Source

[avplayer/AVPlayer.ts:604](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avplayer/AVPlayer.ts#L604)

***

### isHls()

> **isHls**(): `boolean`

当前播放的源是否是 hls

#### Returns

`boolean`

#### Source

[avplayer/AVPlayer.ts:595](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avplayer/AVPlayer.ts#L595)

***

### isMSE()

> **isMSE**(): `boolean`

当前是否是 mse 播放模式

#### Returns

`boolean`

#### Source

[avplayer/AVPlayer.ts:2277](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avplayer/AVPlayer.ts#L2277)

***

### load()

> **load**(`source`, `externalSubtitles`): `Promise`\<`void`\>

加载媒体源，分析流信息

#### Parameters

• **source**: `string` \| `File`

媒体源，支持 url 和 文件

• **externalSubtitles**: [`ExternalSubtitle`](../interfaces/ExternalSubtitle.md)[]= `[]`

外挂字幕源

#### Returns

`Promise`\<`void`\>

#### Source

[avplayer/AVPlayer.ts:816](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avplayer/AVPlayer.ts#L816)

***

### loadExternalSubtitle()

> **loadExternalSubtitle**(`externalSubtitle`): `Promise`\<`number`\>

加载外挂字幕

#### Parameters

• **externalSubtitle**: [`ExternalSubtitle`](../interfaces/ExternalSubtitle.md)

#### Returns

`Promise`\<`number`\>

#### Source

[avplayer/AVPlayer.ts:677](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avplayer/AVPlayer.ts#L677)

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

#### on(event, listener, options)

> **on**(`event`, `listener`, `options`?): [`AVPlayer`](AVPlayer.md)

##### Parameters

• **event**: `"loading"`

• **listener**

• **options?**: `Partial`\<`EmitterOptions`\>

##### Returns

[`AVPlayer`](AVPlayer.md)

##### Overrides

`Emitter.on`

##### Source

[avplayer/AVPlayer.ts:2893](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avplayer/AVPlayer.ts#L2893)

#### on(event, listener, options)

> **on**(`event`, `listener`, `options`?): [`AVPlayer`](AVPlayer.md)

##### Parameters

• **event**: `"loaded"`

• **listener**

• **options?**: `Partial`\<`EmitterOptions`\>

##### Returns

[`AVPlayer`](AVPlayer.md)

##### Overrides

`Emitter.on`

##### Source

[avplayer/AVPlayer.ts:2894](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avplayer/AVPlayer.ts#L2894)

#### on(event, listener, options)

> **on**(`event`, `listener`, `options`?): [`AVPlayer`](AVPlayer.md)

##### Parameters

• **event**: `"playing"`

• **listener**

• **options?**: `Partial`\<`EmitterOptions`\>

##### Returns

[`AVPlayer`](AVPlayer.md)

##### Overrides

`Emitter.on`

##### Source

[avplayer/AVPlayer.ts:2895](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avplayer/AVPlayer.ts#L2895)

#### on(event, listener, options)

> **on**(`event`, `listener`, `options`?): [`AVPlayer`](AVPlayer.md)

##### Parameters

• **event**: `"played"`

• **listener**

• **options?**: `Partial`\<`EmitterOptions`\>

##### Returns

[`AVPlayer`](AVPlayer.md)

##### Overrides

`Emitter.on`

##### Source

[avplayer/AVPlayer.ts:2896](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avplayer/AVPlayer.ts#L2896)

#### on(event, listener, options)

> **on**(`event`, `listener`, `options`?): [`AVPlayer`](AVPlayer.md)

##### Parameters

• **event**: `"paused"`

• **listener**

• **options?**: `Partial`\<`EmitterOptions`\>

##### Returns

[`AVPlayer`](AVPlayer.md)

##### Overrides

`Emitter.on`

##### Source

[avplayer/AVPlayer.ts:2897](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avplayer/AVPlayer.ts#L2897)

#### on(event, listener, options)

> **on**(`event`, `listener`, `options`?): [`AVPlayer`](AVPlayer.md)

##### Parameters

• **event**: `"stopped"`

• **listener**

• **options?**: `Partial`\<`EmitterOptions`\>

##### Returns

[`AVPlayer`](AVPlayer.md)

##### Overrides

`Emitter.on`

##### Source

[avplayer/AVPlayer.ts:2898](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avplayer/AVPlayer.ts#L2898)

#### on(event, listener, options)

> **on**(`event`, `listener`, `options`?): [`AVPlayer`](AVPlayer.md)

##### Parameters

• **event**: `"ended"`

• **listener**

• **options?**: `Partial`\<`EmitterOptions`\>

##### Returns

[`AVPlayer`](AVPlayer.md)

##### Overrides

`Emitter.on`

##### Source

[avplayer/AVPlayer.ts:2899](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avplayer/AVPlayer.ts#L2899)

#### on(event, listener, options)

> **on**(`event`, `listener`, `options`?): [`AVPlayer`](AVPlayer.md)

##### Parameters

• **event**: `"seeking"`

• **listener**

• **options?**: `Partial`\<`EmitterOptions`\>

##### Returns

[`AVPlayer`](AVPlayer.md)

##### Overrides

`Emitter.on`

##### Source

[avplayer/AVPlayer.ts:2900](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avplayer/AVPlayer.ts#L2900)

#### on(event, listener, options)

> **on**(`event`, `listener`, `options`?): [`AVPlayer`](AVPlayer.md)

##### Parameters

• **event**: `"stopped"`

• **listener**

• **options?**: `Partial`\<`EmitterOptions`\>

##### Returns

[`AVPlayer`](AVPlayer.md)

##### Overrides

`Emitter.on`

##### Source

[avplayer/AVPlayer.ts:2901](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avplayer/AVPlayer.ts#L2901)

#### on(event, listener, options)

> **on**(`event`, `listener`, `options`?): [`AVPlayer`](AVPlayer.md)

##### Parameters

• **event**: `"changing"`

• **listener**

• **options?**: `Partial`\<`EmitterOptions`\>

##### Returns

[`AVPlayer`](AVPlayer.md)

##### Overrides

`Emitter.on`

##### Source

[avplayer/AVPlayer.ts:2902](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avplayer/AVPlayer.ts#L2902)

#### on(event, listener, options)

> **on**(`event`, `listener`, `options`?): [`AVPlayer`](AVPlayer.md)

##### Parameters

• **event**: `"changed"`

• **listener**

• **options?**: `Partial`\<`EmitterOptions`\>

##### Returns

[`AVPlayer`](AVPlayer.md)

##### Overrides

`Emitter.on`

##### Source

[avplayer/AVPlayer.ts:2903](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avplayer/AVPlayer.ts#L2903)

#### on(event, listener, options)

> **on**(`event`, `listener`, `options`?): [`AVPlayer`](AVPlayer.md)

##### Parameters

• **event**: `"resume"`

• **listener**

• **options?**: `Partial`\<`EmitterOptions`\>

##### Returns

[`AVPlayer`](AVPlayer.md)

##### Overrides

`Emitter.on`

##### Source

[avplayer/AVPlayer.ts:2904](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avplayer/AVPlayer.ts#L2904)

#### on(event, listener, options)

> **on**(`event`, `listener`, `options`?): [`AVPlayer`](AVPlayer.md)

##### Parameters

• **event**: `"time"`

• **listener**

• **options?**: `Partial`\<`EmitterOptions`\>

##### Returns

[`AVPlayer`](AVPlayer.md)

##### Overrides

`Emitter.on`

##### Source

[avplayer/AVPlayer.ts:2905](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avplayer/AVPlayer.ts#L2905)

#### on(event, listener, options)

> **on**(`event`, `listener`, `options`?): [`AVPlayer`](AVPlayer.md)

##### Parameters

• **event**: `"firstAudioRendered"`

• **listener**

• **options?**: `Partial`\<`EmitterOptions`\>

##### Returns

[`AVPlayer`](AVPlayer.md)

##### Overrides

`Emitter.on`

##### Source

[avplayer/AVPlayer.ts:2907](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avplayer/AVPlayer.ts#L2907)

#### on(event, listener, options)

> **on**(`event`, `listener`, `options`?): [`AVPlayer`](AVPlayer.md)

##### Parameters

• **event**: `"firstVideoRendered"`

• **listener**

• **options?**: `Partial`\<`EmitterOptions`\>

##### Returns

[`AVPlayer`](AVPlayer.md)

##### Overrides

`Emitter.on`

##### Source

[avplayer/AVPlayer.ts:2908](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avplayer/AVPlayer.ts#L2908)

#### on(event, listener, options)

> **on**(`event`, `listener`, `options`?): [`AVPlayer`](AVPlayer.md)

##### Parameters

• **event**: `"error"`

• **listener**

• **options?**: `Partial`\<`EmitterOptions`\>

##### Returns

[`AVPlayer`](AVPlayer.md)

##### Overrides

`Emitter.on`

##### Source

[avplayer/AVPlayer.ts:2910](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avplayer/AVPlayer.ts#L2910)

#### on(event, listener, options)

> **on**(`event`, `listener`, `options`?): [`AVPlayer`](AVPlayer.md)

##### Parameters

• **event**: `"timeout"`

• **listener**

• **options?**: `Partial`\<`EmitterOptions`\>

##### Returns

[`AVPlayer`](AVPlayer.md)

##### Overrides

`Emitter.on`

##### Source

[avplayer/AVPlayer.ts:2911](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avplayer/AVPlayer.ts#L2911)

***

### onAudioEnded()

`Internal`

> **onAudioEnded**(): `void`

#### Returns

`void`

#### Implementation of

`ControllerObserver.onAudioEnded`

#### Source

[avplayer/AVPlayer.ts:2635](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avplayer/AVPlayer.ts#L2635)

***

### onCanvasUpdated()

`Internal`

> **onCanvasUpdated**(): `void`

#### Returns

`void`

#### Implementation of

`ControllerObserver.onCanvasUpdated`

#### Source

[avplayer/AVPlayer.ts:2643](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avplayer/AVPlayer.ts#L2643)

***

### onFirstAudioRendered()

`Internal`

> **onFirstAudioRendered**(): `void`

#### Returns

`void`

#### Source

[avplayer/AVPlayer.ts:2671](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avplayer/AVPlayer.ts#L2671)

***

### onFirstVideoRendered()

`Internal`

> **onFirstVideoRendered**(): `void`

#### Returns

`void`

#### Implementation of

`ControllerObserver.onFirstVideoRendered`

#### Source

[avplayer/AVPlayer.ts:2663](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avplayer/AVPlayer.ts#L2663)

***

### onFirstVideoRenderedAfterUpdateCanvas()

`Internal`

> **onFirstVideoRenderedAfterUpdateCanvas**(): `void`

#### Returns

`void`

#### Implementation of

`ControllerObserver.onFirstVideoRenderedAfterUpdateCanvas`

#### Source

[avplayer/AVPlayer.ts:2686](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avplayer/AVPlayer.ts#L2686)

***

### onGetDecoderResource()

`Internal`

> **onGetDecoderResource**(`mediaType`, `codecId`): `Promise`\<`WebAssemblyResource`\>

#### Parameters

• **mediaType**: `AVMediaType`

• **codecId**: `AVCodecID`

#### Returns

`Promise`\<`WebAssemblyResource`\>

#### Implementation of

`ControllerObserver.onGetDecoderResource`

#### Source

[avplayer/AVPlayer.ts:2656](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avplayer/AVPlayer.ts#L2656)

***

### onMSESeek()

`Internal`

> **onMSESeek**(`time`): `void`

#### Parameters

• **time**: `number`

#### Returns

`void`

#### Implementation of

`ControllerObserver.onMSESeek`

#### Source

[avplayer/AVPlayer.ts:2707](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avplayer/AVPlayer.ts#L2707)

***

### onStutter()

`Internal`

> **onStutter**(): `void`

#### Returns

`void`

#### Source

[avplayer/AVPlayer.ts:2679](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avplayer/AVPlayer.ts#L2679)

***

### onTimeUpdate()

`Internal`

> **onTimeUpdate**(`pts`): `void`

#### Parameters

• **pts**: `int64`

#### Returns

`void`

#### Implementation of

`ControllerObserver.onTimeUpdate`

#### Source

[avplayer/AVPlayer.ts:2700](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avplayer/AVPlayer.ts#L2700)

***

### onVideoEnded()

`Internal`

> **onVideoEnded**(): `void`

#### Returns

`void`

#### Implementation of

`ControllerObserver.onVideoEnded`

#### Source

[avplayer/AVPlayer.ts:2627](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avplayer/AVPlayer.ts#L2627)

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

[avplayer/AVPlayer.ts:1619](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avplayer/AVPlayer.ts#L1619)

***

### play()

> **play**(`options`): `Promise`\<`void`\>

播放

#### Parameters

• **options**= `undefined`

• **options.audio?**: `boolean`

是否播放音频

• **options.subtitle?**: `boolean`

是否播放字幕

• **options.video?**: `boolean`

是否播放视频

#### Returns

`Promise`\<`void`\>

#### Source

[avplayer/AVPlayer.ts:1098](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avplayer/AVPlayer.ts#L1098)

***

### playNextFrame()

> **playNextFrame**(): `Promise`\<`void`\>

播放视频下一帧，可用于逐帧播放，暂停状态下使用（不支持 mse 模式）

#### Returns

`Promise`\<`void`\>

#### Source

[avplayer/AVPlayer.ts:2511](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avplayer/AVPlayer.ts#L2511)

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

[avplayer/AVPlayer.ts:2265](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avplayer/AVPlayer.ts#L2265)

***

### resume()

> **resume**(): `Promise`\<`void`\>

resume 音频

#### Returns

`Promise`\<`void`\>

#### Source

[avplayer/AVPlayer.ts:2054](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avplayer/AVPlayer.ts#L2054)

***

### seek()

> **seek**(`timestamp`): `Promise`\<`void`\>

跳转到指定时间戳位置播放（只支持点播）
某些文件可能不会 seek 成功

#### Parameters

• **timestamp**: `int64`

毫秒

#### Returns

`Promise`\<`void`\>

#### Source

[avplayer/AVPlayer.ts:1782](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avplayer/AVPlayer.ts#L1782)

***

### selectAudio()

> **selectAudio**(`index`): `Promise`\<`void`\>

设置播放音频轨道

#### Parameters

• **index**: `number`

#### Returns

`Promise`\<`void`\>

#### Source

[avplayer/AVPlayer.ts:2374](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avplayer/AVPlayer.ts#L2374)

***

### selectSubtitle()

> **selectSubtitle**(`index`): `Promise`\<`void`\>

设置播放字幕轨道

#### Parameters

• **index**: `number`

#### Returns

`Promise`\<`void`\>

#### Source

[avplayer/AVPlayer.ts:2440](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avplayer/AVPlayer.ts#L2440)

***

### selectVideo()

> **selectVideo**(`index`): `Promise`\<`void`\>

设置播放视频轨道

#### Parameters

• **index**: `number`

#### Returns

`Promise`\<`void`\>

#### Source

[avplayer/AVPlayer.ts:2314](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avplayer/AVPlayer.ts#L2314)

***

### setLoop()

> **setLoop**(`enable`): `void`

设置是否循环播放

#### Parameters

• **enable**: `boolean`

#### Returns

`void`

#### Source

[avplayer/AVPlayer.ts:2217](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avplayer/AVPlayer.ts#L2217)

***

### setPlaybackRate()

> **setPlaybackRate**(`rate`): `void`

#### Parameters

• **rate**: `number`

#### Returns

`void`

#### Source

[avplayer/AVPlayer.ts:2018](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avplayer/AVPlayer.ts#L2018)

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

[avplayer/AVPlayer.ts:2149](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avplayer/AVPlayer.ts#L2149)

***

### setRotate()

> **setRotate**(`angle`): `void`

设置视频渲染旋转角度

#### Parameters

• **angle**: `double`

#### Returns

`void`

#### Source

[avplayer/AVPlayer.ts:2179](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avplayer/AVPlayer.ts#L2179)

***

### setSubTitleDelay()

> **setSubTitleDelay**(`delay`): `void`

设置字幕延时（毫秒）

#### Parameters

• **delay**: `int32`

#### Returns

`void`

#### Source

[avplayer/AVPlayer.ts:2230](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avplayer/AVPlayer.ts#L2230)

***

### setSubtitleEnable()

> **setSubtitleEnable**(`enable`): `void`

设置是否开启字幕显示

#### Parameters

• **enable**: `boolean`

#### Returns

`void`

#### Source

[avplayer/AVPlayer.ts:2241](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avplayer/AVPlayer.ts#L2241)

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

[avplayer/AVPlayer.ts:2103](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avplayer/AVPlayer.ts#L2103)

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

[avplayer/AVPlayer.ts:2559](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avplayer/AVPlayer.ts#L2559)

***

### stop()

> **stop**(): `Promise`\<`void`\>

停止播放

#### Returns

`Promise`\<`void`\>

#### Source

[avplayer/AVPlayer.ts:1920](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avplayer/AVPlayer.ts#L1920)

***

### setLogLevel()

> `static` **setLogLevel**(`level`): `void`

设置日志等级

#### Parameters

• **level**: `number`

#### Returns

`void`

#### Source

[avplayer/AVPlayer.ts:2867](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avplayer/AVPlayer.ts#L2867)

***

### startAudioPipeline()

> `static` **startAudioPipeline**(): `Promise`\<`void`\>

#### Returns

`Promise`\<`void`\>

#### Source

[avplayer/AVPlayer.ts:2748](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avplayer/AVPlayer.ts#L2748)

***

### startDemuxPipeline()

> `static` **startDemuxPipeline**(): `Promise`\<`void`\>

#### Returns

`Promise`\<`void`\>

#### Source

[avplayer/AVPlayer.ts:2729](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avplayer/AVPlayer.ts#L2729)

***

### startMSEPipeline()

> `static` **startMSEPipeline**(): `Promise`\<`void`\>

#### Returns

`Promise`\<`void`\>

#### Source

[avplayer/AVPlayer.ts:2793](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avplayer/AVPlayer.ts#L2793)

***

### startPipelines()

> `static` **startPipelines**(): `Promise`\<`void`\>

提前运行所有管线

#### Returns

`Promise`\<`void`\>

#### Source

[avplayer/AVPlayer.ts:2813](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avplayer/AVPlayer.ts#L2813)

***

### startVideoRenderPipeline()

> `static` **startVideoRenderPipeline**(): `Promise`\<`void`\>

#### Returns

`Promise`\<`void`\>

#### Source

[avplayer/AVPlayer.ts:2778](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avplayer/AVPlayer.ts#L2778)

***

### stopPipelines()

> `static` **stopPipelines**(): `Promise`\<`void`\>

停止所有管线

#### Returns

`Promise`\<`void`\>

#### Source

[avplayer/AVPlayer.ts:2824](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avplayer/AVPlayer.ts#L2824)
