import { declare } from '@babel/helper-plugin-utils';
import { types as t, NodePath, PluginObj, PluginPass } from '@babel/core';
import { convertToSnakeCase } from './utils/nameConverter';
import { BabelAPI, JSXToHandlebarsPlugin, ExpressionNode } from './types';
import {
  JSXExpressionContainer,
  ConditionalExpression,
  BinaryExpression,
  StringLiteral,
  NumericLiteral,
  Expression,
  LogicalExpression,
} from '@babel/types';

export default declare((api: BabelAPI): PluginObj<PluginPass> => {
  api.assertVersion(7);

  function handleLogicalExpression(
    path: NodePath<t.LogicalExpression>
  ): t.Expression {
    const operator = path.node.operator;
    const left = path.node.left;
    const right = path.node.right;

    if (operator === '&&') {
      // For AND, we nest the conditions
      const leftCondition = getConditionString(left);
      const rightCondition = getConditionString(right);

      return t.templateLiteral(
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
        [path.node.right]
      );
    } else if (operator === '||') {
      // For OR, we use else blocks
      const leftCondition = getConditionString(left);
      const rightCondition = getConditionString(right);

      return t.templateLiteral(
        [
          t.templateElement({
            raw: `{{#if ${leftCondition}}}`,
            cooked: `{{#if ${leftCondition}}}`,
          }),
          t.templateElement({
            raw: `{{else}}{{#if ${rightCondition}}}`,
            cooked: `{{else}}{{#if ${rightCondition}}}`,
          }),
          t.templateElement({
            raw: `{{/if}}{{/if}}`,
            cooked: `{{/if}}{{/if}}`,
          }),
        ],
        [path.node.right]
      );
    }

    return path.node;
  }

  function createIfBlock(
    condition: Expression | t.TemplateLiteral,
    consequent: Expression
  ): t.TemplateLiteral {
    const conditionStr = t.isTemplateLiteral(condition)
      ? handleExpression(condition)
      : getConditionString(condition);
    return t.templateLiteral(
      [
        t.templateElement(
          { raw: `{{#if ${conditionStr}}}`, cooked: `{{#if ${conditionStr}}}` },
          false
        ),
        t.templateElement({ raw: '{{/if}}', cooked: '{{/if}}' }, true),
      ],
      [consequent]
    );
  }

  function createIfElseBlock(
    condition: Expression | t.TemplateLiteral,
    consequent: Expression,
    alternate?: Expression
  ): t.TemplateLiteral {
    const conditionStr = t.isTemplateLiteral(condition)
      ? condition
      : getConditionString(condition);
    return t.templateLiteral(
      [
        t.templateElement(
          { raw: `{{#if ${conditionStr}}}`, cooked: `{{#if ${conditionStr}}}` },
          false
        ),
        t.templateElement({ raw: '{{else}}', cooked: '{{else}}' }, false),
        t.templateElement({ raw: '{{/if}}', cooked: '{{/if}}' }, true),
      ],
      [consequent, alternate || t.nullLiteral()]
    );
  }

  function createNestedIfBlock(
    left: Expression | t.TemplateLiteral,
    right: Expression | t.TemplateLiteral,
    consequent: Expression
  ): t.TemplateLiteral {
    const leftStr = t.isTemplateLiteral(left) ? left : getConditionString(left);
    const rightStr = t.isTemplateLiteral(right)
      ? right
      : getConditionString(right);
    return t.templateLiteral(
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
    );
  }

  function createIfElseWithNestedBlock(
    left: Expression | t.TemplateLiteral,
    right: Expression | t.TemplateLiteral,
    consequent: Expression
  ): t.TemplateLiteral {
    const leftStr = t.isTemplateLiteral(left) ? left : getConditionString(left);
    const rightStr = t.isTemplateLiteral(right)
      ? right
      : getConditionString(right);
    return t.templateLiteral(
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
    );
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

  function handleConditionalExpression(
    expression: NodePath<ConditionalExpression>
  ) {
    const test = expression.node.test;
    const consequent = expression.node.consequent;
    const alternate = expression.node.alternate;

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

      return t.jsxExpressionContainer(
        t.stringLiteral(
          `{{#if ${conditionStr}}}${handlebarsTemplate}{{else}}{{/if}}`
        )
      );
    }

    // Handle logical expressions (&&, ||)
    if (t.isLogicalExpression(test)) {
      const testPath = expression.get('test') as NodePath<t.LogicalExpression>;
      const template = handleLogicalExpression(testPath);
      return t.jsxExpressionContainer(template);
    }

    // Handle simple conditions and binary expressions
    return t.jsxExpressionContainer(
      createIfElseBlock(test, consequent, alternate)
    );
  }

  function handleExpression(path: NodePath<Expression>) {
    if (path.isIdentifier()) {
      const name = path.node.name;
      const snakeCaseName = convertToSnakeCase(name);
      path.replaceWith(
        t.jsxExpressionContainer(t.stringLiteral(`{{${snakeCaseName}}}`))
      );
      return;
    }

    if (path.isTemplateLiteral()) {
      const conditionStr = getConditionString(path.node.quasis[0]);
      path.replaceWith(
        t.jsxExpressionContainer(t.stringLiteral(`{{#if ${conditionStr}}}`))
      );
      return;
    }

    // Handle conditional expressions
    if (path.isConditionalExpression()) {
      const result = handleConditionalExpression(path);
      if (result) {
        path.replaceWith(result);
      }
      return;
    }

    // Handle direct logical expressions (without ternary)
    if (path.isLogicalExpression()) {
      const template = handleLogicalExpression(path);
      path.replaceWith(t.jsxExpressionContainer(template));
      return;
    }
  }

  return {
    name: 'jsx-to-handlebars',
    visitor: {
      // Transform JSX expressions containing variables
      JSXExpressionContainer(path: NodePath<JSXExpressionContainer>) {
        const expression = path.get('expression');

        // Handle simple identifiers (variables)
        if (expression.isIdentifier()) {
          const name = expression.node.name;
          const snakeCaseName = convertToSnakeCase(name);
          path.replaceWith(
            t.jsxExpressionContainer(t.stringLiteral(`{{${snakeCaseName}}}`))
          );
          return;
        }

        // Handle conditional expressions
        if (expression.isConditionalExpression()) {
          const result = handleConditionalExpression(expression);
          if (result) {
            path.replaceWith(result);
          }
          return;
        }

        // Handle direct logical expressions (without ternary)
        if (expression.isLogicalExpression()) {
          const template = handleLogicalExpression(expression);
          path.replaceWith(t.jsxExpressionContainer(template));
          return;
        }
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
