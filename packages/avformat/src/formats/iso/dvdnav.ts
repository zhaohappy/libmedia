// SPDX-License-Identifier: LGPL-3.0-or-later
import { Bytes, check, DiscError } from './reader'
import type DiscFilesystem from './filesystem'

function unsupported(message: string): never {
  throw new DiscError(`Unsupported DVD navigation: ${message}`, -9)
}

export interface DvdAction {
  kind: 'cell' | 'program' | 'chapter' | 'pgc' | 'sub' | 'title' | 'vtsTitle' | 'menu' | 'exit'
  target: number
  domain?: number
  set?: number
  resume?: number
}

/** Bounded, deterministic DVD command evaluator. Register values are unsigned 16-bit. */
export class DvdVM {
  readonly gprm = new Uint16Array(16)
  readonly sprm = new Map<number, number>([[1, 0], [2, 62], [3, 1], [8, 1024]])
  private remaining = 10000

  private register(id: number) {
    if (id & 128) {
      const value = this.sprm.get(id & 127)
      if (value === undefined) {
        unsupported(`system register ${id & 127}`)
      }
      return value
    }
    check(id < 16, 'Invalid DVD general register')
    return this.gprm[id]
  }

  run(commands: Uint8Array[]): DvdAction | undefined {
    let pc = 0
    while (pc < commands.length) {
      if (--this.remaining < 0) {
        unsupported('command loop or instruction limit')
      }
      const b = new Bytes(commands[pc++])
      b.range(0, 8)
      const type = b.u8(0) >> 5
      const immediate = !!(b.u8(0) & 16)
      const op = b.u8(1) & 15
      const comparison = (b.u8(1) >> 4) & 7
      const operand = (at: number, imm: boolean) => imm ? b.u16(at) : this.register(b.u8(at + 1))
      const compare = (left: number, right: number) => {
        switch (comparison) {
          case 0: return true
          case 1: return !!(left & right)
          case 2: return left === right
          case 3: return left !== right
          case 4: return left >= right
          case 5: return left > right
          case 6: return left <= right
          case 7: return left < right
        }
      }
      if (type > 3) {
        unsupported(`command class ${type}`)
      }
      let condition = true
      if (comparison) {
        if (type === 2 || type === 1 && immediate) {
          condition = compare(this.register(b.u8(6)), this.register(b.u8(7)))
        }
        else {
          condition = compare(this.register(b.u8(type === 3 ? 2 : 3)), operand(type === 3 ? 6 : 4, !!(b.u8(1) & 128)))
        }
      }
      if (!condition) {
        continue
      }
      if (type === 0) {
        if (op === 2) {
          return
        }
        if (op === 1) {
          const line = b.u8(7)
          check(line > 0 && line <= commands.length, 'Invalid DVD command line')
          pc = line - 1
        }
        else if (op !== 0) {
          unsupported(`special instruction ${op}`)
        }
        continue
      }
      if (type === 3) {
        const reg = b.u8(3) & 15
        const value = operand(4, immediate)
        const old = this.gprm[reg]
        switch (b.u8(0) & 15) {
          case 0: break
          case 1: this.gprm[reg] = value; break
          case 2: this.gprm[b.u8(5) & 15] = old; this.gprm[reg] = value; break
          case 3: this.gprm[reg] = Math.min(65535, old + value); break
          case 4: this.gprm[reg] = Math.max(0, old - value); break
          case 5: this.gprm[reg] = Math.min(65535, old * value); break
          case 6: this.gprm[reg] = value ? Math.floor(old / value) : 65535; break
          case 7: this.gprm[reg] = value ? old % value : 65535; break
          case 9: this.gprm[reg] = old & value; break
          case 10: this.gprm[reg] = old | value; break
          case 11: this.gprm[reg] = old ^ value; break
          default: unsupported('random or unknown register operation')
        }
      }
      if (type === 2) {
        const operation = b.u8(0) & 15
        if (operation === 6) {
          this.sprm.set(8, operand(4, immediate))
        }
        else if (operation === 1) {
          for (let i = 1; i <= 3; i++) {
            const value = b.u8(i + 2)
            if (value & 128) {
              this.sprm.set(i, immediate ? value & 127 : this.gprm[value & 15])
            }
          }
        }
        else if (operation === 3 && !(b.u8(5) & 128)) {
          this.gprm[b.u8(5) & 15] = operand(2, immediate)
        }
        else {
          unsupported('timer, counter or unknown system operation')
        }
      }
      if (type === 1 && immediate) {
        if (op === 1) {
          return { kind: 'exit', target: 0 }
        }
        if (op === 2 || op === 3) {
          return { kind: op === 2 ? 'title' : 'vtsTitle', target: b.u8(5) & 127 }
        }
        if (op === 6 || op === 8) {
          const domain = b.u8(5) >> 6
          return { kind: 'menu', domain, target: domain === 3 ? b.u16(2) & 0x7fff : b.u8(5) & 15,
            set: domain === 2 ? b.u8(4) : undefined, resume: op === 8 ? b.u8(4) : undefined }
        }
        unsupported(`jump instruction ${op}`)
      }
      if (!op) {
        continue
      }
      if (op !== 4 && b.u8(6) >> 2) {
        this.sprm.set(8, (b.u8(6) >> 2) << 10)
      }
      switch (op) {
        case 1: return { kind: 'sub', target: b.u8(7) & 31 }
        case 4: return { kind: 'pgc', target: b.u16(6) & 0x7fff }
        case 5: return { kind: 'chapter', target: b.u16(6) & 1023 }
        case 6: return { kind: 'program', target: b.u8(7) & 127 }
        case 7: return { kind: 'cell', target: b.u8(7) }
        default: unsupported(`link instruction ${op}`)
      }
    }
  }
}

function commands(b: Bytes, pgc: number) {
  const offset = b.u16(pgc + 228)
  if (!offset) {
    return { pre: [], post: [], cell: [] } as Record<'pre' | 'post' | 'cell', Uint8Array[]>
  }
  const at = pgc + offset
  const counts = [b.u16(at), b.u16(at + 2), b.u16(at + 4)]
  const size = b.u16(at + 6) + 1
  const count = counts.reduce((sum, n) => sum + n, 0)
  check(count <= 255 && size >= 8 + count * 8, 'Invalid DVD command table')
  b.range(at, size)
  let pos = at + 8
  const lists = counts.map((n) => Array.from({ length: n }, () => {
    const result = b.range(pos, 8)
    pos += 8
    return result
  }))
  return { pre: lists[0], post: lists[1], cell: lists[2] }
}

/** Select the forced/highlighted default button without rendering a menu. */
export function dvdDefaultButton(nav: Bytes, vm: DvdVM) {
  check(nav.u32(0) === 0x1ba, 'Invalid DVD menu navigation pack')
  for (let at = 14; at + 7 < nav.data.length; at++) {
    if (nav.u32(at) !== 0x1bf || nav.u8(at + 6) !== 0) {
      continue
    }
    const pci = new Bytes(nav.range(at + 7, nav.u16(at + 4) - 1))
    const hli = 96
    check((pci.u16(hli) & 3) !== 0, 'Missing DVD menu highlight information')
    const groups = (pci.u8(hli + 14) >> 4) & 3
    const count = pci.u8(hli + 17) & 63
    check(groups > 0 && count > 0 && count <= 36 / groups, 'Invalid DVD menu button count')
    check(pci.u8(hli + 16) === 0, 'Unsupported DVD button offset')
    const selected = (pci.u8(hli + 21) & 63) || (pci.u8(hli + 20) & 63) || ((vm.sprm.get(8) || 0) >> 10) || 1
    check(selected > 0 && selected <= count, 'Invalid DVD default button')
    const command = pci.range(142 + (selected - 1) * 18 + 10, 8)
    for (let group = 1; group < groups; group++) {
      const other = pci.range(142 + (group * (36 / groups) + selected - 1) * 18 + 10, 8)
      if (command.some((value, i) => value !== other[i])) {
        unsupported('default button differs between display groups')
      }
    }
    vm.sprm.set(8, selected << 10)
    return command
  }
  unsupported('menu has no button navigation pack')
}

/** Compile the selected title's navigation to a finite cell timeline before demuxing. */
export async function dvdCellOrder(
  fs: DiscFilesystem, vmg: Bytes, b: Bytes, pgc: number,
  title: number, set: number, number: number, pgcn: number, chapterCells: number[]
) {
  const vm = new DvdVM()
  vm.sprm.set(4, title)
  vm.sprm.set(5, number)
  vm.sprm.set(6, pgcn)
  vm.sprm.set(7, 1)
  const table = commands(b, pgc)
  const cellCount = b.u8(pgc + 3)
  const programCount = b.u8(pgc + 2)
  const programs = pgc + b.u16(pgc + 230)
  const cellMap = pgc + b.u16(pgc + 232)
  let resume: number | undefined
  let menuSteps = 0

  const resolve = async (initial: DvdAction | undefined, fallback: number, ending = false): Promise<number> => {
    let action = initial
    let menu: { data: Bytes, pgc: number, domain: number } | undefined
    while (action) {
      if (++menuSteps > 1024) {
        unsupported('navigation loop or transition limit')
      }
      if (action.kind === 'exit') {
        return cellCount
      }
      if (action.kind === 'title' || action.kind === 'vtsTitle') {
        if (ending) {
          return cellCount
        }
        if (action.target !== (action.kind === 'title' ? title : number)) {
          unsupported('jump to another title')
        }
        menu = undefined
        action = vm.run(table.pre)
        fallback = chapterCells[0]
        continue
      }
      if (action.kind === 'menu' || menu && action.kind === 'pgc') {
        if (ending && !menu) {
          return cellCount
        }
        if (action.resume !== undefined) {
          resume = action.resume ? action.resume - 1 : fallback
          check(resume >= 0 && resume < cellCount, 'Invalid DVD resume cell')
        }
        const domain = action.kind === 'pgc' ? menu!.domain : action.domain
        if (domain === 0 || domain === undefined || domain === 2 && action.set && action.set !== set) {
          unsupported('menu in another title set or first-play domain')
        }
        const data = domain === 2 ? b : vmg
        const ut = data.u32(domain === 2 ? 208 : 200) * 2048
        check(ut > 0, 'Missing DVD menu table')
        data.range(ut, data.u32(ut + 4) + 1)
        check(data.u16(ut) > 0, 'Missing DVD menu language unit')
        const pgcit = ut + data.u32(ut + 12)
        data.range(pgcit, data.u32(pgcit + 4) + 1)
        const count = data.u16(pgcit)
        let index = action.target
        if (action.kind === 'menu' && domain !== 3) {
          index = 0
          for (let i = 0; i < count; i++) {
            if (data.u8(pgcit + 8 + i * 8) === (128 | action.target)) {
              index = i + 1; break
            }
          }
        }
        check(index > 0 && index <= count, 'Invalid DVD menu PGC')
        const at = pgcit + data.u32(pgcit + 12 + (index - 1) * 8)
        data.range(at, 236)
        menu = { data, pgc: at, domain: domain === 2 ? 2 : 3 }
        action = vm.run(commands(data, at).pre)
        if (!action && data.u8(at + 3)) {
          const path = domain === 2 ? `VIDEO_TS/VTS_${String(set).padStart(2, '0')}_0.VOB` : 'VIDEO_TS/VIDEO_TS.VOB'
          const file = await fs.get(path)
          check(file && !file.directory, 'Missing DVD menu VOB')
          const map = at + data.u16(at + 232)
          const sector = data.u32(map + 8)
          const nav = new Bytes(await fs.reader.file(file, BigInt(sector) * 2048n, 2048))
          action = vm.run([dvdDefaultButton(nav, vm)])
          if (!action) {
            unsupported('default button does not leave the menu')
          }
        }
        if (!action) {
          action = vm.run(commands(data, at).post)
        }
        if (!action) {
          unsupported('menu does not return to the selected title')
        }
        continue
      }
      if (menu) {
        if (action.kind === 'sub' && action.target === 13) {
          action = vm.run(commands(menu.data, menu.pgc).post)
          if (!action) {
            unsupported('menu tail has no title destination')
          }
          continue
        }
        if (action.kind === 'sub' && action.target === 16) {
          if (resume === undefined) {
            unsupported('resume without a title call')
          }
          return resume
        }
        unsupported(`menu ${action.kind} link ${action.target}`)
      }
      switch (action.kind) {
        case 'cell': return checkedCell(action.target - 1)
        case 'program':
          check(action.target > 0 && action.target <= programCount, 'Invalid DVD linked program')
          return checkedCell(b.u8(programs + action.target - 1) - 1)
        case 'chapter':
          check(action.target > 0 && action.target <= chapterCells.length, 'Invalid DVD linked chapter')
          return checkedCell(chapterCells[action.target - 1])
        case 'pgc':
          if (action.target !== pgcn) {
            unsupported('link to another title PGC')
          }
          action = vm.run(table.pre)
          fallback = chapterCells[0]
          continue
        case 'sub':
          if (action.target === 0) {
            return fallback
          }
          if (action.target === 2) {
            return fallback
          }
          if (action.target === 13) {
            return cellCount
          }
          unsupported(`title sub-link ${action.target}`)
      }
    }
    return checkedCell(fallback, true)
  }
  const checkedCell = (cell: number, allowEnd = false) => {
    check(cell >= 0 && cell < cellCount + Number(allowEnd), 'Invalid DVD linked cell')
    return cell
  }
  let cell = await resolve(vm.run(table.pre), chapterCells[0])
  const order: number[] = []
  const visited = new Set<string>()
  while (cell < cellCount) {
    if (order.length >= 4096) {
      unsupported('cell loop or title length limit')
    }
    const state = JSON.stringify([cell, [...vm.gprm], [...vm.sprm].sort((a, b) => a[0] - b[0])])
    if (visited.has(state)) {
      unsupported('repeated cell and register state')
    }
    visited.add(state)
    order.push(cell)
    vm.sprm.set(7, Math.max(1, chapterCells.filter((start) => start <= cell).length))
    const command = b.u8(cellMap + cell * 24 + 3)
    check(command <= table.cell.length, 'Invalid DVD cell command reference')
    let action = command ? vm.run([table.cell[command - 1]]) : undefined
    const next = cell + 1
    if (!action && next === cellCount) {
      action = vm.run(table.post)
    }
    cell = await resolve(action, next, next === cellCount)
  }
  return order
}
