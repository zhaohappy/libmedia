
### 介绍

libmedia 播放器实现


### 开源协议

[LGPL-3.0-or-later](https://opensource.org/license/lgpl-3-0)

版权所有 (C) 2024-现在 赵高兴

Copyright (C) 2024-present, Gaoxing Zhao

### ISO 光盘镜像

`load()` 支持本地 `File` 和 HTTP(S) ISO 镜像，扩展名忽略大小写。网络服务器必须支持字节范围请求，返回正确的 `206`、`Content-Range` 和总长度；跨域服务还需要暴露这些响应头。沿用 `http.headers`、`http.credentials` 等配置。无后缀链接使用 `ext: 'iso'`。

```ts
// source 为 File 或 URL；如需鉴权，在同一个 options 中配置 http。
const options = { ext: 'iso' }
await player.load(source, options)
const disc = player.getDiscInfo()
// disc: { type: 'bluray' | 'dvd', titleId, titles: [{ id, name, duration, chapterCount }] }
// duration 为毫秒 bigint；未加载光盘时返回 null。
await player.play()

// 指定另一标题：保留原加载配置，重新加载同一来源，然后播放。
const nextTitle = disc?.titles.find((title) => title.id !== disc.titleId)
if (nextTitle) {
  await player.load(source, { ...options, iso: { titleId: nextTitle.id } })
  await player.play()
}
```

跨域响应应包含 `Access-Control-Allow-Origin`，并通过 `Access-Control-Expose-Headers: Content-Range, Content-Length, Accept-Ranges` 暴露范围和长度信息；如触发预检，还需允许 `Range` 和调用方使用的请求头。携带凭据时应返回具体来源及 `Access-Control-Allow-Credentials: true`。Range 数据必须保持原始字节，不能使用 gzip/br 等内容编码。缺少 Range 能力、无效标题、损坏或不支持的结构会报错，调用方应捕获 `load()`/`play()` 的拒绝并处理播放器 `error` 事件。

蓝光 ID 是五位播放列表编号（例如 `00000`），DVD ID 是从 1 开始的标题编号字符串。默认对完全相同的播放序列去重，选择时长最长的标题；同长按编号升序。此规则无法保证识别所有多版本光盘的正片，可通过 API 指定标题。章节复用 `getChapters()`。

读取层支持 ISO9660、UDF 1.02 和 UDF 2.50/2.60 的物理/元数据分区、非连续文件区段和分配描述符续链。数据按需读取，单次范围请求不超过 1 MiB，数据缓存上限 4 MiB；单个目录或导航文件限 16 MiB。不支持 UDF 虚拟/可重映射分区及稀疏文件。

播放范围是未加密的蓝光 MPLS 标题和 DVD 单 PGC 标题及可解析的确定性导航路径。支持多个 M2TS、同一 M2TS 内不同 STC 时间段、多个 VOB/Cell、入出点裁剪和索引跳转。多角度蓝光使用第一角度；DVD 交错角度单元、随机/多 PGC 标题、标题静止画面、交互式菜单、BD-J 和解密不在当前支持范围。不扫描最大文件作为替代，也不回退到整盘下载。轨道布局或编码类型跨片段变化会明确报错。

ISO 使用解码/渲染管线播放，以便保留关键帧预滚并抑制范围外画面。音视频编码和字幕支持取决于现有解码器；本功能没有增加图形字幕渲染器。构建开关为 `ENABLE_DEMUXER_ISO`。

DVD 导航会执行已支持的寄存器赋值、算术/位运算、条件比较、Goto/Break，以及标题内 Program/Cell/章节跳转。前置和 Cell 命令调用菜单时，会执行菜单的前后置命令，从 NAV/PCI 读取默认按钮命令并继续解析回标题的路径；不显示菜单画面。默认按钮按强制激活、强制选择、当前高亮、按钮 1 的顺序选择，菜单语言采用第一个语言单元。标题末尾返回菜单或转入另一标题视为当前标题结束。

每次加载都重新初始化导航状态：通用寄存器为 0，已支持的系统寄存器使用确定的默认值及当前标题信息，不继承之前的播放状态。加载阶段将导航结果固定为有限片段序列，计算时长和章节；后续进度跳转直接定位该序列，不重新执行菜单或依赖上次播放留下的寄存器状态。组合指令、随机数、计时/计数器、未提供的系统寄存器，以及播放路径中的跨标题或跨标题 PGC 跳转（上述标题末尾结束行为除外）均不支持。首播域、其他 VTS 菜单、无法确定默认按钮或出口的菜单也不支持。命令循环、重复 Cell/寄存器状态及超出执行限额会明确报错，避免加载一直等待。此能力覆盖确定性标题播放，不等于完整 DVD 菜单播放器。
