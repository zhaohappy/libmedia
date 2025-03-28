---
nav:
  title: 指南
  order: 2
group:
  title: 其他
  order: 3
order: 1
---

# 参与贡献

libmedia 欢迎你对功能、bugfix、文档、测试用例等作出贡献。

## 运行项目

```shell

# 克隆项目以及所有子模块
git clone https://github.com/zhaohappy/libmedia.git --recursive

# 进入 libmedia 目录
cd libmedia

# 安装依赖
npm install

# 编译 AVPlayer 开发版
npm run build-avplayer-dev

# 编译 AVTranscoder 开发版
npm run build-avtranscoder-dev

# 启动本地 http 服务
# 默认端口 8000，若要更换端口执行 npx http-server -p xxx --cors
npm run server

# 浏览器访问 http://localhost:8000/test/avplayer.html
# 浏览器访问 http://localhost:8000/test/avtranscoder.html

```

## 代码规范

本项目使用 eslint 进行代码规范检查，请务必在提交前执行 eslint 检查更改是否符合代码规范。

```shell
# 检查更新代码
npm run eslint-check

# 自动修正不符合规范的代码
# 若无法自动修正请手动修正
npm run eslint-fix
```

## Commit 规范

Commit message 格式规范请了解 [Angular's commit convention](https://github.com/conventional-changelog/conventional-changelog/tree/master/packages/conventional-changelog-angular)。
