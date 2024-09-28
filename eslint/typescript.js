/**
 * @file ts 配置，继承 js 配置
 */

const ts = require('typescript')
const nodeUtils = require('../node_modules/@typescript-eslint/typescript-estree/dist/node-utils')

const nodeCanBeDecorated = nodeUtils.nodeCanBeDecorated

nodeUtils.nodeCanBeDecorated = function(node) {
    if (ts.isFunctionDeclaration(node)) {
        let hasDeasync = false
        let decoratorCount = 0
        ts.visitNodes(node.modifiers, (node) => {
            if (ts.isDecorator(node)) {
                decoratorCount++
                if (ts.isIdentifier(node.expression) && node.expression.escapedText === 'deasync') {
                    hasDeasync = true
                }
            }
        })
        if (hasDeasync && decoratorCount === 1) {
            return true
        }
        return false
    }
    else if (ts.isMethodDeclaration(node)) {
        let hasDeasync = false
        let decoratorCount = 0
        ts.visitNodes(node.modifiers, (node) => {
            if (ts.isDecorator(node)) {
                decoratorCount++
                if (ts.isIdentifier(node.expression) && node.expression.escapedText === 'deasync') {
                    hasDeasync = true
                }
            }
        })
        if (hasDeasync && decoratorCount === 1) {
            const { parent } = node;
            return ts.isClassDeclaration(parent) || ts.isClassLike(parent)
        }
    }
    return nodeCanBeDecorated(node)
}

const eslintConfig = {
	env: {
		es6: true,
		node: true,
		browser: true,
		worker: true,
		amd: true
	},
    parser: '@typescript-eslint/parser',
	plugins: [
        '@typescript-eslint'
    ],
    extends: ['./javascript.js'],
	settings: {},
	parserOptions: {
		ecmaVersion: 2019,
		sourceType: 'module',
		ecmaFeatures: {
			impliedStrict: true,
			jsx: true
		},
		lib: ['es2019']
	},
	globals: {
		NodeJS: 'readonly'
	},
	rules: {
        /**
         * 类型 `:` 空格，左边无空格，右边有一个空格
         */
        '@typescript-eslint/type-annotation-spacing': 2,
        /**
         * 优先使用 const 声明变量
         */
        '@typescript-eslint/prefer-as-const': 1,
        /**
         * 禁用 var 声明变量
         */
        'var-disable': [2, 'always'],
        /**
         * 枚举命名规范
         */
        // 'enum-case': 1,
        /**
         * 4 空格缩进
         */
        '@typescript-eslint/indent': [2, 2, {
            SwitchCase: 1,
            VariableDeclarator: 2,
            outerIIFEBody: 0,
            MemberExpression: 1,
            ArrayExpression: 1,
            ObjectExpression: 1,
            ImportDeclaration: 1,
            ignoredNodes: [
                'FunctionExpression > .params[decorators.length > 0]',
                'FunctionExpression > .params > :matches(Decorator, :not(:first-child))',
                'ClassBody.body > PropertyDefinition[decorators.length > 0] > .key'
            ],
        }],
        /**
         * 二元运算符左右两侧必须有空格
         */
        'cheap-space-infix-ops-ts': [2, {
            int32Hint: true
        }],
        /**
         * `,` 前不允许出现空格，如果不位于行尾，`,` 后必须跟一个空格
         */
		'@typescript-eslint/comma-spacing': [2, {
			before: false,
			after: true
		}],
        /**
         * 禁止在函数标识符和其调用之间有空格
         */
		'@typescript-eslint/func-call-spacing': [2, 'never'],
        /**
         * 关键字前后需要有空格
         */
		'@typescript-eslint/keyword-spacing': [2, {
			before: true,
			after: true
		}],
        /**
         * function 的左括号之前的空格
         * 具名函数无空格 function foo() {}
         * 匿名函数有空格 const bar = function () {}
         * 异步箭头函数有空格 const foo = async () => 1
         */
		'@typescript-eslint/space-before-function-paren': [2, {
			'anonymous': 'always',
			'named': 'never',
			'asyncArrow': 'always'
		}]
	}
}

module.exports = eslintConfig
