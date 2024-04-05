/**
 * @file 大驼峰风格检查
 */

module.exports = {
    meta: {
        type: 'layout',
        docs: {},
        fixable: false,
        schema: [
            {
                type: 'object',
                properties: {
                    className: {
                        type: 'boolean'
                    },
                    letVariable: {
                        type: 'boolean'
                    }
                },
                additionalProperties: false
            }
        ]
    },
    create (context) {

        const visitors = {}
        
        if (context.options[0].className) {
            visitors['ClassDeclaration'] = function (node) {
                const className = node.id.name
                if (!/^([_A-Z][a-z0-9_]*)+$/g.test(className)) {
                    context.report({
                        node: node.id,
                        message: 'class name \'{{ className }}\' is not in pascal case',
                        data: {
                            className
                        }
                    })
                }
            }
        }
        if (context.options[0].letVariable === false) {
            visitors['VariableDeclaration[kind="let"]'] = function (node) {
                node.declarations.forEach(declaration => {
                    const name = declaration.id.name
                    if (/^([_A-Z][a-z0-9_]*)+$/g.test(name)) {
                        context.report({
                            node: declaration.id,
                            message: 'let variable name \'{{ name }}\' can not in pascal case',
                            data: {
                                name
                            }
                        })
                    }
                })
            }
        }
        return visitors
    }
}