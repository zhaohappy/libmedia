---
nav:
  title: Guide
  order: 2
group:
  title: Code Interpretation
  order: 2
order: 2
---
# Time Base

Time base is a basic concept throughout libmedia, so you must understand it. Time base is the unit of time. The data structure of time base is [Rational](https://zhaohappy.github.io/libmedia/docs/libmedia_api/classes/avutil_struct_rational.Rational.html). It represents a fraction, where den is the denominator and num is the numerator. It represents the number of seconds a unit is. For example, we now have a timestamp 100, and the time it represents in different time bases is as follows:

- ```{num: 1, den: 1000}``` This time base represents a unit of 1/1000 second, which is 1 millisecond, so 100 is 100*1/1000 second, which is 100 milliseconds; flv uses this time base.
- ```{num: 1, den: 90000}``` This time base means that one unit is 1/90000 second, so 100 is 100*1/90000 second, which is about 1.111 milliseconds; ts stream uses this time base.
- ```{num: 666, den: 6666}``` This time base means that one unit is 666/6666 second, so 100 is 100*666/6666 second, which is about 9.991 milliseconds; of course, no one uses such a strange time base, it is just an example here.

## Time bases in different code

Libmedia stores time base data in different places, and they represent different meanings.

- The time base in [AVStream](https://zhaohappy.github.io/libmedia/docs/libmedia_api/classes/avutil_AVStream.AVStream.html) is a media encapsulation time base, which represents the time unit stored in the media file or bitstream. When decapsulating, it is automatically written by the [demux](https://zhaohappy.github.io/libmedia/docs/libmedia_api/modules/avformat_demux.html) module; when encapsulating, it is written by the user as the time unit for subsequent packages to be written into the file. It is the unit of time data such as the start time and duration below [AVStream](https://zhaohappy.github.io/libmedia/docs/libmedia_api/classes/avutil_AVStream.AVStream.html).
- The time base in [AVPacket](https://zhaohappy.github.io/libmedia/docs/libmedia_api/classes/avutil_struct_avpacket.AVPacket.html) is the time unit of dts, pts, and duration in the current [AVPacket](https://zhaohappy.github.io/libmedia/docs/libmedia_api/classes/avutil_struct_avpacket.AVPacket.html). If [AVPacket](https://zhaohappy.github.io/libmedia/docs/libmedia_api/classes/avutil_struct_avpacket.AVPacket.html) is obtained by [readAVPacket](https://zhaohappy.github.io/libmedia/docs/libmedia_api/functions/avformat_demux.readAVPacket.html) , the time base is the time base below [AVStream](https://zhaohappy.github.io/libmedia/docs/libmedia_api/classes/avutil_AVStream.AVStream.html) .
- The time base in [AVFrame](https://zhaohappy.github.io/libmedia/docs/libmedia_api/classes/avutil_struct_avframe.AVFrame.html) is the time unit of pts and duration in the current [AVFrame](https://zhaohappy.github.io/libmedia/docs/libmedia_api/classes/avutil_struct_avframe.AVFrame.html). When obtained from the decoder, the time base is the time base of the corresponding [AVPacket](https://zhaohappy.github.io/libmedia/docs/libmedia_api/classes/avutil_struct_avpacket.AVPacket.html).
- The time base in the encoder is the time base in the output [AVPacket](https://zhaohappy.github.io/libmedia/docs/libmedia_api/classes/avutil_struct_avpacket.AVPacket.html). When creating an encoder, you need to pass in a time base, which means that the [AVPacket](https://zhaohappy.github.io/libmedia/docs/libmedia_api/classes/avutil_struct_avpacket.AVPacket.html) output by the encoder after encoding uses this time base.
- The time base in [VideoFrame](https://developer.mozilla.org/en-US/docs/Web/API/VideoFrame) is microseconds in the Web standard, that is, ```{num: 1, den: 1000000}```. If you use [WebVideoDecoder](https://zhaohappy.github.io/libmedia/docs/libmedia_api/classes/avcodec_webcodec_VideoDecoder.WebVideoDecoder.html) to decode [VideoFrame](https://developer.mozilla.org/en-US/docs/Web/API/VideoFrame), no matter what time base the input AVPacket is, the decoded VideoFrame is uniformly converted to the microsecond time base, which is consistent with the Web standard.
- The time base in [AudioData](https://developer.mozilla.org/en-US/docs/Web/API/AudioData) is microseconds in the Web standard, that is, ```{num: 1, den: 1000000}```. If you use [WebAudioDecoder](https://zhaohappy.github.io/libmedia/docs/libmedia_api/classes/avcodec_webcodec_AudioDecoder.WebAudioDecoder.html) to decode [AudioData](https://developer.mozilla.org/en-US/docs/Web/API/AudioData), the output unit is naturally the microsecond time base. For [AudioDecoder](https://developer.mozilla.org/en-US/docs/Web/API/AudioDecoder), it does not care about the input time unit, and will recalculate it according to the number of samples.

## Time base 

libmedia provides [avRescaleQ](https://zhaohappy.github.io/libmedia/docs/libmedia_api/functions/avutil_util_rational.avRescaleQ.html) and [avRescaleQ2](https://zhaohappy.github.io/libmedia/docs/libmedia_api/functions/avutil_util_rational.avRescaleQ2.html) methods to convert time. It can convert a time from one time base to another time base, which is often used in audio and video development.

```javascript
const sourceTimeBase = { num: 1, den: 90000 }
const targetTimeBase = { num: 1, den: 1000 }
const pts = avRescaleQ(100n, sourceTimeBase, targetTimeBase)
```

