
### 介绍

libmedia 音视频封装解封装库

### ASF 输入

支持 `.asf`、`.wmv`、`.wma`，可通过 `@libmedia/avformat/IAsfFormat` 使用解封装器，
或由 AVPlayer 自动识别。播放器源码构建默认启用 `ENABLE_DEMUXER_ASF`。
支持 WMV1/2/3、VC-1 和 WMA，包含分片重组、压缩 payload、音频交织还原和宽高比元数据。

定位优先使用 Simple Index 和已读取的关键帧索引；无可用索引时，固定长度数据包通过
包边界上的时间戳探测和局部关键帧扫描定位，变长包保留顺序扫描回退。
seek 会清空重组缓存和待输出包。标准 ASF 视频时间戳按 DTS 处理；带 DVR 呈现时间
扩展的流保留 PTS，未知 PTS 保持未知且不加入关键帧索引。

不可寻址输入仅支持顺序读取；不支持 ASF 输出、加密文件、MMS 或 WMV Image。
播放器及解码组件配置见[播放器文档](../../site/docs/guide/player.md)。

### 开源协议

[LGPL-3.0-or-later](https://opensource.org/license/lgpl-3-0)

版权所有 (C) 2024-现在 赵高兴

Copyright (C) 2024-present, Gaoxing Zhao
