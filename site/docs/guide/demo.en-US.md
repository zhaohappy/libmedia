---
nav:
  title: Guide
  order: 2
group:
  title: Start
order: 3
---

# Start Demo

```shell

# Clone the project and all submodules
git clone https://github.com/zhaohappy/libmedia.git --recursive

# Enter the libmedia directory
cd libmedia

# Install dependencies
npm install

# Compile AVPlayer development version
npm run build-avplayer-dev
# Compile AVTranscoder development version
npm run build-avtranscoder-dev

# Start local http service
# Any http service will do. If edp is not found, you can install it globally: npm install edp -g
edp webserver start --port=9000

# Browser access http://localhost:9000/test/avplayer.html
# Browser access http://localhost:9000/test/avtranscoder.html

```

To debug the code in multi-threaded Worker, set the ```ENABLE_THREADS_SPLIT``` macro in ```tsconfig.json``` to ```true``` and recompile

```json
{
"cheap": {
  "defined": {
    "ENABLE_THREADS_SPLIT": true
  }
}
}
```

```tsconfig.json``` You can also set other macros to tailor the compilation. You can change the relevant settings according to your needs. For details, see Configuration in ```tsconfig.json``` -> ```cheap``` -> ```defined```

