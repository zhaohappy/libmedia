#ifndef _LIBMEDIA_AVUTIL_ENCRYPTION_H_

#define _LIBMEDIA_AVUTIL_ENCRYPTION_H_

#include <stdint.h>

typedef struct AVSubsampleEncryptionInfo {
  /** The number of bytes that are clear. */
  unsigned int bytes_of_clear_data;

  /**
   * The number of bytes that are protected.  If using pattern encryption,
   * the pattern applies to only the protected bytes; if not using pattern
   * encryption, all these bytes are encrypted.
   */
  unsigned int bytes_of_protected_data;
} AVSubsampleEncryptionInfo;

/**
* This describes encryption info for a packet.  This contains frame-specific
* info for how to decrypt the packet before passing it to the decoder.
*
* The size of this struct is not part of the public ABI.
*/
typedef struct AVEncryptionInfo {
  /** The fourcc encryption scheme, in big-endian byte order. */
  uint32_t scheme;

  /**
   * Only used for pattern encryption.  This is the number of 16-byte blocks
   * that are encrypted.
   */
  uint32_t crypt_byte_block;

  /**
   * Only used for pattern encryption.  This is the number of 16-byte blocks
   * that are clear.
   */
  uint32_t skip_byte_block;

  /**
   * The ID of the key used to encrypt the packet.  This should always be
   * 16 bytes long, but may be changed in the future.
   */
  uint8_t *key_id;
  uint32_t key_id_size;

  /**
   * The initialization vector.  This may have been zero-filled to be the
   * correct block size.  This should always be 16 bytes long, but may be
   * changed in the future.
   */
  uint8_t *iv;
  uint32_t iv_size;

  /**
   * An array of subsample encryption info specifying how parts of the sample
   * are encrypted.  If there are no subsamples, then the whole sample is
   * encrypted.
   */
  AVSubsampleEncryptionInfo *subsamples;
  uint32_t subsample_count;
} AVEncryptionInfo;

/**
* This describes info used to initialize an encryption key system.
*
* The size of this struct is not part of the public ABI.
*/
typedef struct AVEncryptionInitInfo {
  /**
   * A unique identifier for the key system this is for, can be NULL if it
   * is not known.  This should always be 16 bytes, but may change in the
   * future.
   */
  uint8_t* system_id;
  uint32_t system_id_size;

  /**
   * An array of key IDs this initialization data is for.  All IDs are the
   * same length.  Can be NULL if there are no known key IDs.
   */
  uint8_t** key_ids;
  /** The number of key IDs. */
  uint32_t num_key_ids;
  /**
   * The number of bytes in each key ID.  This should always be 16, but may
   * change in the future.
   */
  uint32_t key_id_size;

  /**
   * Key-system specific initialization data.  This data is copied directly
   * from the file and the format depends on the specific key system.  This
   * can be NULL if there is no initialization data; in that case, there
   * will be at least one key ID.
   */
  uint8_t* data;
  uint32_t data_size;

  /**
   * An optional pointer to the next initialization info in the list.
   */
  struct AVEncryptionInitInfo *next;
} AVEncryptionInitInfo;

#endif