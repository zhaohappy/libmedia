
#ifndef _LIBMEDIA_AVUTIL_AUDIOSAMPLE_H_

#define _LIBMEDIA_AVUTIL_AUDIOSAMPLE_H_

#include <stdint.h>

/**
 * Audio channel layout utility functions
 *
 */
enum AVChannel {
  ///< Invalid channel index
  AV_CHAN_NONE = -1,
  AV_CHAN_FRONT_LEFT,
  AV_CHAN_FRONT_RIGHT,
  AV_CHAN_FRONT_CENTER,
  AV_CHAN_LOW_FREQUENCY,
  AV_CHAN_BACK_LEFT,
  AV_CHAN_BACK_RIGHT,
  AV_CHAN_FRONT_LEFT_OF_CENTER,
  AV_CHAN_FRONT_RIGHT_OF_CENTER,
  AV_CHAN_BACK_CENTER,
  AV_CHAN_SIDE_LEFT,
  AV_CHAN_SIDE_RIGHT,
  AV_CHAN_TOP_CENTER,
  AV_CHAN_TOP_FRONT_LEFT,
  AV_CHAN_TOP_FRONT_CENTER,
  AV_CHAN_TOP_FRONT_RIGHT,
  AV_CHAN_TOP_BACK_LEFT,
  AV_CHAN_TOP_BACK_CENTER,
  AV_CHAN_TOP_BACK_RIGHT,
  /** Stereo downmix. */
  AV_CHAN_STEREO_LEFT = 29,
  /** See above. */
  AV_CHAN_STEREO_RIGHT,
  AV_CHAN_WIDE_LEFT,
  AV_CHAN_WIDE_RIGHT,
  AV_CHAN_SURROUND_DIRECT_LEFT,
  AV_CHAN_SURROUND_DIRECT_RIGHT,
  AV_CHAN_LOW_FREQUENCY_2,
  AV_CHAN_TOP_SIDE_LEFT,
  AV_CHAN_TOP_SIDE_RIGHT,
  AV_CHAN_BOTTOM_FRONT_CENTER,
  AV_CHAN_BOTTOM_FRONT_LEFT,
  AV_CHAN_BOTTOM_FRONT_RIGHT,

  /** Channel is empty can be safely skipped. */
  AV_CHAN_UNUSED = 0x200,

  /** Channel contains data, but its position is unknown. */
  AV_CHAN_UNKNOWN = 0x300,

  /**
   * Range of channels between AV_CHAN_AMBISONIC_BASE and
   * AV_CHAN_AMBISONIC_END represent Ambisonic components using the ACN system.
   *
   * Given a channel id `<i>` between AV_CHAN_AMBISONIC_BASE and
   * AV_CHAN_AMBISONIC_END (inclusive), the ACN index of the channel `<n>` is
   * `<n> = <i> - AV_CHAN_AMBISONIC_BASE`.
   *
   * @note these values are only used for AV_CHANNEL_ORDER_CUSTOM channel
   * orderings, the AV_CHANNEL_ORDER_AMBISONIC ordering orders the channels
   * implicitly by their position in the stream.
   */
  AV_CHAN_AMBISONIC_BASE = 0x400,
  // leave space for 1024 ids, which correspond to maximum order-32 harmonics,
  // which should be enough for the foreseeable use cases
  AV_CHAN_AMBISONIC_END  = 0x7ff,
};

enum AVChannelOrder {
  /**
   * Only the channel count is specified, without any further information
   * about the channel order.
   */
  AV_CHANNEL_ORDER_UNSPEC,
  /**
   * The native channel order, i.e. the channels are in the same order in
   * which they are defined in the AVChannel enum. This supports up to 63
   * different channels.
   */
  AV_CHANNEL_ORDER_NATIVE,
  /**
   * The channel order does not correspond to any other predefined order and
   * is stored as an explicit map. For example, this could be used to support
   * layouts with 64 or more channels, or with empty/skipped (AV_CHAN_UNUSED)
   * channels at arbitrary positions.
   */
  AV_CHANNEL_ORDER_CUSTOM,
  /**
   * The audio is represented as the decomposition of the sound field into
   * spherical harmonics. Each channel corresponds to a single expansion
   * component. Channels are ordered according to ACN (Ambisonic Channel
   * Number).
   *
   * The channel with the index n in the stream contains the spherical
   * harmonic of degree l and order m given by
   * @code{.unparsed}
   *   l   = floor(sqrt(n)),
   *   m   = n - l * (l + 1).
   * @endcode
   *
   * Conversely given a spherical harmonic of degree l and order m, the
   * corresponding channel index n is given by
   * @code{.unparsed}
   *   n = l * (l + 1) + m.
   * @endcode
   *
   * Normalization is assumed to be SN3D (Schmidt Semi-Normalization)
   * as defined in AmbiX format $ 2.1.
   */
  AV_CHANNEL_ORDER_AMBISONIC,
  /**
   * Number of channel orders, not part of ABI/API
   */
  FF_CHANNEL_ORDER_NB
};

typedef struct AVChannelCustom {
  enum AVChannel id;
  char name[16];
  void *opaque;
} AVChannelCustom;

typedef struct AVChannelLayout {
  /**
   * Channel order used in this layout.
   * This is a mandatory field.
   */
  enum AVChannelOrder order;

  /**
   * Number of channels in this layout. Mandatory field.
   */
  int nb_channels;

  /**
   * Details about which channels are present in this layout.
   * For AV_CHANNEL_ORDER_UNSPEC, this field is undefined and must not be
   * used.
   */
  union {
    /**
     * This member must be used for AV_CHANNEL_ORDER_NATIVE, and may be used
     * for AV_CHANNEL_ORDER_AMBISONIC to signal non-diegetic channels.
     * It is a bitmask, where the position of each set bit means that the
     * AVChannel with the corresponding value is present.
     *
     * I.e. when (mask & (1 << AV_CHAN_FOO)) is non-zero, then AV_CHAN_FOO
     * is present in the layout. Otherwise it is not present.
     *
     * @note when a channel layout using a bitmask is constructed or
     * modified manually (i.e.  not using any of the av_channel_layout_*
     * functions), the code doing it must ensure that the number of set bits
     * is equal to nb_channels.
     */
    uint64_t mask;
    /**
     * This member must be used when the channel order is
     * AV_CHANNEL_ORDER_CUSTOM. It is a nb_channels-sized array, with each
     * element signalling the presence of the AVChannel with the
     * corresponding value in map[i].id.
     *
     * I.e. when map[i].id is equal to AV_CHAN_FOO, then AV_CH_FOO is the
     * i-th channel in the audio data.
     *
     * When map[i].id is in the range between AV_CHAN_AMBISONIC_BASE and
     * AV_CHAN_AMBISONIC_END (inclusive), the channel contains an ambisonic
     * component with ACN index (as defined above)
     * n = map[i].id - AV_CHAN_AMBISONIC_BASE.
     *
     * map[i].name may be filled with a 0-terminated string, in which case
     * it will be used for the purpose of identifying the channel with the
     * convenience functions below. Otherise it must be zeroed.
     */
    AVChannelCustom *map;
  } u;

  /**
   * For some private data of the user.
   */
  void *opaque;
} AVChannelLayout;

#endif