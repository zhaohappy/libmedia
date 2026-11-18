import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { compileFunction } from 'node:vm'

export const checkout = resolve(process.env.LIBMEDIA_TEST_SOURCE ?? fileURLToPath(new URL('../../../', import.meta.url)))
export const ts = createRequire(import.meta.url)('typescript')

export function readSource(path) {
  const file = resolve(checkout, 'packages', path)
  return ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest)
}

export function getClass(source, name) {
  const declaration = source.statements.find((node) => ts.isClassDeclaration(node) && node.name?.text === name)
  assert.ok(declaration, `Class ${name} missing from ${source.fileName}`)
  return declaration
}

export function classSource(path, name, names, alias = name) {
  const source = readSource(path)
  const declaration = getClass(source, name)
  const members = declaration.members.filter((node) => names.includes(node.name?.getText(source)))
  for (const name of names) {
    assert.ok(members.some((node) => node.name?.getText(source) === name), `Member ${name} missing from ${source.fileName}`)
  }
  return `class ${alias} {\n${members.map((node) => node.getText(source)).join('\n')}\n}`
}

export function functionSource(source, names) {
  return names.map((name) => {
    const node = source.statements.find((node) => ts.isFunctionDeclaration(node) && node.name?.text === name)
    assert.ok(node, `Function ${name} missing from ${source.fileName}`)
    return node.getText(source).replace(/^export /, '')
  }).join('\n')
}

export function transpile(source, compilerOptions = {}) {
  const result = ts.transpileModule(source, {
    reportDiagnostics: true,
    compilerOptions: { target: ts.ScriptTarget.ES2022, ...compilerOptions }
  })
  const errors = result.diagnostics.filter((diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error)
  assert.equal(errors.length, 0, errors.map((error) => ts.flattenDiagnosticMessageText(error.messageText, '\n')).join('\n'))
  return result.outputText
}

export function evaluate(source, env = {}) {
  return compileFunction(transpile(source), Object.keys(env))(...Object.values(env))
}

export function loadClass(path, name, names, env) {
  return evaluate(`${classSource(path, name, names)}\nreturn ${name}`, env)
}
