
/*
 * libmedia AVCodecID
 *
 * 版权所有 (C) 2024 赵高兴
 * Copyright (C) 2024 Gaoxing Zhao
 *
 * 此文件是 libmedia 的一部分
 * This file is part of libmedia.
 * 
 * libmedia 是自由软件；您可以根据 GNU Lesser General Public License（GNU LGPL）3.1
 * 或任何其更新的版本条款重新分发或修改它
 * libmedia is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; either
 * version 3.1 of the License, or (at your option) any later version.
 * 
 * libmedia 希望能够为您提供帮助，但不提供任何明示或暗示的担保，包括但不限于适销性或特定用途的保证
 * 您应自行承担使用 libmedia 的风险，并且需要遵守 GNU Lesser General Public License 中的条款和条件。
 * libmedia is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * Lesser General Public License for more details.
 *
 */

export const enum AVMediaType {
  /**
   * Usually treated as AVMEDIA_TYPE_DATA
   */
  AVMEDIA_TYPE_UNKNOWN = -1,
  AVMEDIA_TYPE_VIDEO,
  AVMEDIA_TYPE_AUDIO,
  /**
   * Opaque data information usually continuous
   */
  AVMEDIA_TYPE_DATA,
  AVMEDIA_TYPE_SUBTITLE,
  /**
   * Opaque data information usually sparse
   */
  AVMEDIA_TYPE_ATTACHMENT,
  AVMEDIA_TYPE_NB
}

export const enum AVCodecID {
  AV_CODEC_ID_NONE,

  /**
   * video codecs
   */
  AV_CODEC_ID_MPEG1VIDEO,
  /**
   * preferred ID for MPEG-1/2 video decoding
   */
  AV_CODEC_ID_MPEG2VIDEO,
  AV_CODEC_ID_H261,
  AV_CODEC_ID_H263,
  AV_CODEC_ID_RV10,
  AV_CODEC_ID_RV20,
  AV_CODEC_ID_MJPEG,
  AV_CODEC_ID_MJPEGB,
  AV_CODEC_ID_LJPEG,
  AV_CODEC_ID_SP5X,
  AV_CODEC_ID_JPEGLS,
  AV_CODEC_ID_MPEG4,
  AV_CODEC_ID_RAWVIDEO,
  AV_CODEC_ID_MSMPEG4V1,
  AV_CODEC_ID_MSMPEG4V2,
  AV_CODEC_ID_MSMPEG4V3,
  AV_CODEC_ID_WMV1,
  AV_CODEC_ID_WMV2,
  AV_CODEC_ID_H263P,
  AV_CODEC_ID_H263I,
  AV_CODEC_ID_FLV1,
  AV_CODEC_ID_SVQ1,
  AV_CODEC_ID_SVQ3,
  AV_CODEC_ID_DVVIDEO,
  AV_CODEC_ID_HUFFYUV,
  AV_CODEC_ID_CYUV,
  AV_CODEC_ID_H264,
  AV_CODEC_ID_INDEO3,
  AV_CODEC_ID_VP3,
  AV_CODEC_ID_THEORA,
  AV_CODEC_ID_ASV1,
  AV_CODEC_ID_ASV2,
  AV_CODEC_ID_FFV1,
  AV_CODEC_ID_4XM,
  AV_CODEC_ID_VCR1,
  AV_CODEC_ID_CLJR,
  AV_CODEC_ID_MDEC,
  AV_CODEC_ID_ROQ,
  AV_CODEC_ID_INTERPLAY_VIDEO,
  AV_CODEC_ID_XAN_WC3,
  AV_CODEC_ID_XAN_WC4,
  AV_CODEC_ID_RPZA,
  AV_CODEC_ID_CINEPAK,
  AV_CODEC_ID_WS_VQA,
  AV_CODEC_ID_MSRLE,
  AV_CODEC_ID_MSVIDEO1,
  AV_CODEC_ID_IDCIN,
  AV_CODEC_ID_8BPS,
  AV_CODEC_ID_SMC,
  AV_CODEC_ID_FLIC,
  AV_CODEC_ID_TRUEMOTION1,
  AV_CODEC_ID_VMDVIDEO,
  AV_CODEC_ID_MSZH,
  AV_CODEC_ID_ZLIB,
  AV_CODEC_ID_QTRLE,
  AV_CODEC_ID_TSCC,
  AV_CODEC_ID_ULTI,
  AV_CODEC_ID_QDRAW,
  AV_CODEC_ID_VIXL,
  AV_CODEC_ID_QPEG,
  AV_CODEC_ID_PNG,
  AV_CODEC_ID_PPM,
  AV_CODEC_ID_PBM,
  AV_CODEC_ID_PGM,
  AV_CODEC_ID_PGMYUV,
  AV_CODEC_ID_PAM,
  AV_CODEC_ID_FFVHUFF,
  AV_CODEC_ID_RV30,
  AV_CODEC_ID_RV40,
  AV_CODEC_ID_VC1,
  AV_CODEC_ID_WMV3,
  AV_CODEC_ID_LOCO,
  AV_CODEC_ID_WNV1,
  AV_CODEC_ID_AASC,
  AV_CODEC_ID_INDEO2,
  AV_CODEC_ID_FRAPS,
  AV_CODEC_ID_TRUEMOTION2,
  AV_CODEC_ID_BMP,
  AV_CODEC_ID_CSCD,
  AV_CODEC_ID_MMVIDEO,
  AV_CODEC_ID_ZMBV,
  AV_CODEC_ID_AVS,
  AV_CODEC_ID_SMACKVIDEO,
  AV_CODEC_ID_NUV,
  AV_CODEC_ID_KMVC,
  AV_CODEC_ID_FLASHSV,
  AV_CODEC_ID_CAVS,
  AV_CODEC_ID_JPEG2000,
  AV_CODEC_ID_VMNC,
  AV_CODEC_ID_VP5,
  AV_CODEC_ID_VP6,
  AV_CODEC_ID_VP6F,
  AV_CODEC_ID_TARGA,
  AV_CODEC_ID_DSICINVIDEO,
  AV_CODEC_ID_TIERTEXSEQVIDEO,
  AV_CODEC_ID_TIFF,
  AV_CODEC_ID_GIF,
  AV_CODEC_ID_DXA,
  AV_CODEC_ID_DNXHD,
  AV_CODEC_ID_THP,
  AV_CODEC_ID_SGI,
  AV_CODEC_ID_C93,
  AV_CODEC_ID_BETHSOFTVID,
  AV_CODEC_ID_PTX,
  AV_CODEC_ID_TXD,
  AV_CODEC_ID_VP6A,
  AV_CODEC_ID_AMV,
  AV_CODEC_ID_VB,
  AV_CODEC_ID_PCX,
  AV_CODEC_ID_SUNRAST,
  AV_CODEC_ID_INDEO4,
  AV_CODEC_ID_INDEO5,
  AV_CODEC_ID_MIMIC,
  AV_CODEC_ID_RL2,
  AV_CODEC_ID_ESCAPE124,
  AV_CODEC_ID_DIRAC,
  AV_CODEC_ID_BFI,
  AV_CODEC_ID_CMV,
  AV_CODEC_ID_MOTIONPIXELS,
  AV_CODEC_ID_TGV,
  AV_CODEC_ID_TGQ,
  AV_CODEC_ID_TQI,
  AV_CODEC_ID_AURA,
  AV_CODEC_ID_AURA2,
  AV_CODEC_ID_V210X,
  AV_CODEC_ID_TMV,
  AV_CODEC_ID_V210,
  AV_CODEC_ID_DPX,
  AV_CODEC_ID_MAD,
  AV_CODEC_ID_FRWU,
  AV_CODEC_ID_FLASHSV2,
  AV_CODEC_ID_CDGRAPHICS,
  AV_CODEC_ID_R210,
  AV_CODEC_ID_ANM,
  AV_CODEC_ID_BINKVIDEO,
  AV_CODEC_ID_IFF_ILBM,
  AV_CODEC_ID_IFF_BYTERUN1 = AV_CODEC_ID_IFF_ILBM,
  AV_CODEC_ID_KGV1,
  AV_CODEC_ID_YOP,
  AV_CODEC_ID_VP8,
  AV_CODEC_ID_PICTOR,
  AV_CODEC_ID_ANSI,
  AV_CODEC_ID_A64_MULTI,
  AV_CODEC_ID_A64_MULTI5,
  AV_CODEC_ID_R10K,
  AV_CODEC_ID_MXPEG,
  AV_CODEC_ID_LAGARITH,
  AV_CODEC_ID_PRORES,
  AV_CODEC_ID_JV,
  AV_CODEC_ID_DFA,
  AV_CODEC_ID_WMV3IMAGE,
  AV_CODEC_ID_VC1IMAGE,
  AV_CODEC_ID_UTVIDEO,
  AV_CODEC_ID_BMV_VIDEO,
  AV_CODEC_ID_VBLE,
  AV_CODEC_ID_DXTORY,
  AV_CODEC_ID_V410,
  AV_CODEC_ID_XWD,
  AV_CODEC_ID_CDXL,
  AV_CODEC_ID_XBM,
  AV_CODEC_ID_ZEROCODEC,
  AV_CODEC_ID_MSS1,
  AV_CODEC_ID_MSA1,
  AV_CODEC_ID_TSCC2,
  AV_CODEC_ID_MTS2,
  AV_CODEC_ID_CLLC,
  AV_CODEC_ID_MSS2,
  AV_CODEC_ID_VP9,
  AV_CODEC_ID_AIC,
  AV_CODEC_ID_ESCAPE130,
  AV_CODEC_ID_G2M,
  AV_CODEC_ID_WEBP,
  AV_CODEC_ID_HNM4_VIDEO,
  AV_CODEC_ID_HEVC,
  AV_CODEC_ID_H265 = AV_CODEC_ID_HEVC,
  AV_CODEC_ID_FIC,
  AV_CODEC_ID_ALIAS_PIX,
  AV_CODEC_ID_BRENDER_PIX,
  AV_CODEC_ID_PAF_VIDEO,
  AV_CODEC_ID_EXR,
  AV_CODEC_ID_VP7,
  AV_CODEC_ID_SANM,
  AV_CODEC_ID_SGIRLE,
  AV_CODEC_ID_MVC1,
  AV_CODEC_ID_MVC2,
  AV_CODEC_ID_HQX,
  AV_CODEC_ID_TDSC,
  AV_CODEC_ID_HQ_HQA,
  AV_CODEC_ID_HAP,
  AV_CODEC_ID_DDS,
  AV_CODEC_ID_DXV,
  AV_CODEC_ID_SCREENPRESSO,
  AV_CODEC_ID_RSCC,
  AV_CODEC_ID_AVS2,
  AV_CODEC_ID_PGX,
  AV_CODEC_ID_AVS3,
  AV_CODEC_ID_MSP2,
  AV_CODEC_ID_VVC,
  AV_CODEC_ID_H266 = AV_CODEC_ID_VVC,

  AV_CODEC_ID_Y41P,
  AV_CODEC_ID_AVRP,
  AV_CODEC_ID_012V,
  AV_CODEC_ID_AVUI,
  AV_CODEC_ID_TARGA_Y216,
  AV_CODEC_ID_V308,
  AV_CODEC_ID_V408,
  AV_CODEC_ID_YUV4,
  AV_CODEC_ID_AVRN,
  AV_CODEC_ID_CPIA,
  AV_CODEC_ID_XFACE,
  AV_CODEC_ID_SNOW,
  AV_CODEC_ID_SMVJPEG,
  AV_CODEC_ID_APNG,
  AV_CODEC_ID_DAALA,
  AV_CODEC_ID_CFHD,
  AV_CODEC_ID_TRUEMOTION2RT,
  AV_CODEC_ID_M101,
  AV_CODEC_ID_MAGICYUV,
  AV_CODEC_ID_SHEERVIDEO,
  AV_CODEC_ID_YLC,
  AV_CODEC_ID_PSD,
  AV_CODEC_ID_PIXLET,
  AV_CODEC_ID_SPEEDHQ,
  AV_CODEC_ID_FMVC,
  AV_CODEC_ID_SCPR,
  AV_CODEC_ID_CLEARVIDEO,
  AV_CODEC_ID_XPM,
  AV_CODEC_ID_AV1,
  AV_CODEC_ID_BITPACKED,
  AV_CODEC_ID_MSCC,
  AV_CODEC_ID_SRGC,
  AV_CODEC_ID_SVG,
  AV_CODEC_ID_GDV,
  AV_CODEC_ID_FITS,
  AV_CODEC_ID_IMM4,
  AV_CODEC_ID_PROSUMER,
  AV_CODEC_ID_MWSC,
  AV_CODEC_ID_WCMV,
  AV_CODEC_ID_RASC,
  AV_CODEC_ID_HYMT,
  AV_CODEC_ID_ARBC,
  AV_CODEC_ID_AGM,
  AV_CODEC_ID_LSCR,
  AV_CODEC_ID_VP4,
  AV_CODEC_ID_IMM5,
  AV_CODEC_ID_MVDV,
  AV_CODEC_ID_MVHA,
  AV_CODEC_ID_CDTOONS,
  AV_CODEC_ID_MV30,
  AV_CODEC_ID_NOTCHLC,
  AV_CODEC_ID_PFM,
  AV_CODEC_ID_MOBICLIP,
  AV_CODEC_ID_PHOTOCD,
  AV_CODEC_ID_IPU,
  AV_CODEC_ID_ARGO,
  AV_CODEC_ID_CRI,
  AV_CODEC_ID_SIMBIOSIS_IMX,
  AV_CODEC_ID_SGA_VIDEO,
  AV_CODEC_ID_GEM,
  AV_CODEC_ID_VBN,
  AV_CODEC_ID_JPEGXL,
  AV_CODEC_ID_QOI,
  AV_CODEC_ID_PHM,
  AV_CODEC_ID_RADIANCE_HDR,
  AV_CODEC_ID_WBMP,
  AV_CODEC_ID_MEDIA100,
  AV_CODEC_ID_VQC,
  AV_CODEC_ID_PDV,
  AV_CODEC_ID_EVC,
  AV_CODEC_ID_RTV1,
  AV_CODEC_ID_VMIX,
  AV_CODEC_ID_LEAD,

  /**
   * various PCM "codecs"
   */

  /**
   * A dummy id pointing at the start of audio codecs
   */
  AV_CODEC_ID_FIRST_AUDIO = 0x10000,
  AV_CODEC_ID_PCM_S16LE = 0x10000,
  AV_CODEC_ID_PCM_S16BE,
  AV_CODEC_ID_PCM_U16LE,
  AV_CODEC_ID_PCM_U16BE,
  AV_CODEC_ID_PCM_S8,
  AV_CODEC_ID_PCM_U8,
  AV_CODEC_ID_PCM_MULAW,
  AV_CODEC_ID_PCM_ALAW,
  AV_CODEC_ID_PCM_S32LE,
  AV_CODEC_ID_PCM_S32BE,
  AV_CODEC_ID_PCM_U32LE,
  AV_CODEC_ID_PCM_U32BE,
  AV_CODEC_ID_PCM_S24LE,
  AV_CODEC_ID_PCM_S24BE,
  AV_CODEC_ID_PCM_U24LE,
  AV_CODEC_ID_PCM_U24BE,
  AV_CODEC_ID_PCM_S24DAUD,
  AV_CODEC_ID_PCM_ZORK,
  AV_CODEC_ID_PCM_S16LE_PLANAR,
  AV_CODEC_ID_PCM_DVD,
  AV_CODEC_ID_PCM_F32BE,
  AV_CODEC_ID_PCM_F32LE,
  AV_CODEC_ID_PCM_F64BE,
  AV_CODEC_ID_PCM_F64LE,
  AV_CODEC_ID_PCM_BLURAY,
  AV_CODEC_ID_PCM_LXF,
  AV_CODEC_ID_S302M,
  AV_CODEC_ID_PCM_S8_PLANAR,
  AV_CODEC_ID_PCM_S24LE_PLANAR,
  AV_CODEC_ID_PCM_S32LE_PLANAR,
  AV_CODEC_ID_PCM_S16BE_PLANAR,
  AV_CODEC_ID_PCM_S64LE,
  AV_CODEC_ID_PCM_S64BE,
  AV_CODEC_ID_PCM_F16LE,
  AV_CODEC_ID_PCM_F24LE,
  AV_CODEC_ID_PCM_VIDC,
  AV_CODEC_ID_PCM_SGA,

  /**
   * various ADPCM codecs
   */
  AV_CODEC_ID_ADPCM_IMA_QT = 0x11000,
  AV_CODEC_ID_ADPCM_IMA_WAV,
  AV_CODEC_ID_ADPCM_IMA_DK3,
  AV_CODEC_ID_ADPCM_IMA_DK4,
  AV_CODEC_ID_ADPCM_IMA_WS,
  AV_CODEC_ID_ADPCM_IMA_SMJPEG,
  AV_CODEC_ID_ADPCM_MS,
  AV_CODEC_ID_ADPCM_4XM,
  AV_CODEC_ID_ADPCM_XA,
  AV_CODEC_ID_ADPCM_ADX,
  AV_CODEC_ID_ADPCM_EA,
  AV_CODEC_ID_ADPCM_G726,
  AV_CODEC_ID_ADPCM_CT,
  AV_CODEC_ID_ADPCM_SWF,
  AV_CODEC_ID_ADPCM_YAMAHA,
  AV_CODEC_ID_ADPCM_SBPRO_4,
  AV_CODEC_ID_ADPCM_SBPRO_3,
  AV_CODEC_ID_ADPCM_SBPRO_2,
  AV_CODEC_ID_ADPCM_THP,
  AV_CODEC_ID_ADPCM_IMA_AMV,
  AV_CODEC_ID_ADPCM_EA_R1,
  AV_CODEC_ID_ADPCM_EA_R3,
  AV_CODEC_ID_ADPCM_EA_R2,
  AV_CODEC_ID_ADPCM_IMA_EA_SEAD,
  AV_CODEC_ID_ADPCM_IMA_EA_EACS,
  AV_CODEC_ID_ADPCM_EA_XAS,
  AV_CODEC_ID_ADPCM_EA_MAXIS_XA,
  AV_CODEC_ID_ADPCM_IMA_ISS,
  AV_CODEC_ID_ADPCM_G722,
  AV_CODEC_ID_ADPCM_IMA_APC,
  AV_CODEC_ID_ADPCM_VIMA,
  AV_CODEC_ID_ADPCM_AFC,
  AV_CODEC_ID_ADPCM_IMA_OKI,
  AV_CODEC_ID_ADPCM_DTK,
  AV_CODEC_ID_ADPCM_IMA_RAD,
  AV_CODEC_ID_ADPCM_G726LE,
  AV_CODEC_ID_ADPCM_THP_LE,
  AV_CODEC_ID_ADPCM_PSX,
  AV_CODEC_ID_ADPCM_AICA,
  AV_CODEC_ID_ADPCM_IMA_DAT4,
  AV_CODEC_ID_ADPCM_MTAF,
  AV_CODEC_ID_ADPCM_AGM,
  AV_CODEC_ID_ADPCM_ARGO,
  AV_CODEC_ID_ADPCM_IMA_SSI,
  AV_CODEC_ID_ADPCM_ZORK,
  AV_CODEC_ID_ADPCM_IMA_APM,
  AV_CODEC_ID_ADPCM_IMA_ALP,
  AV_CODEC_ID_ADPCM_IMA_MTF,
  AV_CODEC_ID_ADPCM_IMA_CUNNING,
  AV_CODEC_ID_ADPCM_IMA_MOFLEX,
  AV_CODEC_ID_ADPCM_IMA_ACORN,
  AV_CODEC_ID_ADPCM_XMD,

  /**
   * AMR
   */
  AV_CODEC_ID_AMR_NB = 0x12000,
  AV_CODEC_ID_AMR_WB,

  /**
   *  RealAudio codecs
   */
  AV_CODEC_ID_RA_144 = 0x13000,
  AV_CODEC_ID_RA_288,

  /**
   * various DPCM codecs
   */
  AV_CODEC_ID_ROQ_DPCM = 0x14000,
  AV_CODEC_ID_INTERPLAY_DPCM,
  AV_CODEC_ID_XAN_DPCM,
  AV_CODEC_ID_SOL_DPCM,
  AV_CODEC_ID_SDX2_DPCM,
  AV_CODEC_ID_GREMLIN_DPCM,
  AV_CODEC_ID_DERF_DPCM,
  AV_CODEC_ID_WADY_DPCM,
  AV_CODEC_ID_CBD2_DPCM,

  /**
   * audio codecs 
   */


  AV_CODEC_ID_MP2 = 0x15000,
  /**
   * preferred ID for decoding MPEG audio layer 1, 2 or 3
   */
  AV_CODEC_ID_MP3,
  AV_CODEC_ID_AAC,
  AV_CODEC_ID_AC3,
  AV_CODEC_ID_DTS,
  AV_CODEC_ID_VORBIS,
  AV_CODEC_ID_DVAUDIO,
  AV_CODEC_ID_WMAV1,
  AV_CODEC_ID_WMAV2,
  AV_CODEC_ID_MACE3,
  AV_CODEC_ID_MACE6,
  AV_CODEC_ID_VMDAUDIO,
  AV_CODEC_ID_FLAC,
  AV_CODEC_ID_MP3ADU,
  AV_CODEC_ID_MP3ON4,
  AV_CODEC_ID_SHORTEN,
  AV_CODEC_ID_ALAC,
  AV_CODEC_ID_WESTWOOD_SND1,
  /**
   * as in Berlin toast format
   */
  AV_CODEC_ID_GSM,
  AV_CODEC_ID_QDM2,
  AV_CODEC_ID_COOK,
  AV_CODEC_ID_TRUESPEECH,
  AV_CODEC_ID_TTA,
  AV_CODEC_ID_SMACKAUDIO,
  AV_CODEC_ID_QCELP,
  AV_CODEC_ID_WAVPACK,
  AV_CODEC_ID_DSICINAUDIO,
  AV_CODEC_ID_IMC,
  AV_CODEC_ID_MUSEPACK7,
  AV_CODEC_ID_MLP,
  /**
   * as found in WAV 
   */
  AV_CODEC_ID_GSM_MS,
  AV_CODEC_ID_ATRAC3,
  AV_CODEC_ID_APE,
  AV_CODEC_ID_NELLYMOSER,
  AV_CODEC_ID_MUSEPACK8,
  AV_CODEC_ID_SPEEX,
  AV_CODEC_ID_WMAVOICE,
  AV_CODEC_ID_WMAPRO,
  AV_CODEC_ID_WMALOSSLESS,
  AV_CODEC_ID_ATRAC3P,
  AV_CODEC_ID_EAC3,
  AV_CODEC_ID_SIPR,
  AV_CODEC_ID_MP1,
  AV_CODEC_ID_TWINVQ,
  AV_CODEC_ID_TRUEHD,
  AV_CODEC_ID_MP4ALS,
  AV_CODEC_ID_ATRAC1,
  AV_CODEC_ID_BINKAUDIO_RDFT,
  AV_CODEC_ID_BINKAUDIO_DCT,
  AV_CODEC_ID_AAC_LATM,
  AV_CODEC_ID_QDMC,
  AV_CODEC_ID_CELT,
  AV_CODEC_ID_G723_1,
  AV_CODEC_ID_G729,
  AV_CODEC_ID_8SVX_EXP,
  AV_CODEC_ID_8SVX_FIB,
  AV_CODEC_ID_BMV_AUDIO,
  AV_CODEC_ID_RALF,
  AV_CODEC_ID_IAC,
  AV_CODEC_ID_ILBC,
  AV_CODEC_ID_OPUS,
  AV_CODEC_ID_COMFORT_NOISE,
  AV_CODEC_ID_TAK,
  AV_CODEC_ID_METASOUND,
  AV_CODEC_ID_PAF_AUDIO,
  AV_CODEC_ID_ON2AVC,
  AV_CODEC_ID_DSS_SP,
  AV_CODEC_ID_CODEC2,
  AV_CODEC_ID_FFWAVESYNTH,
  AV_CODEC_ID_SONIC,
  AV_CODEC_ID_SONIC_LS,
  AV_CODEC_ID_EVRC,
  AV_CODEC_ID_SMV,
  AV_CODEC_ID_DSD_LSBF,
  AV_CODEC_ID_DSD_MSBF,
  AV_CODEC_ID_DSD_LSBF_PLANAR,
  AV_CODEC_ID_DSD_MSBF_PLANAR,
  AV_CODEC_ID_4GV,
  AV_CODEC_ID_INTERPLAY_ACM,
  AV_CODEC_ID_XMA1,
  AV_CODEC_ID_XMA2,
  AV_CODEC_ID_DST,
  AV_CODEC_ID_ATRAC3AL,
  AV_CODEC_ID_ATRAC3PAL,
  AV_CODEC_ID_DOLBY_E,
  AV_CODEC_ID_APTX,
  AV_CODEC_ID_APTX_HD,
  AV_CODEC_ID_SBC,
  AV_CODEC_ID_ATRAC9,
  AV_CODEC_ID_HCOM,
  AV_CODEC_ID_ACELP_KELVIN,
  AV_CODEC_ID_MPEGH_3D_AUDIO,
  AV_CODEC_ID_SIREN,
  AV_CODEC_ID_HCA,
  AV_CODEC_ID_FASTAUDIO,
  AV_CODEC_ID_MSNSIREN,
  AV_CODEC_ID_DFPWM,
  AV_CODEC_ID_BONK,
  AV_CODEC_ID_MISC4,
  AV_CODEC_ID_APAC,
  AV_CODEC_ID_FTR,
  AV_CODEC_ID_WAVARC,
  AV_CODEC_ID_RKA,
  AV_CODEC_ID_AC4,
  AV_CODEC_ID_OSQ,
  AV_CODEC_ID_QOA,

  /**
   * subtitle codecs
   */

  /**
   * A dummy ID pointing at the start of subtitle codecs.
   */
  AV_CODEC_ID_FIRST_SUBTITLE = 0x17000,
  AV_CODEC_ID_DVD_SUBTITLE = 0x17000,
  AV_CODEC_ID_DVB_SUBTITLE,
  /**
   * raw UTF-8 text
   */
  AV_CODEC_ID_TEXT,
  AV_CODEC_ID_XSUB,
  AV_CODEC_ID_SSA,
  AV_CODEC_ID_MOV_TEXT,
  AV_CODEC_ID_HDMV_PGS_SUBTITLE,
  AV_CODEC_ID_DVB_TELETEXT,
  AV_CODEC_ID_SRT,
  AV_CODEC_ID_MICRODVD,
  AV_CODEC_ID_EIA_608,
  AV_CODEC_ID_JACOSUB,
  AV_CODEC_ID_SAMI,
  AV_CODEC_ID_REALTEXT,
  AV_CODEC_ID_STL,
  AV_CODEC_ID_SUBVIEWER1,
  AV_CODEC_ID_SUBVIEWER,
  AV_CODEC_ID_SUBRIP,
  AV_CODEC_ID_WEBVTT,
  AV_CODEC_ID_MPL2,
  AV_CODEC_ID_VPLAYER,
  AV_CODEC_ID_PJS,
  AV_CODEC_ID_ASS,
  AV_CODEC_ID_HDMV_TEXT_SUBTITLE,
  AV_CODEC_ID_TTML,
  AV_CODEC_ID_ARIB_CAPTION,

  /* other specific kind of codecs (generally used for attachments) */

  /**
   * A dummy ID pointing at the start of various fake codecs.
   */
  AV_CODEC_ID_FIRST_UNKNOWN = 0x18000,
  AV_CODEC_ID_TTF = 0x18000,

  /**
   * Contain timestamp estimated through PCR of program stream.
   */
  AV_CODEC_ID_SCTE_35,
  AV_CODEC_ID_EPG,
  AV_CODEC_ID_BINTEXT,
  AV_CODEC_ID_XBIN,
  AV_CODEC_ID_IDF,
  AV_CODEC_ID_OTF,
  AV_CODEC_ID_SMPTE_KLV,
  AV_CODEC_ID_DVD_NAV,
  AV_CODEC_ID_TIMED_ID3,
  AV_CODEC_ID_BIN_DATA,
  AV_CODEC_ID_SMPTE_2038,

  /**
   *  codec_id is not known (like AV_CODEC_ID_NONE) but lavf should attempt to identify it
   */
  AV_CODEC_ID_PROBE = 0x19000,

  /**
   * _FAKE_ codec to indicate a raw MPEG-2 TS stream (only used by libavformat)
   */
  AV_CODEC_ID_MPEG2TS = 0x20000,
  /**
   * _FAKE_ codec to indicate a MPEG-4 Systems stream (only used by libavformat)
   */
  AV_CODEC_ID_MPEG4SYSTEMS = 0x20001,
  /**
   * Dummy codec for streams containing only metadata information.
   */
  AV_CODEC_ID_FFMETADATA = 0x21000,
  /**
   * Passthrough codec, AVFrames wrapped in AVPacket
   */
  AV_CODEC_ID_WRAPPED_AVFRAME = 0x21001,
  /**
   * Dummy null video codec, useful mainly for development and debugging.
   * Null encoder/decoder discard all input and never return any output.
   */
  AV_CODEC_ID_VNULL,
  /**
   * Dummy null audio codec, useful mainly for development and debugging.
   * Null encoder/decoder discard all input and never return any output.
   */
  AV_CODEC_ID_ANULL
}

export const enum AVPacketSideDataType {
  AV_PKT_DATA_UNKNOWN = -1,
  /**
   * An AV_PKT_DATA_PALETTE side data packet contains exactly AVPALETTE_SIZE
   * bytes worth of palette. This side data signals that a new palette is
   * present.
   */
  AV_PKT_DATA_PALETTE,

  /**
   * The AV_PKT_DATA_NEW_EXTRADATA is used to notify the codec or the format
   * that the extradata buffer was changed and the receiving side should
   * act upon it appropriately. The new extradata is embedded in the side
   * data buffer and should be immediately used for processing the current
   * frame or packet.
   */
  AV_PKT_DATA_NEW_EXTRADATA,

  /**
   * An AV_PKT_DATA_PARAM_CHANGE side data packet is laid out as follows:
   * @code
   * u32le param_flags
   * if (param_flags & AV_SIDE_DATA_PARAM_CHANGE_CHANNEL_COUNT)
   *     s32le channel_count
   * if (param_flags & AV_SIDE_DATA_PARAM_CHANGE_CHANNEL_LAYOUT)
   *     u64le channel_layout
   * if (param_flags & AV_SIDE_DATA_PARAM_CHANGE_SAMPLE_RATE)
   *     s32le sample_rate
   * if (param_flags & AV_SIDE_DATA_PARAM_CHANGE_DIMENSIONS)
   *     s32le width
   *     s32le height
   * @endcode
   */
  AV_PKT_DATA_PARAM_CHANGE,

  /**
   * An AV_PKT_DATA_H263_MB_INFO side data packet contains a number of
   * structures with info about macroblocks relevant to splitting the
   * packet into smaller packets on macroblock edges (e.g. as for RFC 2190).
   * That is, it does not necessarily contain info about all macroblocks,
   * as long as the distance between macroblocks in the info is smaller
   * than the target payload size.
   * Each MB info structure is 12 bytes, and is laid out as follows:
   * @code
   * u32le bit offset from the start of the packet
   * u8    current quantizer at the start of the macroblock
   * u8    GOB number
   * u16le macroblock address within the GOB
   * u8    horizontal MV predictor
   * u8    vertical MV predictor
   * u8    horizontal MV predictor for block number 3
   * u8    vertical MV predictor for block number 3
   * @endcode
   */
  AV_PKT_DATA_H263_MB_INFO,

  /**
   * This side data should be associated with an audio stream and contains
   * ReplayGain information in form of the AVReplayGain struct.
   */
  AV_PKT_DATA_REPLAYGAIN,

  /**
   * This side data contains a 3x3 transformation matrix describing an affine
   * transformation that needs to be applied to the decoded video frames for
   * correct presentation.
   *
   * See libcommon/display.h for a detailed description of the data.
   */
  AV_PKT_DATA_DISPLAYMATRIX,

  /**
   * This side data should be associated with a video stream and contains
   * Stereoscopic 3D information in form of the AVStereo3D struct.
   */
  AV_PKT_DATA_STEREO3D,

  /**
   * This side data should be associated with an audio stream and corresponds
   * to enum AVAudioServiceType.
   */
  AV_PKT_DATA_AUDIO_SERVICE_TYPE,

  /**
   * This side data contains quality related information from the encoder.
   * @code
   * u32le quality factor of the compressed frame. Allowed range is between 1 (good) and FF_LAMBDA_MAX (bad).
   * u8    picture type
   * u8    error count
   * u16   reserved
   * u64le[error count] sum of squared differences between encoder in and output
   * @endcode
   */
  AV_PKT_DATA_QUALITY_STATS,

  /**
   * This side data contains an integer value representing the stream index
   * of a "fallback" track.  A fallback track indicates an alternate
   * track to use when the current track can not be decoded for some reason.
   * e.g. no decoder available for codec.
   */
  AV_PKT_DATA_FALLBACK_TRACK,

  /**
   * This side data corresponds to the AVCPBProperties struct.
   */
  AV_PKT_DATA_CPB_PROPERTIES,

  /**
   * Recommmends skipping the specified number of samples
   * @code
   * u32le number of samples to skip from start of this packet
   * u32le number of samples to skip from end of this packet
   * u8    reason for start skip
   * u8    reason for end   skip (0=padding silence, 1=convergence)
   * @endcode
   */
  AV_PKT_DATA_SKIP_SAMPLES,

  /**
   * An AV_PKT_DATA_JP_DUALMONO side data packet indicates that
   * the packet may contain "dual mono" audio specific to Japanese DTV
   * and if it is true, recommends only the selected channel to be used.
   * @code
   * u8    selected channels (0=mail/left, 1=sub/right, 2=both)
   * @endcode
   */
  AV_PKT_DATA_JP_DUALMONO,

  /**
   * A list of zero terminated key/value strings. There is no end marker for
   * the list, so it is required to rely on the side data size to stop.
   */
  AV_PKT_DATA_STRINGS_METADATA,

  /**
   * Subtitle event position
   * @code
   * u32le x1
   * u32le y1
   * u32le x2
   * u32le y2
   * @endcode
   */
  AV_PKT_DATA_SUBTITLE_POSITION,

  /**
   * Data found in BlockAdditional element of matroska container. There is
   * no end marker for the data, so it is required to rely on the side data
   * size to recognize the end. 8 byte id (as found in BlockAddId) followed
   * by data.
   */
  AV_PKT_DATA_MATROSKA_BLOCKADDITIONAL,

  /**
   * The optional first identifier line of a WebVTT cue.
   */
  AV_PKT_DATA_WEBVTT_IDENTIFIER,

  /**
   * The optional settings (rendering instructions) that immediately
   * follow the timestamp specifier of a WebVTT cue.
   */
  AV_PKT_DATA_WEBVTT_SETTINGS,

  /**
   * A list of zero terminated key/value strings. There is no end marker for
   * the list, so it is required to rely on the side data size to stop. This
   * side data includes updated metadata which appeared in the stream.
   */
  AV_PKT_DATA_METADATA_UPDATE,

  /**
   * MPEGTS stream ID as uint8_t, this is required to pass the stream ID
   * information from the demuxer to the corresponding muxer.
   */
  AV_PKT_DATA_MPEGTS_STREAM_ID,

  /**
   * Mastering display metadata (based on SMPTE-2086:2014). This metadata
   * should be associated with a video stream and contains data in the form
   * of the AVMasteringDisplayMetadata struct.
   */
  AV_PKT_DATA_MASTERING_DISPLAY_METADATA,

  /**
   * This side data should be associated with a video stream and corresponds
   * to the AVSphericalMapping structure.
   */
  AV_PKT_DATA_SPHERICAL,

  /**
   * Content light level (based on CTA-861.3). This metadata should be
   * associated with a video stream and contains data in the form of the
   * AVContentLightMetadata struct.
   */
  AV_PKT_DATA_CONTENT_LIGHT_LEVEL,

  /**
   * ATSC A53 Part 4 Closed Captions. This metadata should be associated with
   * a video stream. A53 CC bitstream is stored as uint8_t in AVPacketSideData.data.
   * The number of bytes of CC data is AVPacketSideData.size.
   */
  AV_PKT_DATA_A53_CC,

  /**
   * This side data is encryption initialization data.
   * The format is not part of ABI, use av_encryption_init_info_* methods to
   * access.
   */
  AV_PKT_DATA_ENCRYPTION_INIT_INFO,

  /**
   * This side data contains encryption info for how to decrypt the packet.
   * The format is not part of ABI, use av_encryption_info_* methods to access.
   */
  AV_PKT_DATA_ENCRYPTION_INFO,

  /**
   * Active Format Description data consisting of a single byte as specified
   * in ETSI TS 101 154 using AVActiveFormatDescription enum.
   */
  AV_PKT_DATA_AFD,

  /**
   * Producer Reference Time data corresponding to the AVProducerReferenceTime struct,
   * usually exported by some encoders (on demand through the prft flag set in the
   * AVCodecContext export_side_data field).
   */
  AV_PKT_DATA_PRFT,

  /**
   * ICC profile data consisting of an opaque octet buffer following the
   * format described by ISO 15076-1.
   */
  AV_PKT_DATA_ICC_PROFILE,

  /**
   * DOVI configuration
   * ref:
   * dolby-vision-bitstreams-within-the-iso-base-media-file-format-v2.1.2, section 2.2
   * dolby-vision-bitstreams-in-mpeg-2-transport-stream-multiplex-v1.2, section 3.3
   * Tags are stored in struct AVDOVIDecoderConfigurationRecord.
   */
  AV_PKT_DATA_DOVI_CONF,

  /**
   * Timecode which conforms to SMPTE ST 12-1:2014. The data is an array of 4 uint32_t
   * where the first uint32_t describes how many (1-3) of the other timecodes are used.
   * The timecode format is described in the documentation of av_timecode_get_smpte_from_framenum()
   * function in libcommon/timecode.h.
   */
  AV_PKT_DATA_S12M_TIMECODE,

  /**
   * HDR10+ dynamic metadata associated with a video frame. The metadata is in
   * the form of the AVDynamicHDRPlus struct and contains
   * information for color volume transform - application 4 of
   * SMPTE 2094-40:2016 standard.
   */
  AV_PKT_DATA_DYNAMIC_HDR10_PLUS,

  /**
   * The number of side data types.
   * This is not part of the public API/ABI in the sense that it may
   * change when new side data types are added.
   * This must stay the last enum value.
   * If its value becomes huge, some code using it
   * needs to be updated as it assumes it to be smaller than other limits.
   */
  AV_PKT_DATA_NB
}

