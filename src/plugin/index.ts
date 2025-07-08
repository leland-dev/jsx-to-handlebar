import { declare } from '@babel/helper-plugin-utils';
import { types as t, NodePath, PluginObj, PluginPass } from '@babel/core';
import { convertToSnakeCase } from '../utils/nameConverter';
import { BabelAPI } from './types';
import {
  JSXExpressionContainer,
  ConditionalExpression,
  Expression,
  LogicalExpression,
} from '@babel/types';
import { isFalsyNode } from './utils';

type HandleExpressionResult = (t.Expression | t.JSXExpressionContainer)[];

export default declare((api: BabelAPI): PluginObj<PluginPass> => {
  api.assertVersion(7);

  function handleLogicalExpression(
    node: LogicalExpression
  ): HandleExpressionResult {
    const operator = node.operator;
    const left = node.left;
    const right = node.right;

    if (operator === '&&') {
      // For AND, we nest the conditions
      const leftCondition = getConditionString(left);
      const rightCondition = getConditionString(right);

      return [
        t.templateLiteral(
          [
            t.templateElement({
              raw: `{{#if ${leftCondition}}}{{#if ${rightCondition}}}`,
              cooked: `{{#if ${leftCondition}}}{{#if ${rightCondition}}}`,
            }),
            t.templateElement({
              raw: `{{/if}}{{/if}}`,
              cooked: `{{/if}}{{/if}}`,
            }),
          ],
          [right]
        ),
      ];
    } else if (operator === '||') {
      throw new Error('OR operator not supported');
      // // For OR, we use else blocks
      // const leftCondition = getConditionString(left);
      // const rightCondition = getConditionString(right);

      // return t.templateLiteral(
      //   [
      //     t.templateElement({
      //       raw: `{{#if ${leftCondition}}}`,
      //       cooked: `{{#if ${leftCondition}}}`,
      //     }),
      //     t.templateElement({
      //       raw: `{{else}}{{#if ${rightCondition}}}`,
      //       cooked: `{{else}}{{#if ${rightCondition}}}`,
      //     }),
      //     t.templateElement({
      //       raw: `{{/if}}{{/if}}`,
      //       cooked: `{{/if}}{{/if}}`,
      //     }),
      //   ],
      //   [right]
      // );
    }

    throw new Error(`Unknown logical operator ${operator}`);
  }

  function handleLogicalAndExpression(
    node: LogicalExpression
  ): HandleExpressionResult {
    const left = node.left;
    const right = node.right;

    return createIfElseBlock(left, right);
  }

  function createIfBlock(
    condition: Expression | t.TemplateLiteral,
    consequent: Expression
  ): HandleExpressionResult {
    const conditionStr = t.isTemplateLiteral(condition)
      ? handleExpression(condition)
      : getConditionString(condition);
    return [
      t.templateLiteral(
        [
          t.templateElement(
            {
              raw: `{{#if ${conditionStr}}}`,
              cooked: `{{#if ${conditionStr}}}`,
            },
            false
          ),
          t.templateElement({ raw: '{{/if}}', cooked: '{{/if}}' }, true),
        ],
        [consequent]
      ),
    ];
  }

  function createIfElseBlock(
    condition: Expression,
    consequent: Expression,
    alternate?: Expression
  ): HandleExpressionResult {
    const conditionStr = getConditionString(condition);
    return [
      t.jsxExpressionContainer(t.stringLiteral(`{{#if ${conditionStr}}}`)),
      ...handleExpression(consequent),
      ...(alternate && !isFalsyNode(alternate)
        ? [
            t.jsxExpressionContainer(t.stringLiteral('{{else}}')),
            ...handleExpression(alternate),
          ]
        : []),
      t.jsxExpressionContainer(t.stringLiteral('{{/if}}')),
    ];
  }

  function createNestedIfBlock(
    left: Expression | t.TemplateLiteral,
    right: Expression | t.TemplateLiteral,
    consequent: Expression
  ): HandleExpressionResult {
    const leftStr = t.isTemplateLiteral(left) ? left : getConditionString(left);
    const rightStr = t.isTemplateLiteral(right)
      ? right
      : getConditionString(right);
    return [
      t.templateLiteral(
        [
          t.templateElement(
            {
              raw: `{{#if ${leftStr}}}{{#if ${rightStr}}}`,
              cooked: `{{#if ${leftStr}}}{{#if ${rightStr}}}`,
            },
            false
          ),
          t.templateElement(
            { raw: '{{/if}}{{/if}}', cooked: '{{/if}}{{/if}}' },
            true
          ),
        ],
        [consequent]
      ),
    ];
  }

  function createIfElseWithNestedBlock(
    left: Expression | t.TemplateLiteral,
    right: Expression | t.TemplateLiteral,
    consequent: Expression
  ): HandleExpressionResult {
    const leftStr = t.isTemplateLiteral(left) ? left : getConditionString(left);
    const rightStr = t.isTemplateLiteral(right)
      ? right
      : getConditionString(right);
    return [
      t.templateLiteral(
        [
          t.templateElement(
            { raw: `{{#if ${leftStr}}}`, cooked: `{{#if ${leftStr}}}` },
            false
          ),
          t.templateElement(
            { raw: '{{else}}{{#if ', cooked: '{{else}}{{#if ' },
            false
          ),
          t.templateElement(
            { raw: `${rightStr}}}`, cooked: `${rightStr}}}` },
            false
          ),
          t.templateElement(
            { raw: '{{/if}}{{/if}}', cooked: '{{/if}}{{/if}}' },
            true
          ),
        ],
        [consequent, consequent, consequent]
      ),
    ];
  }

  function getConditionString(node: t.Expression): string {
    if (t.isIdentifier(node)) {
      return convertToSnakeCase(node.name);
    } else if (t.isBinaryExpression(node)) {
      const left = getExpressionValue(node.left);
      const right = getExpressionValue(node.right);
      const operator = getBinaryOperator(node.operator);
      return `${left} ${right} ${operator}`;
    } else if (t.isLogicalExpression(node)) {
      const left = getConditionString(node.left);
      const right = getConditionString(node.right);
      return node.operator === '&&'
        ? `${left} ${right}`
        : `${left} || ${right}`;
    }
    return '';
  }

  function getExpressionValue(node: t.Expression | t.PrivateName): string {
    if (t.isIdentifier(node)) {
      return convertToSnakeCase(node.name);
    } else if (t.isStringLiteral(node)) {
      return `'${node.value}'`;
    } else if (t.isNumericLiteral(node)) {
      return node.value.toString();
    }
    return '';
  }

  function getBinaryOperator(operator: string): string {
    switch (operator) {
      case '>=':
        return 'gte';
      case '<=':
        return 'lte';
      case '>':
        return 'gt';
      case '<':
        return 'lt';
      case '===':
      case '==':
        return 'eq';
      case '!==':
      case '!=':
        return 'neq';
      default:
        return operator;
    }
  }

  function handleConditionalExpression(expression: ConditionalExpression) {
    const test = expression.test;
    const consequent = expression.consequent;
    const alternate = expression.alternate;

    // Handle template literals in consequent
    if (t.isTemplateLiteral(consequent)) {
      const conditionStr = getConditionString(test);

      // Build the template string by combining quasis and expressions
      let handlebarsTemplate = '';
      let quasisIndex = 0;
      let expressionsIndex = 0;

      while (quasisIndex < consequent.quasis.length) {
        // Add the quasi (static) part
        handlebarsTemplate += consequent.quasis[quasisIndex].value.raw;

        // Add the expression if there is one
        if (expressionsIndex < consequent.expressions.length) {
          const expr = consequent.expressions[expressionsIndex];
          if (t.isIdentifier(expr)) {
            handlebarsTemplate += `{{${convertToSnakeCase(expr.name)}}}`;
          }
          expressionsIndex++;
        }

        quasisIndex++;
      }

      return [
        t.stringLiteral(
          `{{#if ${conditionStr}}}${handlebarsTemplate}{{else}}{{/if}}`
        ),
      ];
    }

    // Handle logical expressions (&&, ||)
    if (t.isLogicalExpression(test)) {
      const template = handleLogicalExpression(test);
      return template;
    }

    // Handle simple conditions and binary expressions
    return createIfElseBlock(test, consequent, alternate);
  }

  function handleTemplateLiteral(node: t.TemplateLiteral) {
    const expressions = node.expressions.flatMap((expr) => {
      if (t.isExpression(expr)) {
        return handleExpression(expr);
      }

      throw new Error(`Unknown expression type ${expr.type}`);
    });
    let str = '';
    for (let i = 0; i < node.quasis.length; i++) {
      const quasi = node.quasis[i];
      const expression = expressions[i] ?? '';
      if (t.isStringLiteral(expression)) {
        str += `${quasi.value.raw}${expression.value}`;
      } else {
        str += `${quasi.value.raw}${expression}`;
      }
    }
    return t.stringLiteral(str);
  }

  function handleExpression(node: Expression): HandleExpressionResult {
    if (t.isIdentifier(node)) {
      const name = node.name;
      const snakeCaseName = convertToSnakeCase(name);
      return [t.stringLiteral(`{{${snakeCaseName}}}`)];
    }

    if (t.isTemplateLiteral(node)) {
      return [handleTemplateLiteral(node)];
    }

    // Handle conditional expressions
    if (t.isConditionalExpression(node)) {
      const result = handleConditionalExpression(node);
      if (result) {
        return result;
      }
    }

    // Handle direct logical expressions (without ternary)
    if (t.isLogicalExpression(node)) {
      return handleLogicalAndExpression(node);
    }

    return [node];
  }

  const handleResult = (result: HandleExpressionResult) => {
    return result.map((expr) => {
      if (t.isTemplateLiteral(expr)) {
        return handleTemplateLiteral(expr);
      }

      if (t.isStringLiteral(expr)) {
        return t.jsxExpressionContainer(expr);
      }

      return expr;
    });
  };

  return {
    name: 'jsx-to-handlebars',
    visitor: {
      // Transform JSX expressions containing variables
      JSXExpressionContainer(path: NodePath<JSXExpressionContainer>) {
        const expression = path.get('expression');

        if (t.isStringLiteral(expression.node)) {
          return;
        }

        if (t.isJSXEmptyExpression(expression.node)) {
          return;
        }

        const expressionResult = handleExpression(expression.node);
        if (
          expressionResult.length === 1 &&
          expressionResult[0] === expression.node
        ) {
          return;
        }

        const result = handleResult(expressionResult);
        path.replaceWith(result[0]);
        let next: NodePath = path;
        result.slice(1).forEach((expr) => {
          next.insertAfter(expr);
          next = next.getNextSibling();
        });
      },

      // Remove TypeScript interfaces and type annotations
      TSInterfaceDeclaration(path) {
        path.remove();
      },

      TSTypeAnnotation(path) {
        path.remove();
      },

      FunctionDeclaration(path) {
        const params = path.get('params');
        params.forEach((param) => {
          param.remove();
        });
      },

      ArrowFunctionExpression(path) {
        const params = path.get('params');
        params.forEach((param) => {
          param.remove();
        });
      },
    },
  };
});
