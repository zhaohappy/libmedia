
export const LOCAL_STORAGE_KEY_VOLUME = 'libmedia_volume'

export const LOCAL_STORAGE_KEY_SYSTEM_LANGUAGE = 'libmedia_system_language'

export const LOCAL_STORAGE_KEY_PLAY_RATE = 'libmedia_play_rate'

export const LOCAL_STORAGE_KEY_LOOP = 'libmedia_play_loop'

export function set(key: string, value: any) {
  localStorage.setItem(key, value)
}

export function get(key: string, defaultValue?: any) {
  const value = localStorage.getItem(key)
  return value == undefined ? defaultValue : value
}

export function remove(key: string) {
  localStorage.removeItem(key)
}
