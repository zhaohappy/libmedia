---
nav:
  title: 指南
  order: 2
group:
  title: 其他
  order: 3
order: 2
---

# FAQ


当遇到问题请先查询 [issues](https://github.com/zhaohappy/libmedia/issues) 和阅读 [API](../api/index.md) 文档，找不到答案再到 
[issues](https://github.com/zhaohappy/libmedia/issues) 里面提问。

### 在使用 vite 或 rollup 构建的项目中会报错

一切的原因都是因为 vite 和 rollup 使用的 esbuild 或者 babel 等工具链不是一个完整的 Typescript 编译器。libmedia 里面有大量的常量枚举，枚举太多了不使用常量枚举会输出太多无用的代码。可以有以下解决办法：

- 配置使用官方的 tsc 来编译，如何配置[查看](./quick-start.md#编译配置)
- 如果只是涉及到枚举的使用可以直接使用枚举值，缺点是维护性变差，面临升级 libmedia 枚举值改变的风险，需要手动对齐。若涉及到一些指针结构体的访问需要使用 transformer 编译则必须使用 tsc 了。
- 在 ```@libmedia/avutil``` 包下面的 ```enum.js``` 文件中集中导出了 libmedia 中定义的所有常量枚举，并且是以普通枚举进行编译的，你可以在这个文件中导入所需的枚举对象。缺点是会增加项目编译产物大小。

  ```typescript
  import { AVCodecID, AVMediaType } from '@libmedia/avutil/enum'
  ```

在 Vue 的 SFC 单文件组件中的 ts 代码块无法使用 tsc 来编译，可以将相关代码放到单独的 ts 文件中再导入到单文件组件中使用。