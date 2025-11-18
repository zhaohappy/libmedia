#ifndef _LIBMEDIA_AVUTIL_AVDICT_H_

#define _LIBMEDIA_AVUTIL_AVDICT_H_

enum AVDictFlags {
  AV_DICT_FLAG_MATCH_CASE = 1,
  AV_DICT_FLAG_IGNORE_SUFFIX = 2,
  AV_DICT_FLAG_DONT_OVERWRITE = 16,
  AV_DICT_FLAG_APPEND = 32,
  AV_DICT_FLAG_MULTIKEY = 64
};

typedef struct AVDictionary {
  int count;
  AVDictionaryEntry *elems;
} AVDictionary;

typedef struct AVDictionaryEntry {
  char *key;
  char *value;
} AVDictionaryEntry;

#endif