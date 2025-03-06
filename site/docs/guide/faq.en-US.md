---
nav:
  title: Guide
  order: 2
group:
  title: Other
  order: 3
order: 2
---

# FAQ

When you encounter problems, please first check [issues](https://github.com/zhaohappy/libmedia/issues) and read the [API](../api/index.md) documentation. If you can't find the answer, then ask in
[issues](https://github.com/zhaohappy/libmedia/issues).

### Errors in projects built with vite or rollup

The reason for all this is that the esbuild or babel toolchain used by vite and rollup is not a complete Typescript compiler. There are a large number of const enum in libmedia. If we do not use const enum, too much useless code will be output. The following solutions can be used:

- Configure to use the official tsc to compile, how to configure view [Configuration](./quick-start.md#Compile).
- If it only involves the use of enum, you can use the enum values directly. The disadvantage is that the maintainability is poor, and there is a risk of changing the enum values ​​of libmedia when upgrading, will need manual alignment. If it involves access to some pointer structures, you need to use transformer compilation, then you must use tsc.
- In the ```enum.js``` file under the ```@libmedia/avutil``` package, all const enums defined in libmedia are exported centrally, and are compiled as non-const enums. You can import the required enums in this file. The disadvantage is that it will increase the size of the project compilation product.

```typescript
import { AVCodecID, AVMediaType } from '@libmedia/avutil/enum'
```

The ts code block in Vue's SFC single-file component cannot be compiled using tsc. You can put the relevant code in a separate ts file and then import it into the SFC for use.