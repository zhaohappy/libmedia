目前 src 目录下子目录中的 package.json 仅用于发布 npm 包，根目录中的 package.json 和 webpack.config.js 用于编译和测试。下面是现在发布 npm 包的步骤，如果需要发布到你的私有 npm 仓库，可以参考：

1. 执行```node scripts/update-version.js --feature```更新所有子目录中 package.json 的版本，提交更改，并使用 git tag 打上相同的版本号。

2. 执行```node scripts/build-package.js --package=all```编译所有包，此步骤会在各子目录的 dist 目录中生成要发布的文件。

3. 执行```node scripts/update-dependencies.js```更新所有包在 package.json 中声明的依赖包版本，即把 workspace:* 替换成真实版本。
4. 执行 ``sh ./build/publish.sh`` 将所有包推送到 npm 仓库。执行前，你可以先使用 npm 登录到你的私有仓库。


Currently, the package.json in the subdirectory under the src directory is only used to publish npm packages. The package.json and webpack.config.js in the root directory are used for compilation and testing. The following is the steps of publishing npm packages now. If you need to publish to your private npm repository, you can refer to it:

1. Execute ```node scripts/update-version.js --feature``` to update the version of package.json in all subdirectories, commit the changes, and use git tag them with the same version.
2. Execute ```node scripts/build-package.js --package=all``` to compile all packages. This step will generate the files to be published in the dist directory of each subdirectory.
3. Execute ```node scripts/update-dependencies.js``` to update the dependency package versions declared in package.json for all packages, that is, replace workspace:* with the real version.
4. Execute ```sh ./build/publish.sh``` to push all packages to the npm repository. You can use npm to login to your private repository before executing.