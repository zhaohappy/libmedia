---
nav:
  title: Guide
  order: 2
group:
  title: Start
order: 10
---

# Use in JavaScript

In principle, you need to use TypeScript to develop with libmedia. If you must use JavaScript to develop, you need to master the skills of accessing pointer data in JavaScript, which requires you to be familiar with cheap.

## Accessing structure pointer properties

```javascript

import { mapStruct } from '@libmedia/cheap'
import { AVPacket } from '@libmedia/avutil'

// an avpacket pointer variable
let avpacket
// use mapStruct to convert the pointer into a proxy
const avpacketProxy = mapStruct(avpacket, AVPacket)
// use js to access avpacket properties
console.log(avpacketProxy.pts)

```

## Struct instance address

```javascript
import { addressof } from '@libmedia/cheap'

let stream = iformatContext.getStreamByMediaType(AVMediaType.AVMEDIA_TYPE_AUDIO)
// The instance address can be obtained by accessing the symbolStructAddress attribute of the instance
let codecpar = addressof(stream.codecpar)

```

## Structural attribute address

```javascript
import { offsetof } from '@libmedia/cheap'
import { AVPacket } from '@libmedia/avutil'

// an avpacket pointer variable
let avpacket
// get the data address under the avpacket pointer, base address + offset
const data = avpacket + offsetof(AVPacket, 'data')

```