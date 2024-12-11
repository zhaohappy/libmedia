#ifndef _LIBMEDIA_AVUTIL_PIXFMT_H_

#define _LIBMEDIA_AVUTIL_PIXFMT_H_

enum AVFieldOrder {
  AV_FIELD_UNKNOWN,
  AV_FIELD_PROGRESSIVE,
  AV_FIELD_TT,          ///< Top coded_first, top displayed first
  AV_FIELD_BB,          ///< Bottom coded first, bottom displayed first
  AV_FIELD_TB,          ///< Top coded first, bottom displayed first
  AV_FIELD_BT,          ///< Bottom coded first, top displayed first
};

/**
 * @ingroup lavc_decoding
 */
enum AVDiscard{
  /* We leave some space between them for extensions (drop some
    * keyframes for intra-only or drop just some bidir frames). */
  AVDISCARD_NONE    =-16, ///< discard nothing
  AVDISCARD_DEFAULT =  0, ///< discard useless packets like 0 size packets in avi
  AVDISCARD_NONREF  =  8, ///< discard all non reference
  AVDISCARD_BIDIR   = 16, ///< discard all bidirectional frames
  AVDISCARD_NONINTRA= 24, ///< discard all non intra frames
  AVDISCARD_NONKEY  = 32, ///< discard all frames except keyframes
  AVDISCARD_ALL     = 48, ///< discard all
};

enum AVAudioServiceType {
  AV_AUDIO_SERVICE_TYPE_MAIN              = 0,
  AV_AUDIO_SERVICE_TYPE_EFFECTS           = 1,
  AV_AUDIO_SERVICE_TYPE_VISUALLY_IMPAIRED = 2,
  AV_AUDIO_SERVICE_TYPE_HEARING_IMPAIRED  = 3,
  AV_AUDIO_SERVICE_TYPE_DIALOGUE          = 4,
  AV_AUDIO_SERVICE_TYPE_COMMENTARY        = 5,
  AV_AUDIO_SERVICE_TYPE_EMERGENCY         = 6,
  AV_AUDIO_SERVICE_TYPE_VOICE_OVER        = 7,
  AV_AUDIO_SERVICE_TYPE_KARAOKE           = 8,
  AV_AUDIO_SERVICE_TYPE_NB                   , ///< Not part of ABI
};

/**
  * Chromaticity coordinates of the source primaries.
  * These values match the ones defined by ISO/IEC 23091-2_2019 subclause 8.1 and ITU-T H.273.
  */
enum AVColorPrimaries {
  AVCOL_PRI_RESERVED0   = 0,
  AVCOL_PRI_BT709       = 1,  ///< also ITU-R BT1361 / IEC 61966-2-4 / SMPTE RP 177 Annex B
  AVCOL_PRI_UNSPECIFIED = 2,
  AVCOL_PRI_RESERVED    = 3,
  AVCOL_PRI_BT470M      = 4,  ///< also FCC Title 47 Code of Federal Regulations 73.682 (a)(20)

  AVCOL_PRI_BT470BG     = 5,  ///< also ITU-R BT601-6 625 / ITU-R BT1358 625 / ITU-R BT1700 625 PAL & SECAM
  AVCOL_PRI_SMPTE170M   = 6,  ///< also ITU-R BT601-6 525 / ITU-R BT1358 525 / ITU-R BT1700 NTSC
  AVCOL_PRI_SMPTE240M   = 7,  ///< identical to above, also called "SMPTE C" even though it uses D65
  AVCOL_PRI_FILM        = 8,  ///< colour filters using Illuminant C
  AVCOL_PRI_BT2020      = 9,  ///< ITU-R BT2020
  AVCOL_PRI_SMPTE428    = 10, ///< SMPTE ST 428-1 (CIE 1931 XYZ)
  AVCOL_PRI_SMPTEST428_1 = AVCOL_PRI_SMPTE428,
  AVCOL_PRI_SMPTE431    = 11, ///< SMPTE ST 431-2 (2011) / DCI P3
  AVCOL_PRI_SMPTE432    = 12, ///< SMPTE ST 432-1 (2010) / P3 D65 / Display P3
  AVCOL_PRI_EBU3213     = 22, ///< EBU Tech. 3213-E (nothing there) / one of JEDEC P22 group phosphors
  AVCOL_PRI_JEDEC_P22   = AVCOL_PRI_EBU3213,
  AVCOL_PRI_NB                ///< Not part of ABI
};

/**
 * Color Transfer Characteristic.
 * These values match the ones defined by ISO/IEC 23091-2_2019 subclause 8.2.
 */
enum AVColorTransferCharacteristic {
  AVCOL_TRC_RESERVED0    = 0,
  AVCOL_TRC_BT709        = 1,  ///< also ITU-R BT1361
  AVCOL_TRC_UNSPECIFIED  = 2,
  AVCOL_TRC_RESERVED     = 3,
  AVCOL_TRC_GAMMA22      = 4,  ///< also ITU-R BT470M / ITU-R BT1700 625 PAL & SECAM
  AVCOL_TRC_GAMMA28      = 5,  ///< also ITU-R BT470BG
  AVCOL_TRC_SMPTE170M    = 6,  ///< also ITU-R BT601-6 525 or 625 / ITU-R BT1358 525 or 625 / ITU-R BT1700 NTSC
  AVCOL_TRC_SMPTE240M    = 7,
  AVCOL_TRC_LINEAR       = 8,  ///< "Linear transfer characteristics"
  AVCOL_TRC_LOG          = 9,  ///< "Logarithmic transfer characteristic (100:1 range)"
  AVCOL_TRC_LOG_SQRT     = 10, ///< "Logarithmic transfer characteristic (100 * Sqrt(10) : 1 range)"
  AVCOL_TRC_IEC61966_2_4 = 11, ///< IEC 61966-2-4
  AVCOL_TRC_BT1361_ECG   = 12, ///< ITU-R BT1361 Extended Colour Gamut
  AVCOL_TRC_IEC61966_2_1 = 13, ///< IEC 61966-2-1 (sRGB or sYCC)
  AVCOL_TRC_BT2020_10    = 14, ///< ITU-R BT2020 for 10-bit system
  AVCOL_TRC_BT2020_12    = 15, ///< ITU-R BT2020 for 12-bit system
  AVCOL_TRC_SMPTE2084    = 16, ///< SMPTE ST 2084 for 10-, 12-, 14- and 16-bit systems
  AVCOL_TRC_SMPTEST2084  = AVCOL_TRC_SMPTE2084,
  AVCOL_TRC_SMPTE428     = 17, ///< SMPTE ST 428-1
  AVCOL_TRC_SMPTEST428_1 = AVCOL_TRC_SMPTE428,
  AVCOL_TRC_ARIB_STD_B67 = 18, ///< ARIB STD-B67, known as "Hybrid log-gamma"
  AVCOL_TRC_NB                 ///< Not part of ABI
};

/**
 * YUV colorspace type.
 * These values match the ones defined by ISO/IEC 23091-2_2019 subclause 8.3.
 */
enum AVColorSpace {
  AVCOL_SPC_RGB         = 0,  ///< order of coefficients is actually GBR, also IEC 61966-2-1 (sRGB), YZX and ST 428-1
  AVCOL_SPC_BT709       = 1,  ///< also ITU-R BT1361 / IEC 61966-2-4 xvYCC709 / derived in SMPTE RP 177 Annex B
  AVCOL_SPC_UNSPECIFIED = 2,
  AVCOL_SPC_RESERVED    = 3,  ///< reserved for future use by ITU-T and ISO/IEC just like 15-255 are
  AVCOL_SPC_FCC         = 4,  ///< FCC Title 47 Code of Federal Regulations 73.682 (a)(20)
  AVCOL_SPC_BT470BG     = 5,  ///< also ITU-R BT601-6 625 / ITU-R BT1358 625 / ITU-R BT1700 625 PAL & SECAM / IEC 61966-2-4 xvYCC601
  AVCOL_SPC_SMPTE170M   = 6,  ///< also ITU-R BT601-6 525 / ITU-R BT1358 525 / ITU-R BT1700 NTSC / functionally identical to above
  AVCOL_SPC_SMPTE240M   = 7,  ///< derived from 170M primaries and D65 white point, 170M is derived from BT470 System M's primaries
  AVCOL_SPC_YCGCO       = 8,  ///< used by Dirac / VC-2 and H.264 FRext, see ITU-T SG16
  AVCOL_SPC_YCOCG       = AVCOL_SPC_YCGCO,
  AVCOL_SPC_BT2020_NCL  = 9,  ///< ITU-R BT2020 non-constant luminance system
  AVCOL_SPC_BT2020_CL   = 10, ///< ITU-R BT2020 constant luminance system
  AVCOL_SPC_SMPTE2085   = 11, ///< SMPTE 2085, Y'D'zD'x
  AVCOL_SPC_CHROMA_DERIVED_NCL = 12, ///< Chromaticity-derived non-constant luminance system
  AVCOL_SPC_CHROMA_DERIVED_CL = 13, ///< Chromaticity-derived constant luminance system
  AVCOL_SPC_ICTCP       = 14, ///< ITU-R BT.2100-0, ICtCp
  AVCOL_SPC_NB                ///< Not part of ABI
};

/**
 * Visual content value range.
 *
 * These values are based on definitions that can be found in multiple
 * specifications, such as ITU-T BT.709 (3.4 - Quantization of RGB, luminance
 * and colour-difference signals), ITU-T BT.2020 (Table 5 - Digital
 * Representation) as well as ITU-T BT.2100 (Table 9 - Digital 10- and 12-bit
 * integer representation). At the time of writing, the BT.2100 one is
 * recommended, as it also defines the full range representation.
 *
 * Common definitions:
 *   - For RGB and luma planes such as Y in YCbCr and I in ICtCp,
 *     'E' is the original value in range of 0.0 to 1.0.
 *   - For chroma planes such as Cb,Cr and Ct,Cp, 'E' is the original
 *     value in range of -0.5 to 0.5.
 *   - 'n' is the output bit depth.
 *   - For additional definitions such as rounding and clipping to valid n
 *     bit unsigned integer range, please refer to BT.2100 (Table 9).
 */
enum AVColorRange {
  AVCOL_RANGE_UNSPECIFIED = 0,

  /**
   * Narrow or limited range content.
   *
   * - For luma planes:
   *
   *       (219 * E + 16) * 2^(n-8)
   *
   *   F.ex. the range of 16-235 for 8 bits
   *
   * - For chroma planes:
   *
   *       (224 * E + 128) * 2^(n-8)
   *
   *   F.ex. the range of 16-240 for 8 bits
   */
  AVCOL_RANGE_MPEG        = 1,

  /**
   * Full range content.
   *
   * - For RGB and luma planes:
   *
   *       (2^n - 1) * E
   *
   *   F.ex. the range of 0-255 for 8 bits
   *
   * - For chroma planes:
   *
   *       (2^n - 1) * E + 2^(n - 1)
   *
   *   F.ex. the range of 1-255 for 8 bits
   */
  AVCOL_RANGE_JPEG        = 2,
  AVCOL_RANGE_NB               ///< Not part of ABI
};

/**
 * Location of chroma samples.
 *
 * Illustration showing the location of the first (top left) chroma sample of the
 * image, the left shows only luma, the right
 * shows the location of the chroma sample, the 2 could be imagined to overlay
 * each other but are drawn separately due to limitations of ASCII
 *
 *                1st 2nd       1st 2nd horizontal luma sample positions
 *                 v   v         v   v
 *                 ______        ______
 *1st luma line > |X   X ...    |3 4 X ...     X are luma samples,
 *                |             |1 2           1-6 are possible chroma positions
 *2nd luma line > |X   X ...    |5 6 X ...     0 is undefined/unknown position
 */
enum AVChromaLocation {
  AVCHROMA_LOC_UNSPECIFIED = 0,
  AVCHROMA_LOC_LEFT        = 1, ///< MPEG-2/4 4:2:0, H.264 default for 4:2:0
  AVCHROMA_LOC_CENTER      = 2, ///< MPEG-1 4:2:0, JPEG 4:2:0, H.263 4:2:0
  AVCHROMA_LOC_TOPLEFT     = 3, ///< ITU-R 601, SMPTE 274M 296M S314M(DV 4:1:1), mpeg2 4:2:2
  AVCHROMA_LOC_TOP         = 4,
  AVCHROMA_LOC_BOTTOMLEFT  = 5,
  AVCHROMA_LOC_BOTTOM      = 6,
  AVCHROMA_LOC_NB               ///< Not part of ABI
};

#endif