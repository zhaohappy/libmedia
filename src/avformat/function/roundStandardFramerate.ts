import { Rational } from 'avutil/struct/rational'
import { avQ2D, avReduce } from 'avutil/util/rational'

const MAX_STD_FRAMERATE = 30 * 12 + 30 + 3 + 6

function getStdFramerate(index: number) {
  if (index < 30 * 12) {
    return (index + 1) * 1001
  }
  index -= 30 * 12
  if (index < 30) {
    return (index + 31) * 1001 * 12
  }
  index -= 30
  if (index < 3) {
    return [80, 120, 240][index] * 1001 * 12
  }
  index -= 3
  return [24, 30, 60, 12, 15, 48][index] * 1000 * 12
}

export default function roundStandardFramerate(framerate: Rational) {
  let bestFps = 0
  let bestError = 0.01
  for (let i = 0; i < MAX_STD_FRAMERATE; i++) {
    const error = Math.abs(avQ2D(framerate) / avQ2D({ num: getStdFramerate(i), den: 12 * 1001}) - 1)
    if (error < bestError) {
      bestError = error
      bestFps = getStdFramerate(i)
    }
  }
  if (bestFps) {
    const f = { num: bestFps, den: 12 * 1001}
    avReduce(f)
    framerate.num = f.num
    framerate.den = f.den
  }
}
