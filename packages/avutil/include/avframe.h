#ifndef _LIBMEDIA_AVUTIL_AVFRAME_H_

#define _LIBMEDIA_AVUTIL_AVFRAME_H_

#define FF_API_INTERLACED_FRAME 1
#define FF_API_FRAME_KEY 1
#define FF_API_PALETTE_HAS_CHANGED 1
#define API_FRAME_PKT 1

#include <stddef.h>
#include <stdint.h>
#include "rational.h"
#include "pixfmt.h"
#include "avbuffer.h"
#include "avdct.h"

enum AVPictureType {
  AV_PICTURE_TYPE_NONE = 0, ///< Undefined
  AV_PICTURE_TYPE_I,     ///< Intra
  AV_PICTURE_TYPE_P,     ///< Predicted
  AV_PICTURE_TYPE_B,     ///< Bi-dir predicted
  AV_PICTURE_TYPE_S,     ///< S(GMC)-VOP MPEG-4
  AV_PICTURE_TYPE_SI,    ///< Switching Intra
  AV_PICTURE_TYPE_SP,    ///< Switching Predicted
  AV_PICTURE_TYPE_BI,    ///< BI type
};

/**
 * @defgroup lavu_frame AVFrame
 * @ingroup lavu_data
 *
 * @{
 * AVFrame is an abstraction for reference-counted raw multimedia data.
 */

enum AVFrameSideDataType {
  /**
   * The data is the AVPanScan struct defined in libavcodec.
   */
  AV_FRAME_DATA_PANSCAN,
  /**
   * ATSC A53 Part 4 Closed Captions.
   * A53 CC bitstream is stored as uint8_t in AVFrameSideData.data.
   * The number of bytes of CC data is AVFrameSideData.size.
   */
  AV_FRAME_DATA_A53_CC,
  /**
   * Stereoscopic 3d metadata.
   * The data is the AVStereo3D struct defined in libavutil/stereo3d.h.
   */
  AV_FRAME_DATA_STEREO3D,
  /**
   * The data is the AVMatrixEncoding enum defined in libavutil/channel_layout.h.
   */
  AV_FRAME_DATA_MATRIXENCODING,
  /**
   * Metadata relevant to a downmix procedure.
   * The data is the AVDownmixInfo struct defined in libavutil/downmix_info.h.
   */
  AV_FRAME_DATA_DOWNMIX_INFO,
  /**
   * ReplayGain information in the form of the AVReplayGain struct.
   */
  AV_FRAME_DATA_REPLAYGAIN,
  /**
   * This side data contains a 3x3 transformation matrix describing an affine
   * transformation that needs to be applied to the frame for correct
   * presentation.
   *
   * See libavutil/display.h for a detailed description of the data.
   */
  AV_FRAME_DATA_DISPLAYMATRIX,
  /**
   * Active Format Description data consisting of a single byte as specified
   * in ETSI TS 101 154 using AVActiveFormatDescription enum.
   */
  AV_FRAME_DATA_AFD,
  /**
   * Motion vectors exported by some codecs (on demand through the export_mvs
   * flag set in the libavcodec AVCodecContext flags2 option).
   * The data is the AVMotionVector struct defined in
   * libavutil/motion_vector.h.
   */
  AV_FRAME_DATA_MOTION_VECTORS,
  /**
   * Recommmends skipping the specified number of samples. This is exported
   * only if the "skip_manual" AVOption is set in libavcodec.
   * This has the same format as AV_PKT_DATA_SKIP_SAMPLES.
   * @code
   * u32le number of samples to skip from start of this packet
   * u32le number of samples to skip from end of this packet
   * u8    reason for start skip
   * u8    reason for end   skip (0=padding silence, 1=convergence)
   * @endcode
   */
  AV_FRAME_DATA_SKIP_SAMPLES,
  /**
   * This side data must be associated with an audio frame and corresponds to
   * enum AVAudioServiceType defined in avcodec.h.
   */
  AV_FRAME_DATA_AUDIO_SERVICE_TYPE,
  /**
   * Mastering display metadata associated with a video frame. The payload is
   * an AVMasteringDisplayMetadata type and contains information about the
   * mastering display color volume.
   */
  AV_FRAME_DATA_MASTERING_DISPLAY_METADATA,
  /**
   * The GOP timecode in 25 bit timecode format. Data format is 64-bit integer.
   * This is set on the first frame of a GOP that has a temporal reference of 0.
   */
  AV_FRAME_DATA_GOP_TIMECODE,

  /**
   * The data represents the AVSphericalMapping structure defined in
   * libavutil/spherical.h.
   */
  AV_FRAME_DATA_SPHERICAL,

  /**
   * Content light level (based on CTA-861.3). This payload contains data in
   * the form of the AVContentLightMetadata struct.
   */
  AV_FRAME_DATA_CONTENT_LIGHT_LEVEL,

  /**
   * The data contains an ICC profile as an opaque octet buffer following the
   * format described by ISO 15076-1 with an optional name defined in the
   * metadata key entry "name".
   */
  AV_FRAME_DATA_ICC_PROFILE,

  /**
   * Timecode which conforms to SMPTE ST 12-1. The data is an array of 4 uint32_t
   * where the first uint32_t describes how many (1-3) of the other timecodes are used.
   * The timecode format is described in the documentation of av_timecode_get_smpte_from_framenum()
   * function in libavutil/timecode.h.
   */
  AV_FRAME_DATA_S12M_TIMECODE,

  /**
   * HDR dynamic metadata associated with a video frame. The payload is
   * an AVDynamicHDRPlus type and contains information for color
   * volume transform - application 4 of SMPTE 2094-40:2016 standard.
   */
  AV_FRAME_DATA_DYNAMIC_HDR_PLUS,

  /**
   * Regions Of Interest, the data is an array of AVRegionOfInterest type, the number of
   * array element is implied by AVFrameSideData.size / AVRegionOfInterest.self_size.
   */
  AV_FRAME_DATA_REGIONS_OF_INTEREST,

  /**
   * Encoding parameters for a video frame, as described by AVVideoEncParams.
   */
  AV_FRAME_DATA_VIDEO_ENC_PARAMS,

  /**
   * User data unregistered metadata associated with a video frame.
   * This is the H.26[45] UDU SEI message, and shouldn't be used for any other purpose
   * The data is stored as uint8_t in AVFrameSideData.data which is 16 bytes of
   * uuid_iso_iec_11578 followed by AVFrameSideData.size - 16 bytes of user_data_payload_byte.
   */
  AV_FRAME_DATA_SEI_UNREGISTERED,

  /**
   * Film grain parameters for a frame, described by AVFilmGrainParams.
   * Must be present for every frame which should have film grain applied.
   *
   * May be present multiple times, for example when there are multiple
   * alternative parameter sets for different video signal characteristics.
   * The user should select the most appropriate set for the application.
   */
  AV_FRAME_DATA_FILM_GRAIN_PARAMS,

  /**
   * Bounding boxes for object detection and classification,
   * as described by AVDetectionBBoxHeader.
   */
  AV_FRAME_DATA_DETECTION_BBOXES,

  /**
   * Dolby Vision RPU raw data, suitable for passing to x265
   * or other libraries. Array of uint8_t, with NAL emulation
   * bytes intact.
   */
  AV_FRAME_DATA_DOVI_RPU_BUFFER,

  /**
   * Parsed Dolby Vision metadata, suitable for passing to a software
   * implementation. The payload is the AVDOVIMetadata struct defined in
   * libavutil/dovi_meta.h.
   */
  AV_FRAME_DATA_DOVI_METADATA,

  /**
   * HDR Vivid dynamic metadata associated with a video frame. The payload is
   * an AVDynamicHDRVivid type and contains information for color
   * volume transform - CUVA 005.1-2021.
   */
  AV_FRAME_DATA_DYNAMIC_HDR_VIVID,

  /**
   * Ambient viewing environment metadata, as defined by H.274.
   */
  AV_FRAME_DATA_AMBIENT_VIEWING_ENVIRONMENT,

  /**
   * Provide encoder-specific hinting information about changed/unchanged
   * portions of a frame.  It can be used to pass information about which
   * macroblocks can be skipped because they didn't change from the
   * corresponding ones in the previous frame. This could be useful for
   * applications which know this information in advance to speed up
   * encoding.
   */
  AV_FRAME_DATA_VIDEO_HINT,
};

/**
 * Structure to hold side data for an AVFrame.
 *
 * sizeof(AVFrameSideData) is not a part of the public ABI, so new fields may be added
 * to the end with a minor bump.
 */
typedef struct AVFrameSideData {
  enum AVFrameSideDataType type;
  uint8_t *data;
  size_t   size;
  AVDictionary *metadata;
  AVBufferRef *buf;
} AVFrameSideData;

typedef struct AVFrame {
#define AV_NUM_DATA_POINTERS 8
  /**
   * pointer to the picture/channel planes.
   * This might be different from the first allocated byte. For video,
   * it could even point to the end of the image data.
   *
   * All pointers in data and extended_data must point into one of the
   * AVBufferRef in buf or extended_buf.
   *
   * Some decoders access areas outside 0,0 - width,height, please
   * see avcodec_align_dimensions2(). Some filters and swscale can read
   * up to 16 bytes beyond the planes, if these filters are to be used,
   * then 16 extra bytes must be allocated.
   *
   * NOTE: Pointers not needed by the format MUST be set to NULL.
   *
   * @attention In case of video, the data[] pointers can point to the
   * end of image data in order to reverse line order, when used in
   * combination with negative values in the linesize[] array.
   */
  uint8_t *data[AV_NUM_DATA_POINTERS];

  /**
   * For video, a positive or negative value, which is typically indicating
   * the size in bytes of each picture line, but it can also be:
   * - the negative byte size of lines for vertical flipping
   *   (with data[n] pointing to the end of the data
   * - a positive or negative multiple of the byte size as for accessing
   *   even and odd fields of a frame (possibly flipped)
   *
   * For audio, only linesize[0] may be set. For planar audio, each channel
   * plane must be the same size.
   *
   * For video the linesizes should be multiples of the CPUs alignment
   * preference, this is 16 or 32 for modern desktop CPUs.
   * Some code requires such alignment other code can be slower without
   * correct alignment, for yet other it makes no difference.
   *
   * @note The linesize may be larger than the size of usable data -- there
   * may be extra padding present for performance reasons.
   *
   * @attention In case of video, line size values can be negative to achieve
   * a vertically inverted iteration over image lines.
   */
  int linesize[AV_NUM_DATA_POINTERS];

  /**
   * pointers to the data planes/channels.
   *
   * For video, this should simply point to data[].
   *
   * For planar audio, each channel has a separate data pointer, and
   * linesize[0] contains the size of each channel buffer.
   * For packed audio, there is just one data pointer, and linesize[0]
   * contains the total size of the buffer for all channels.
   *
   * Note: Both data and extended_data should always be set in a valid frame,
   * but for planar audio with more channels that can fit in data,
   * extended_data must be used in order to access all channels.
   */
  uint8_t **extended_data;

  /**
   * @name Video dimensions
   * Video frames only. The coded dimensions (in pixels) of the video frame,
   * i.e. the size of the rectangle that contains some well-defined values.
   *
   * @note The part of the frame intended for display/presentation is further
   * restricted by the @ref cropping "Cropping rectangle".
   * @{
   */
  int width, height;
  /**
   * @}
   */

  /**
   * number of audio samples (per channel) described by this frame
   */
  int nb_samples;

  /**
   * format of the frame, -1 if unknown or unset
   * Values correspond to enum AVPixelFormat for video frames,
   * enum AVSampleFormat for audio)
   */
  int format;

#if FF_API_FRAME_KEY
  /**
   * 1 -> keyframe, 0-> not
   *
   * @deprecated Use AV_FRAME_FLAG_KEY instead
   */
  attribute_deprecated
  int key_frame;
#endif

  /**
   * Picture type of the frame.
   */
  enum AVPictureType pict_type;

  /**
   * Sample aspect ratio for the video frame, 0/1 if unknown/unspecified.
   */
  AVRational sample_aspect_ratio;

  /**
   * Presentation timestamp in time_base units (time when frame should be shown to user).
   */
  int64_t pts;

  /**
   * DTS copied from the AVPacket that triggered returning this frame. (if frame threading isn't used)
   * This is also the Presentation time of this AVFrame calculated from
   * only AVPacket.dts values without pts values.
   */
  int64_t pkt_dts;

  /**
   * Time base for the timestamps in this frame.
   * In the future, this field may be set on frames output by decoders or
   * filters, but its value will be by default ignored on input to encoders
   * or filters.
   */
  AVRational time_base;

  /**
   * quality (between 1 (good) and FF_LAMBDA_MAX (bad))
   */
  int quality;

  /**
   * Frame owner's private data.
   *
   * This field may be set by the code that allocates/owns the frame data.
   * It is then not touched by any library functions, except:
   * - it is copied to other references by av_frame_copy_props() (and hence by
   *   av_frame_ref());
   * - it is set to NULL when the frame is cleared by av_frame_unref()
   * - on the caller's explicit request. E.g. libavcodec encoders/decoders
   *   will copy this field to/from @ref AVPacket "AVPackets" if the caller sets
   *   @ref AV_CODEC_FLAG_COPY_OPAQUE.
   *
   * @see opaque_ref the reference-counted analogue
   */
  void *opaque;

  /**
   * Number of fields in this frame which should be repeated, i.e. the total
   * duration of this frame should be repeat_pict + 2 normal field durations.
   *
   * For interlaced frames this field may be set to 1, which signals that this
   * frame should be presented as 3 fields: beginning with the first field (as
   * determined by AV_FRAME_FLAG_TOP_FIELD_FIRST being set or not), followed
   * by the second field, and then the first field again.
   *
   * For progressive frames this field may be set to a multiple of 2, which
   * signals that this frame's duration should be (repeat_pict + 2) / 2
   * normal frame durations.
   *
   * @note This field is computed from MPEG2 repeat_first_field flag and its
   * associated flags, H.264 pic_struct from picture timing SEI, and
   * their analogues in other codecs. Typically it should only be used when
   * higher-layer timing information is not available.
   */
  int repeat_pict;

#if FF_API_INTERLACED_FRAME
  /**
   * The content of the picture is interlaced.
   *
   * @deprecated Use AV_FRAME_FLAG_INTERLACED instead
   */
  attribute_deprecated
  int interlaced_frame;

  /**
   * If the content is interlaced, is top field displayed first.
   *
   * @deprecated Use AV_FRAME_FLAG_TOP_FIELD_FIRST instead
   */
  attribute_deprecated
  int top_field_first;
#endif

#if FF_API_PALETTE_HAS_CHANGED
  /**
   * Tell user application that palette has changed from previous frame.
   */
  attribute_deprecated
  int palette_has_changed;
#endif

  /**
   * Sample rate of the audio data.
   */
  int sample_rate;

  /**
   * AVBuffer references backing the data for this frame. All the pointers in
   * data and extended_data must point inside one of the buffers in buf or
   * extended_buf. This array must be filled contiguously -- if buf[i] is
   * non-NULL then buf[j] must also be non-NULL for all j < i.
   *
   * There may be at most one AVBuffer per data plane, so for video this array
   * always contains all the references. For planar audio with more than
   * AV_NUM_DATA_POINTERS channels, there may be more buffers than can fit in
   * this array. Then the extra AVBufferRef pointers are stored in the
   * extended_buf array.
   */
  AVBufferRef *buf[AV_NUM_DATA_POINTERS];

  /**
   * For planar audio which requires more than AV_NUM_DATA_POINTERS
   * AVBufferRef pointers, this array will hold all the references which
   * cannot fit into AVFrame.buf.
   *
   * Note that this is different from AVFrame.extended_data, which always
   * contains all the pointers. This array only contains the extra pointers,
   * which cannot fit into AVFrame.buf.
   *
   * This array is always allocated using av_malloc() by whoever constructs
   * the frame. It is freed in av_frame_unref().
   */
  AVBufferRef **extended_buf;
  /**
   * Number of elements in extended_buf.
   */
  int        nb_extended_buf;

  AVFrameSideData **side_data;
  int            nb_side_data;

/**
 * @defgroup lavu_frame_flags AV_FRAME_FLAGS
 * @ingroup lavu_frame
 * Flags describing additional frame properties.
 *
 * @{
 */

/**
 * The frame data may be corrupted, e.g. due to decoding errors.
 */
#define AV_FRAME_FLAG_CORRUPT       (1 << 0)
/**
 * A flag to mark frames that are keyframes.
 */
#define AV_FRAME_FLAG_KEY (1 << 1)
/**
 * A flag to mark the frames which need to be decoded, but shouldn't be output.
 */
#define AV_FRAME_FLAG_DISCARD   (1 << 2)
/**
 * A flag to mark frames whose content is interlaced.
 */
#define AV_FRAME_FLAG_INTERLACED (1 << 3)
/**
 * A flag to mark frames where the top field is displayed first if the content
 * is interlaced.
 */
#define AV_FRAME_FLAG_TOP_FIELD_FIRST (1 << 4)
/**
 * @}
 */

  /**
   * Frame flags, a combination of @ref lavu_frame_flags
   */
  int flags;

  /**
   * MPEG vs JPEG YUV range.
   * - encoding: Set by user
   * - decoding: Set by libavcodec
   */
  enum AVColorRange color_range;

  enum AVColorPrimaries color_primaries;

  enum AVColorTransferCharacteristic color_trc;

  /**
   * YUV colorspace type.
   * - encoding: Set by user
   * - decoding: Set by libavcodec
   */
  enum AVColorSpace colorspace;

  enum AVChromaLocation chroma_location;

  /**
   * frame timestamp estimated using various heuristics, in stream time base
   * - encoding: unused
   * - decoding: set by libavcodec, read by user.
   */
  int64_t best_effort_timestamp;

#if FF_API_FRAME_PKT
  /**
   * reordered pos from the last AVPacket that has been input into the decoder
   * - encoding: unused
   * - decoding: Read by user.
   * @deprecated use AV_CODEC_FLAG_COPY_OPAQUE to pass through arbitrary user
   *             data from packets to frames
   */
  attribute_deprecated
  int64_t pkt_pos;
#endif

  /**
   * metadata.
   * - encoding: Set by user.
   * - decoding: Set by libavcodec.
   */
  AVDictionary *metadata;

  /**
   * decode error flags of the frame, set to a combination of
   * FF_DECODE_ERROR_xxx flags if the decoder produced a frame, but there
   * were errors during the decoding.
   * - encoding: unused
   * - decoding: set by libavcodec, read by user.
   */
  int decode_error_flags;
#define FF_DECODE_ERROR_INVALID_BITSTREAM   1
#define FF_DECODE_ERROR_MISSING_REFERENCE   2
#define FF_DECODE_ERROR_CONCEALMENT_ACTIVE  4
#define FF_DECODE_ERROR_DECODE_SLICES       8

#if FF_API_FRAME_PKT
  /**
   * size of the corresponding packet containing the compressed
   * frame.
   * It is set to a negative value if unknown.
   * - encoding: unused
   * - decoding: set by libavcodec, read by user.
   * @deprecated use AV_CODEC_FLAG_COPY_OPAQUE to pass through arbitrary user
   *             data from packets to frames
   */
  attribute_deprecated
  int pkt_size;
#endif

  /**
   * For hwaccel-format frames, this should be a reference to the
   * AVHWFramesContext describing the frame.
   */
  AVBufferRef *hw_frames_ctx;

  /**
   * Frame owner's private data.
   *
   * This field may be set by the code that allocates/owns the frame data.
   * It is then not touched by any library functions, except:
   * - a new reference to the underlying buffer is propagated by
   *   av_frame_copy_props() (and hence by av_frame_ref());
   * - it is unreferenced in av_frame_unref();
   * - on the caller's explicit request. E.g. libavcodec encoders/decoders
   *   will propagate a new reference to/from @ref AVPacket "AVPackets" if the
   *   caller sets @ref AV_CODEC_FLAG_COPY_OPAQUE.
   *
   * @see opaque the plain pointer analogue
   */
  AVBufferRef *opaque_ref;

  /**
   * @anchor cropping
   * @name Cropping
   * Video frames only. The number of pixels to discard from the the
   * top/bottom/left/right border of the frame to obtain the sub-rectangle of
   * the frame intended for presentation.
   * @{
   */
  size_t crop_top;
  size_t crop_bottom;
  size_t crop_left;
  size_t crop_right;
  /**
   * @}
   */

  /**
   * AVBufferRef for internal use by a single libav* library.
   * Must not be used to transfer data between libraries.
   * Has to be NULL when ownership of the frame leaves the respective library.
   *
   * Code outside the FFmpeg libs should never check or change the contents of the buffer ref.
   *
   * FFmpeg calls av_buffer_unref() on it when the frame is unreferenced.
   * av_frame_copy_props() calls create a new reference with av_buffer_ref()
   * for the target frame's private_ref field.
   */
  AVBufferRef *private_ref;

  /**
   * Channel layout of the audio data.
   */
  AVChannelLayout ch_layout;

  /**
   * Duration of the frame, in the same units as pts. 0 if unknown.
   */
  int64_t duration;
} AVFrame;

typedef struct AVFrameRef {
   /**
   * pointer to the picture/channel planes.
   * This might be different from the first allocated byte. For video,
   * it could even point to the end of the image data.
   *
   * All pointers in data and extended_data must point into one of the
   * AVBufferRef in buf or extended_buf.
   *
   * Some decoders access areas outside 0,0 - width,height, please
   * see avcodec_align_dimensions2(). Some filters and swscale can read
   * up to 16 bytes beyond the planes, if these filters are to be used,
   * then 16 extra bytes must be allocated.
   *
   * NOTE: Pointers not needed by the format MUST be set to NULL.
   *
   * @attention In case of video, the data[] pointers can point to the
   * end of image data in order to reverse line order, when used in
   * combination with negative values in the linesize[] array.
   */
  uint8_t *data[AV_NUM_DATA_POINTERS];

  /**
   * For video, a positive or negative value, which is typically indicating
   * the size in bytes of each picture line, but it can also be:
   * - the negative byte size of lines for vertical flipping
   *   (with data[n] pointing to the end of the data
   * - a positive or negative multiple of the byte size as for accessing
   *   even and odd fields of a frame (possibly flipped)
   *
   * For audio, only linesize[0] may be set. For planar audio, each channel
   * plane must be the same size.
   *
   * For video the linesizes should be multiples of the CPUs alignment
   * preference, this is 16 or 32 for modern desktop CPUs.
   * Some code requires such alignment other code can be slower without
   * correct alignment, for yet other it makes no difference.
   *
   * @note The linesize may be larger than the size of usable data -- there
   * may be extra padding present for performance reasons.
   *
   * @attention In case of video, line size values can be negative to achieve
   * a vertically inverted iteration over image lines.
   */
  int linesize[AV_NUM_DATA_POINTERS];

  /**
   * pointers to the data planes/channels.
   *
   * For video, this should simply point to data[].
   *
   * For planar audio, each channel has a separate data pointer, and
   * linesize[0] contains the size of each channel buffer.
   * For packed audio, there is just one data pointer, and linesize[0]
   * contains the total size of the buffer for all channels.
   *
   * Note: Both data and extended_data should always be set in a valid frame,
   * but for planar audio with more channels that can fit in data,
   * extended_data must be used in order to access all channels.
   */
  uint8_t **extended_data;

  /**
   * @name Video dimensions
   * Video frames only. The coded dimensions (in pixels) of the video frame,
   * i.e. the size of the rectangle that contains some well-defined values.
   *
   * @note The part of the frame intended for display/presentation is further
   * restricted by the @ref cropping "Cropping rectangle".
   * @{
   */
  int width, height;
  /**
   * @}
   */

  /**
   * number of audio samples (per channel) described by this frame
   */
  int nb_samples;

  /**
   * format of the frame, -1 if unknown or unset
   * Values correspond to enum AVPixelFormat for video frames,
   * enum AVSampleFormat for audio)
   */
  int format;

#if FF_API_FRAME_KEY
  /**
   * 1 -> keyframe, 0-> not
   *
   * @deprecated Use AV_FRAME_FLAG_KEY instead
   */
  attribute_deprecated
  int key_frame;
#endif

  /**
   * Picture type of the frame.
   */
  enum AVPictureType pict_type;

  /**
   * Sample aspect ratio for the video frame, 0/1 if unknown/unspecified.
   */
  AVRational sample_aspect_ratio;

  /**
   * Presentation timestamp in time_base units (time when frame should be shown to user).
   */
  int64_t pts;

  /**
   * DTS copied from the AVPacket that triggered returning this frame. (if frame threading isn't used)
   * This is also the Presentation time of this AVFrame calculated from
   * only AVPacket.dts values without pts values.
   */
  int64_t pkt_dts;

  /**
   * Time base for the timestamps in this frame.
   * In the future, this field may be set on frames output by decoders or
   * filters, but its value will be by default ignored on input to encoders
   * or filters.
   */
  AVRational time_base;

  /**
   * quality (between 1 (good) and FF_LAMBDA_MAX (bad))
   */
  int quality;

  /**
   * Frame owner's private data.
   *
   * This field may be set by the code that allocates/owns the frame data.
   * It is then not touched by any library functions, except:
   * - it is copied to other references by av_frame_copy_props() (and hence by
   *   av_frame_ref());
   * - it is set to NULL when the frame is cleared by av_frame_unref()
   * - on the caller's explicit request. E.g. libavcodec encoders/decoders
   *   will copy this field to/from @ref AVPacket "AVPackets" if the caller sets
   *   @ref AV_CODEC_FLAG_COPY_OPAQUE.
   *
   * @see opaque_ref the reference-counted analogue
   */
  void *opaque;

  /**
   * Number of fields in this frame which should be repeated, i.e. the total
   * duration of this frame should be repeat_pict + 2 normal field durations.
   *
   * For interlaced frames this field may be set to 1, which signals that this
   * frame should be presented as 3 fields: beginning with the first field (as
   * determined by AV_FRAME_FLAG_TOP_FIELD_FIRST being set or not), followed
   * by the second field, and then the first field again.
   *
   * For progressive frames this field may be set to a multiple of 2, which
   * signals that this frame's duration should be (repeat_pict + 2) / 2
   * normal frame durations.
   *
   * @note This field is computed from MPEG2 repeat_first_field flag and its
   * associated flags, H.264 pic_struct from picture timing SEI, and
   * their analogues in other codecs. Typically it should only be used when
   * higher-layer timing information is not available.
   */
  int repeat_pict;

#if FF_API_INTERLACED_FRAME
  /**
   * The content of the picture is interlaced.
   *
   * @deprecated Use AV_FRAME_FLAG_INTERLACED instead
   */
  attribute_deprecated
  int interlaced_frame;

  /**
   * If the content is interlaced, is top field displayed first.
   *
   * @deprecated Use AV_FRAME_FLAG_TOP_FIELD_FIRST instead
   */
  attribute_deprecated
  int top_field_first;
#endif

#if FF_API_PALETTE_HAS_CHANGED
  /**
   * Tell user application that palette has changed from previous frame.
   */
  attribute_deprecated
  int palette_has_changed;
#endif

  /**
   * Sample rate of the audio data.
   */
  int sample_rate;

  /**
   * AVBuffer references backing the data for this frame. All the pointers in
   * data and extended_data must point inside one of the buffers in buf or
   * extended_buf. This array must be filled contiguously -- if buf[i] is
   * non-NULL then buf[j] must also be non-NULL for all j < i.
   *
   * There may be at most one AVBuffer per data plane, so for video this array
   * always contains all the references. For planar audio with more than
   * AV_NUM_DATA_POINTERS channels, there may be more buffers than can fit in
   * this array. Then the extra AVBufferRef pointers are stored in the
   * extended_buf array.
   */
  AVBufferRef *buf[AV_NUM_DATA_POINTERS];

  /**
   * For planar audio which requires more than AV_NUM_DATA_POINTERS
   * AVBufferRef pointers, this array will hold all the references which
   * cannot fit into AVFrame.buf.
   *
   * Note that this is different from AVFrame.extended_data, which always
   * contains all the pointers. This array only contains the extra pointers,
   * which cannot fit into AVFrame.buf.
   *
   * This array is always allocated using av_malloc() by whoever constructs
   * the frame. It is freed in av_frame_unref().
   */
  AVBufferRef **extended_buf;
  /**
   * Number of elements in extended_buf.
   */
  int        nb_extended_buf;

  AVFrameSideData **side_data;
  int            nb_side_data;

/**
 * @defgroup lavu_frame_flags AV_FRAME_FLAGS
 * @ingroup lavu_frame
 * Flags describing additional frame properties.
 *
 * @{
 */

/**
 * The frame data may be corrupted, e.g. due to decoding errors.
 */
#define AV_FRAME_FLAG_CORRUPT       (1 << 0)
/**
 * A flag to mark frames that are keyframes.
 */
#define AV_FRAME_FLAG_KEY (1 << 1)
/**
 * A flag to mark the frames which need to be decoded, but shouldn't be output.
 */
#define AV_FRAME_FLAG_DISCARD   (1 << 2)
/**
 * A flag to mark frames whose content is interlaced.
 */
#define AV_FRAME_FLAG_INTERLACED (1 << 3)
/**
 * A flag to mark frames where the top field is displayed first if the content
 * is interlaced.
 */
#define AV_FRAME_FLAG_TOP_FIELD_FIRST (1 << 4)
/**
 * @}
 */

  /**
   * Frame flags, a combination of @ref lavu_frame_flags
   */
  int flags;

  /**
   * MPEG vs JPEG YUV range.
   * - encoding: Set by user
   * - decoding: Set by libavcodec
   */
  enum AVColorRange color_range;

  enum AVColorPrimaries color_primaries;

  enum AVColorTransferCharacteristic color_trc;

  /**
   * YUV colorspace type.
   * - encoding: Set by user
   * - decoding: Set by libavcodec
   */
  enum AVColorSpace colorspace;

  enum AVChromaLocation chroma_location;

  /**
   * frame timestamp estimated using various heuristics, in stream time base
   * - encoding: unused
   * - decoding: set by libavcodec, read by user.
   */
  int64_t best_effort_timestamp;

#if FF_API_FRAME_PKT
  /**
   * reordered pos from the last AVPacket that has been input into the decoder
   * - encoding: unused
   * - decoding: Read by user.
   * @deprecated use AV_CODEC_FLAG_COPY_OPAQUE to pass through arbitrary user
   *             data from packets to frames
   */
  attribute_deprecated
  int64_t pkt_pos;
#endif

  /**
   * metadata.
   * - encoding: Set by user.
   * - decoding: Set by libavcodec.
   */
  AVDictionary *metadata;

  /**
   * decode error flags of the frame, set to a combination of
   * FF_DECODE_ERROR_xxx flags if the decoder produced a frame, but there
   * were errors during the decoding.
   * - encoding: unused
   * - decoding: set by libavcodec, read by user.
   */
  int decode_error_flags;
#define FF_DECODE_ERROR_INVALID_BITSTREAM   1
#define FF_DECODE_ERROR_MISSING_REFERENCE   2
#define FF_DECODE_ERROR_CONCEALMENT_ACTIVE  4
#define FF_DECODE_ERROR_DECODE_SLICES       8

#if FF_API_FRAME_PKT
  /**
   * size of the corresponding packet containing the compressed
   * frame.
   * It is set to a negative value if unknown.
   * - encoding: unused
   * - decoding: set by libavcodec, read by user.
   * @deprecated use AV_CODEC_FLAG_COPY_OPAQUE to pass through arbitrary user
   *             data from packets to frames
   */
  attribute_deprecated
  int pkt_size;
#endif

  /**
   * For hwaccel-format frames, this should be a reference to the
   * AVHWFramesContext describing the frame.
   */
  AVBufferRef *hw_frames_ctx;

  /**
   * Frame owner's private data.
   *
   * This field may be set by the code that allocates/owns the frame data.
   * It is then not touched by any library functions, except:
   * - a new reference to the underlying buffer is propagated by
   *   av_frame_copy_props() (and hence by av_frame_ref());
   * - it is unreferenced in av_frame_unref();
   * - on the caller's explicit request. E.g. libavcodec encoders/decoders
   *   will propagate a new reference to/from @ref AVPacket "AVPackets" if the
   *   caller sets @ref AV_CODEC_FLAG_COPY_OPAQUE.
   *
   * @see opaque the plain pointer analogue
   */
  AVBufferRef *opaque_ref;

  /**
   * @anchor cropping
   * @name Cropping
   * Video frames only. The number of pixels to discard from the the
   * top/bottom/left/right border of the frame to obtain the sub-rectangle of
   * the frame intended for presentation.
   * @{
   */
  size_t crop_top;
  size_t crop_bottom;
  size_t crop_left;
  size_t crop_right;
  /**
   * @}
   */

  /**
   * AVBufferRef for internal use by a single libav* library.
   * Must not be used to transfer data between libraries.
   * Has to be NULL when ownership of the frame leaves the respective library.
   *
   * Code outside the FFmpeg libs should never check or change the contents of the buffer ref.
   *
   * FFmpeg calls av_buffer_unref() on it when the frame is unreferenced.
   * av_frame_copy_props() calls create a new reference with av_buffer_ref()
   * for the target frame's private_ref field.
   */
  AVBufferRef *private_ref;

  /**
   * Channel layout of the audio data.
   */
  AVChannelLayout ch_layout;

  /**
   * Duration of the frame, in the same units as pts. 0 if unknown.
   */
  int64_t duration;

  atomic_int32 ref_count;
} AVFrameRef;

#endif