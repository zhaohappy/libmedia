
const AssTags = [
  'b', 'i', 'u', 's', 'fsp',
  'k', 'K', 'kf', 'ko', 'kt',
  'fe', 'q', 'p', 'pbo', 'a', 'an',
  'fscx', 'fscy', 'fax', 'fay', 'frx', 'fry', 'frz', 'fr',
  'be', 'blur', 'bord', 'xbord', 'ybord', 'shad', 'xshad', 'yshad',
]

export const AssTagRegex = AssTags.map((tag) => {
  return {
    name: tag,
    regex: new RegExp(`^${tag}-?\\d`)
  }
})
