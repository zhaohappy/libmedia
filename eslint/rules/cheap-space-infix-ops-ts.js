"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("@typescript-eslint/utils");
const baseRule = require('./cheap-space-infix-ops');
const UNIONS = ['|', '&'];

var createRule = utils_1.ESLintUtils.RuleCreator(name => `https://typescript-eslint.io/rules/${name}`);

function negate(f) {
  return token => !f(token);
}

function isOpeningParenToken(token) {
  return token.value === "(" && token.type === "Punctuator";
}

var isNotOpeningParenToken = negate(isOpeningParenToken);

module.exports = createRule({
    name: 'space-infix-ops',
    meta: {
        type: 'layout',
        docs: {
            description: 'Require spacing around infix operators',
            extendsBaseRule: true,
        },
        fixable: baseRule.meta.fixable,
        hasSuggestions: baseRule.meta.hasSuggestions,
        schema: baseRule.meta.schema,
        messages: {
            // @ts-expect-error -- we report on this messageId so we need to ensure it's there in case ESLint changes in future
            missingSpace: "Operator '{{operator}}' must be spaced.",
            ...baseRule.meta.messages,
        },
    },
    defaultOptions: [
        {
            int32Hint: false,
        },
    ],
    create(context) {
        const rules = baseRule.create(context);
        const sourceCode = context.getSourceCode();
        function report(operator) {
            context.report({
                node: operator,
                messageId: 'missingSpace',
                data: {
                    operator: operator.value,
                },
                fix(fixer) {
                    const previousToken = sourceCode.getTokenBefore(operator);
                    const afterToken = sourceCode.getTokenAfter(operator);
                    let fixString = '';
                    if (operator.range[0] - previousToken.range[1] === 0) {
                        fixString = ' ';
                    }
                    fixString += operator.value;
                    if (afterToken.range[0] - operator.range[1] === 0) {
                        fixString += ' ';
                    }
                    return fixer.replaceText(operator, fixString);
                },
            });
        }
        function isSpaceChar(token) {
            return (token.type === utils_1.AST_TOKEN_TYPES.Punctuator && /^[=?:]$/.test(token.value));
        }
        function checkAndReportAssignmentSpace(leftNode, rightNode) {
            if (!rightNode || !leftNode) {
                return;
            }
            const operator = sourceCode.getFirstTokenBetween(leftNode, rightNode, isSpaceChar);
            const prev = sourceCode.getTokenBefore(operator);
            const next = sourceCode.getTokenAfter(operator);
            if (!sourceCode.isSpaceBetween(prev, operator) ||
                !sourceCode.isSpaceBetween(operator, next)) {
                report(operator);
            }
        }
        /**
         * Check if it has an assignment char and report if it's faulty
         * @param node The node to report
         */
        function checkForEnumAssignmentSpace(node) {
            checkAndReportAssignmentSpace(node.id, node.initializer);
        }
        /**
         * Check if it has an assignment char and report if it's faulty
         * @param node The node to report
         */
        function checkForPropertyDefinitionAssignmentSpace(node) {
            const leftNode = node.optional && !node.typeAnnotation
                ? sourceCode.getTokenAfter(node.key)
                : node.typeAnnotation ?? node.key;
            checkAndReportAssignmentSpace(leftNode, node.value);
        }
        /**
         * Check if it is missing spaces between type annotations chaining
         * @param typeAnnotation TypeAnnotations list
         */
        function checkForTypeAnnotationSpace(typeAnnotation) {
            const types = typeAnnotation.types;
            types.forEach(type => {
                const skipFunctionParenthesis = type.type === utils_1.TSESTree.AST_NODE_TYPES.TSFunctionType
                    ? isNotOpeningParenToken
                    : 0;
                const operator = sourceCode.getTokenBefore(type, skipFunctionParenthesis);
                if (operator != null && UNIONS.includes(operator.value)) {
                    const prev = sourceCode.getTokenBefore(operator);
                    const next = sourceCode.getTokenAfter(operator);
                    if (!sourceCode.isSpaceBetween(prev, operator) ||
                        !sourceCode.isSpaceBetween(operator, next)) {
                        report(operator);
                    }
                }
            });
        }
        /**
         * Check if it has an assignment char and report if it's faulty
         * @param node The node to report
         */
        function checkForTypeAliasAssignment(node) {
            checkAndReportAssignmentSpace(node.typeParameters ?? node.id, node.typeAnnotation);
        }
        function checkForTypeConditional(node) {
            checkAndReportAssignmentSpace(node.extendsType, node.trueType);
            checkAndReportAssignmentSpace(node.trueType, node.falseType);
        }
        return {
            ...rules,
            TSEnumMember: checkForEnumAssignmentSpace,
            PropertyDefinition: checkForPropertyDefinitionAssignmentSpace,
            TSTypeAliasDeclaration: checkForTypeAliasAssignment,
            TSUnionType: checkForTypeAnnotationSpace,
            TSIntersectionType: checkForTypeAnnotationSpace,
            TSConditionalType: checkForTypeConditional,
        };
    },
});
//# sourceMappingURL=space-infix-ops.js.map