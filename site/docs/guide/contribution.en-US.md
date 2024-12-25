---
nav:
  title: Guide
  order: 2
group:
  title: Other
  order: 3
order: 1
---

# Contribute

libmedia welcomes contributions of features, bugfixes, documentation, test cases, etc.

## run project

```shell

# Clone the project and all submodules
git clone git@github.com:zhaohappy/libmedia.git --recursive

# enter libmedia directory
cd libmedia

# Install dependencies
npm install

# Compile AVPlayer with development mode
npm run build-avplayer-dev

# Compile AVTranscoder with development mode
npm run build-avtranscoder-dev

# Start local http service
# Any http service will do. If it reports that edp cannot be found, you can install it globally use: npm install edp -g
edp webserver start --port=9000

# use browser access http://localhost:9000/test/avplayer.html

```

## Coding Style

This project uses eslint for code style checking. Please be sure to run eslint to check whether the changes comply with the code style before submitting.

```shell
# Check Code Style
npm run eslint-check

# Automatically revise non-compliant code
# If automatic revise is not possible, please revise it manually
npm run eslint-fix
```

## Commit Style

Commit message Style use [Angular's commit convention](https://github.com/conventional-changelog/conventional-changelog/tree/master/packages/conventional-changelog-angular).
