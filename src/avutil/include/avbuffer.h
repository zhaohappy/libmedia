#ifndef _LIBMEDIA_AVUTIL_AVBUFFER_H_

#define _LIBMEDIA_AVUTIL_AVBUFFER_H_


#include <stddef.h>
#include <stdint.h>
#include "wasmatomic.h"
#include "wasmpthread.h"

enum AVBufferFlags {
  AV_BUFFER_FLAGS_NONE = 0,
  AV_BUFFER_FLAGS_READONLY = 1 << 0
};

typedef struct AVBuffer {
  uint8_t *data; /**< data described by this buffer */
  size_t size; /**< size of data in bytes */

  /**
   *  number of existing AVBufferRef instances referring to this buffer
   */
  atomic_uint refcount;

  /**
   * a callback for freeing the data
   */
  void (*free)(void *opaque, uint8_t *data);

  /**
   * an opaque pointer, to be used by the freeing callback
   */
  void *opaque;

  /**
   * A combination of AV_BUFFER_FLAG_*
   */
  int flags;

  /**
   * A combination of BUFFER_FLAG_*
   */
  int flags_internal;
};

typedef struct AVBufferRef {
  AVBuffer *buffer;

  /**
   * The data buffer. It is considered writable if and only if
   * this is the only reference to the buffer, in which case
   * av_buffer_is_writable() returns 1.
   */
  uint8_t *data;
  /**
   * Size of data in bytes.
   */
  size_t   size;
} AVBufferRef;


typedef struct BufferPoolEntry {
  uint8_t *data;

  /*
    * Backups of the original opaque/free of the AVBuffer corresponding to
    * data. They will be used to free the buffer when the pool is freed.
    */
  void *opaque;
  void (*free)(void *opaque, uint8_t *data);

  AVBufferPool *pool;
  struct BufferPoolEntry *next;

  /*
    * An AVBuffer structure to (re)use as AVBuffer for subsequent uses
    * of this BufferPoolEntry.
    */
  AVBuffer buffer;
} BufferPoolEntry;

struct AVBufferPool {
  wasm_pthread_mutex_t mutex;
  BufferPoolEntry *pool;

  /*
    * This is used to track when the pool is to be freed.
    * The pointer to the pool itself held by the caller is considered to
    * be one reference. Each buffer requested by the caller increases refcount
    * by one, returning the buffer to the pool decreases it by one.
    * refcount reaches zero when the buffer has been uninited AND all the
    * buffers have been released, then it's safe to free the pool and all
    * the buffers in it.
    */
  atomic_uint refcount;

  size_t size;
  void *opaque;
  AVBufferRef* (*alloc)(size_t size);
  AVBufferRef* (*alloc2)(void *opaque, size_t size);
  void         (*pool_free)(void *opaque);
};

#endif