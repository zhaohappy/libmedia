# 发布 @cbingb666/libmedia

在仓库根目录执行以下命令。首次构建前先运行 `npm install`。

1. 在 `npm-release.config.json` 设置本次发布的版本号。后续按此 fork 的变更递增。
2. 构建并检查 npm 包：

   ```bash
   npm run pack:avplayer
   ```

   成功后生成 `.npm-release/libmedia/` 发布目录和 `.npm-release/cbingb666-libmedia-1.3.3.tgz`。脚本检查 ESM 语法、Wasm 文件头、包名、版本及打包文件清单。
   Wasm 直接取自仓库的 `dist/decode/`、`dist/resample/`、`dist/stretchpitch/`，保留全部现有构建变体。脚本不重新编译 Wasm。

3. 发布前提交并推送对应源码，确认配置中的仓库链接可访问。
4. 登录并确认发布账号：

   ```bash
   npm login --registry=https://registry.npmjs.org/
   npm whoami --registry=https://registry.npmjs.org/
   ```

5. 发布生成的目录，按 npm 提示完成双因素验证：

   ```bash
   npm publish .npm-release/libmedia
   ```

6. 检查 registry 上的版本：

   ```bash
   npm view @cbingb666/libmedia@1.3.3 version --registry=https://registry.npmjs.org/
   ```

`pack:avplayer` 仅构建和打包，实际发布由第 5 步执行。同一个已发布的版本不能重复使用。

临时覆盖版本或 registry 时使用以下参数。这些参数不会改写配置文件：

```bash
npm run pack:avplayer -- --version=1.3.4-beta.1
npm run pack:avplayer -- --registry=https://npm.example.com/
```

发布地址保存在生成包的 `publishConfig.registry` 中。使用自建 registry 时，先登录对应地址。
稳定版本使用 `latest` 标签，预发布版本使用 `next`。

## 在其他项目中使用

```bash
npm install @cbingb666/libmedia
```

```js
import AVPlayer from '@cbingb666/libmedia'
```

此包提供浏览器使用的单文件 ESM 播放器。当前不提供 CommonJS、UI、其他子包入口或 TypeScript 类型声明。

包内的 `wasm/decode/`、`wasm/resample/`、`wasm/stretchpitch/` 包含播放器配套的 Wasm 资源。
使用应用自身的静态服务器时，将这些文件复制到公开目录：

```bash
mkdir -p public/libmedia-wasm
cp -R node_modules/@cbingb666/libmedia/wasm/. public/libmedia-wasm/
```

```js
const player = new AVPlayer({
  container: document.getElementById('player'),
  wasmBaseUrl: '/libmedia-wasm'
})
```

`wasmBaseUrl` 指向 `decode/`、`resample/`、`stretchpitch/` 的父级 URL。
也可使用 `https://cdn.jsdelivr.net/npm/@cbingb666/libmedia@1.3.3/wasm`，或通过 `getWasm` 指定每个资源。
请显式配置资源地址；省略时播放器仍使用上游默认地址。浏览器按需加载 Wasm，安装 npm 包本身不会部署静态文件。
包的 `wasm/*` 子路径可供构建工具解析资源。当前不包含编码器和缩放器资源。

## 同步上游后重新发布

合并上游、验证播放器后，更新 `npm-release.config.json` 中的版本，再执行打包和发布步骤。
源码中的 `@libmedia/*`、子包版本和上游发布脚本保持原样。npm 包版本独立递增；
播放器内部版本标识仍来自构建时的 Git tag。

`.npm-release/` 已加入 Git 忽略规则。每次打包会重新构建并替换发布目录。
避免执行原有的 `build/publish.sh`，其中包含丢弃未提交修改的命令。
