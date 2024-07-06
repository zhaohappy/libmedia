[**libmedia**](../../../../README.md) • **Docs**

***

[libmedia](../../../../README.md) / [avutil/struct/avframe](../README.md) / AVMasteringDisplayMetadata

# Class: AVMasteringDisplayMetadata

## Constructors

### new AVMasteringDisplayMetadata()

> **new AVMasteringDisplayMetadata**(): [`AVMasteringDisplayMetadata`](AVMasteringDisplayMetadata.md)

#### Returns

[`AVMasteringDisplayMetadata`](AVMasteringDisplayMetadata.md)

## Properties

### displayPrimaries

> **displayPrimaries**: `array`\<`array`\<`Rational`, `2`\>, `3`\>

CIE 1931 xy chromaticity coords of color primaries (r, g, b order).

#### Source

[avutil/struct/avframe.ts:275](https://github.com/zhaohappy/libmedia/blob/a88305ff5d10e91621f2d71d24c72fc85681b8f7/src/avutil/struct/avframe.ts#L275)

***

### hasLuminance

> **hasLuminance**: `int32`

Flag indicating whether the luminance (min_ and max_) have been set.

#### Source

[avutil/struct/avframe.ts:295](https://github.com/zhaohappy/libmedia/blob/a88305ff5d10e91621f2d71d24c72fc85681b8f7/src/avutil/struct/avframe.ts#L295)

***

### hasPrimaries

> **hasPrimaries**: `int32`

Flag indicating whether the display primaries (and white point) are set.

#### Source

[avutil/struct/avframe.ts:291](https://github.com/zhaohappy/libmedia/blob/a88305ff5d10e91621f2d71d24c72fc85681b8f7/src/avutil/struct/avframe.ts#L291)

***

### maxLuminance

> **maxLuminance**: `Rational`

Max luminance of mastering display (cd/m^2).

#### Source

[avutil/struct/avframe.ts:287](https://github.com/zhaohappy/libmedia/blob/a88305ff5d10e91621f2d71d24c72fc85681b8f7/src/avutil/struct/avframe.ts#L287)

***

### minLuminance

> **minLuminance**: `Rational`

Min luminance of mastering display (cd/m^2).

#### Source

[avutil/struct/avframe.ts:283](https://github.com/zhaohappy/libmedia/blob/a88305ff5d10e91621f2d71d24c72fc85681b8f7/src/avutil/struct/avframe.ts#L283)

***

### whitePoint

> **whitePoint**: `array`\<`Rational`, `2`\>

CIE 1931 xy chromaticity coords of white point.

#### Source

[avutil/struct/avframe.ts:279](https://github.com/zhaohappy/libmedia/blob/a88305ff5d10e91621f2d71d24c72fc85681b8f7/src/avutil/struct/avframe.ts#L279)
