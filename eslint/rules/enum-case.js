/**
 * @file 枚举命名规范检查
 */

module.exports = {
    meta: {
        type: 'layout',
        docs: {},
        fixable: false,
        schema: [
        
        ]
    },
    create (context) {

        const visitors = {}
        
        visitors['TSEnumDeclaration'] = function (node) {
            const name = node.id.name
            if (!/^([_A-Z][a-z0-9_]*)+$/g.test(name)) {
                context.report({
                    node: node.id,
                    message: 'enum name \'{{ name }}\' is not in pascal case',
                    data: {
                        name
                    }
                })
            }
        }
        visitors['TSEnumMember'] = function (node) {
            if (!node.computed) {
                const name = node.id.name
                if (name) {
                    if (!/^[_A-Z0-9]+$/g.test(name)) {
                        context.report({
                            node: node.id,
                            message: 'enum member name \'{{ name }}\' is not in [_A-Z0-9]',
                            data: {
                                name
                            }
                        })
                    }
                }
            }
        }

        return visitors
    }
}