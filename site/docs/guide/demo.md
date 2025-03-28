---
nav:
  title: 指南
  order: 2
group:
  title: 开始
order: 3
---

# 跑通 Demo

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
# 任何一个 http 服务都行，若报 edp 找不到，可以全局安装: npm install edp -g
edp webserver start --port=9000

# 浏览器访问 http://localhost:9000/test/avplayer.html
# 浏览器访问 http://localhost:9000/test/avtranscoder.html

```

若要源码调试多线程 Worker 中的代码，设置 ```tsconfig.json``` 中```ENABLE_THREADS_SPLIT```宏为 ```true```并重新编译

```json
{
  "cheap": {
    "defined": {
      "ENABLE_THREADS_SPLIT": true
    }
  }
}
```

```tsconfig.json``` 还可设置其他宏来裁剪编译，你可以根据自己的需要更改相关设置，详情看 ```tsconfig.json``` -> ```cheap``` -> ```defined``` 中的配置