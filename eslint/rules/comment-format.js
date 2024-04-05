/**
 * @file 对注释中英文和标点符号之间的空格进行检查
 */

function isASCII(char) {
    return char.charCodeAt() < 127 && char !== ' '
}

function isChinese(char) {
    return char.charCodeAt() >= 0x4e00 && char.charCodeAt() <= 0x9fa5
}

function isEnglish(char) {
    return char.charCodeAt() >= 0x41 && char.charCodeAt() <= 0x5a
        || char.charCodeAt() >= 0x61 && char.charCodeAt() <= 0x7a
}

const ignoreChars = [' ', '"', '\'']

function isIgnoreChar(char) {
    let ignore = false
    for (let i = 0; i < ignoreChars.length; i++) {
        if (ignoreChars[i] === char) {
            ignore = true
            break
        }
    }
    return ignore
}

function check(comment, line, column, report, sourceCode) {
    const length = comment.length
    if (comment.match(/https?/g)) {
        return
    }
    if (length > 1) {
        let lastChar = comment[0]
        for (let i = 1; i < length; i++) {
            const char = comment[i]

            if (isIgnoreChar(char) || isIgnoreChar(lastChar)) {
                lastChar = char
                continue
            }

            let loc = {
                start: {
                    line,
                    column: column + i
                },
                end: {
                    line,
                    column: column + i + 1
                }
            }

            let indexStart = sourceCode.getIndexFromLoc({
                line: line,
                column: column + i
            })
            let indexEnd = sourceCode.getIndexFromLoc({
                line: line,
                column: column + i + 1
            })
            let range = {
                0: indexStart,
                1: indexStart
            }

            let replaceRange = {
                0: indexStart,
                1: indexEnd
            }

            if (isASCII(char) && isChinese(lastChar)) {
                if (char === '.' || char === ',' || char === ')' || char === '(') {
                    let newMessage
                    if (char === '.') {
                        if (i < length - 1 && comment[i+1] === '.') {
                            lastChar = char
                            continue
                        }
                        message = 'use "。" instead'
                        newMessage = "。"
                    }
                    if (char === ',') {
                        message = 'use "，" instead'
                        newMessage = "，"
                    }
                    if (char === ')') {
                        message = 'use "）" instead'
                        newMessage = "）"
                    }
                    if (char === '(') {
                        message = 'use "（" instead'
                        newMessage = "（"
                    }

                    report({
                        message,
                        loc: loc,
                        data: {
                            char
                        },
                        fix: function (fixer) {
                            return fixer.replaceTextRange(replaceRange, newMessage)
                        }
                    })
                }
                else {
                    let message = 'before char "{{ char }}" should has a space'
                    report({
                        message,
                        loc: loc,
                        data: {
                            char
                        },
                        fix: function (fixer) {
                            return fixer.insertTextBeforeRange(range, ' ')
                        }
                    })
                }
            }
            else if (lastChar === ',' && (isChinese(char) || isEnglish(char))) {
                report({
                    message: 'after "," should has a space',
                    loc: loc,
                    fix: function (fixer) {
                        return fixer.insertTextAfterRange(range, ' ')
                    }
                })
            }
            else if (isChinese(char) && isASCII(lastChar)) {
                let message = 'after char "{{ char }}" should has a space'
                report({
                    message: message,
                    loc: loc,
                    data: {
                        char: lastChar
                    },
                    fix: function (fixer) {
                        return fixer.insertTextAfterRange(range, ' ')
                    }
                })
            }

            lastChar = char
        }
    }
}

module.exports = {
    meta: {
        type: 'layout',
        docs: {},
        fixable: true,
        schema: []
    },
    create (context) {
        const sourceCode = context.getSourceCode()
        return {
            Program() {
                const comments = sourceCode.getAllComments()
                comments.forEach(comment => {
                    if (comment.type === 'Block') {
                        comment.value.split('\n').forEach((string, index) => {
                            check(string, comment.loc.start.line + index, 0, context.report, sourceCode)
                        })
                    }
                    else if (comment.type === 'Line') {
                        // column不会算上双斜杠 需要+2
                        check(comment.value, comment.loc.start.line, comment.loc.start.column + 2, context.report, sourceCode)
                    }
                })
            }
        }
    }
}