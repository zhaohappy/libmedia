
import * as chinese from './chinese'
import * as english from './english'

import * as url from 'common/util/url'

import * as storage from '../../util/storage'


export const enum Language {
  CHINESE = 'chinese',
  CHINESE_TRADITIONAL = 'chinese_traditional',
  ENGLISH = 'english'
}

const map = {
  [Language.CHINESE]: 1,
  [Language.CHINESE_TRADITIONAL]: 1,
  [Language.ENGLISH]: 1,
}

function getSystemLanguage() {
  // @ts-ignore
  return navigator.systemLanguage || navigator.browserLanguage || navigator.userLanguage || navigator.language
}

export default function getLanguage() {
  let language = url.parseQuery(location.search).language
  if (!map[language]) {
    language = storage.get(storage.LOCAL_STORAGE_KEY_SYSTEM_LANGUAGE)
    if (!language) {
      language = getSystemLanguage().toLowerCase()
      if (language.indexOf('en') > -1) {
        language = Language.ENGLISH
      }
      else if (language.indexOf('zh-hk') > -1 || language.indexOf('zh-tw') > -1) {
        language = Language.CHINESE_TRADITIONAL
      }
      else if (language.indexOf('zh') > -1) {
        language = Language.CHINESE
      }
      else {
        language = Language.CHINESE
      }
    }
    storage.set(storage.LOCAL_STORAGE_KEY_SYSTEM_LANGUAGE, language)
  }

  switch (language) {
    case Language.CHINESE:
      return chinese
    case Language.ENGLISH:
      return english
    default:
      return chinese
  }
}
