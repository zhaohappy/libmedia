/**
 * @file var 声明检查
 */

module.exports = {
    meta: {
        type: 'layout',
        docs: {},
        fixable: false,
        schema: [
            {
                enum: ['always', 'never']
            }
        ]
    },
    create (context) {

        const visitors = {}
        
        if (context.options[0] === 'always') {
            visitors['VariableDeclaration[kind="var"]'] = function (node) {
                node.declarations.forEach(declaration => {
                    const name = declaration.id.name
                    context.report({
                        node: declaration.id,
                        message: 'can not use var to variable name \'{{ name }}\'',
                        data: {
                            name
                        }
                    })
                })
            }
        }

        return visitors
    }
}