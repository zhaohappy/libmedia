import assert from 'node:assert/strict'
import { test } from './helpers/test.mjs'
import { DvdVM, dvdDefaultButton } from '../../packages/avformat/src/formats/iso/dvdnav'
import { Bytes } from '../../packages/avformat/src/formats/iso/reader'
import { dvdNavigationFiles, be16 } from './helpers/iso'

const cmd = (hex: string) => Uint8Array.from(Buffer.from(hex, 'hex'))

test('DVD VM register arithmetic saturates and bitwise operations preserve 16-bit values', () => {
  const vm = new DvdVM()
  vm.run(['71000000fffe0000', '73000000000a0000'].map(cmd))
  assert.equal(vm.gprm[0], 65535)
  vm.run(['74000000ffff0000', '7400000000010000'].map(cmd))
  assert.equal(vm.gprm[0], 0)
  vm.run(['7100000000030000', '7500000001000000', '7900000001ff0000', '7a000000000f0000', '7b00000000030000'].map(cmd))
  assert.equal(vm.gprm[0], 0x10c)
  vm.run(['7600000000020000', '7700000000040000'].map(cmd))
  assert.equal(vm.gprm[0], 2)
  vm.run([cmd('7600000000000000')])
  assert.equal(vm.gprm[0], 65535)
})

test('DVD VM evaluates register comparisons, skips false links and follows Goto/Break', () => {
  const vm = new DvdVM()
  const result = vm.run(['7100000000020000', '20a6000000030003', '00a1000000020005',
    '7100000000090000', '00a2000000020000', '2006000000000002'].map(cmd))
  assert.equal(result, undefined)
  assert.equal(vm.gprm[0], 2)
  assert.deepEqual(vm.run([cmd('20a6000000020002')]), { kind: 'program', target: 2 })
})

test('DVD VM reads title system registers and supports register-based highlighted buttons', () => {
  const vm = new DvdVM()
  vm.sprm.set(5, 7)
  vm.run(['6100000000850000', '7500000004000000', '4600000000000000'].map(cmd))
  assert.equal(vm.sprm.get(8), 7 * 1024)
  assert.throws(() => vm.run([cmd('6100000000890000')]), /system register 9/)
})

test('DVD VM rejects command loops, out-of-range Goto and nondeterministic instructions', () => {
  assert.throws(() => new DvdVM().run([cmd('0001000000000001')]), /command loop/)
  assert.throws(() => new DvdVM().run([cmd('0001000000000002')]), /command line/)
  assert.throws(() => new DvdVM().run([cmd('78000000000a0000')]), /random/)
  assert.throws(() => new DvdVM().run([cmd('0000')]), /Truncated/)
})

test('DVD menu selection follows forced activation before highlighted default button', () => {
  const nav = dvdNavigationFiles()['VIDEO_TS/VTS_01_0.VOB']
  const pci = 45
  nav[pci + 113] = 2
  nav[pci + 117] = 2
  nav.set([0x20, 6, 0, 0, 0, 0, 0, 2], pci + 152 + 18)
  const vm = new DvdVM()
  assert.deepEqual(vm.run([dvdDefaultButton(new Bytes(nav), vm)]), { kind: 'program', target: 2 })
  assert.equal(vm.sprm.get(8), 2048)
  nav[pci + 117] = 3
  assert.throws(() => dvdDefaultButton(new Bytes(nav), vm), /default button/)
})

test('DVD button data must fit the PCI and agree across display groups', () => {
  const nav = dvdNavigationFiles()['VIDEO_TS/VTS_01_0.VOB']
  nav[45 + 110] = 0x30
  const vm = new DvdVM()
  assert.throws(() => dvdDefaultButton(new Bytes(nav), vm), /display groups/)
  nav[45 + 110] = 0x10
  be16(nav, 42, 100)
  assert.throws(() => dvdDefaultButton(new Bytes(nav), vm), /Truncated/)
})
