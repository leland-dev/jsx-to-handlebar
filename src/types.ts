import { PluginObj, PluginPass } from '@babel/core';
import { NodePath } from '@babel/traverse';
import {
  JSXExpressionContainer,
  TSInterfaceDeclaration,
  TSTypeAnnotation,
  Expression,
  BinaryExpression,
  LogicalExpression,
  ConditionalExpression,
  StringLiteral,
  NumericLiteral,
  Identifier,
} from '@babel/types';

export interface BabelAPI {
  assertVersion(version: number): void;
}

export interface JSXToHandlebarsPlugin extends PluginObj<PluginPass> {
  name: string;
  visitor: {
    JSXExpressionContainer: (path: NodePath<JSXExpressionContainer>) => void;
    TSInterfaceDeclaration: (path: NodePath<TSInterfaceDeclaration>) => void;
    TSTypeAnnotation: (path: NodePath<TSTypeAnnotation>) => void;
  };
}

export type ExpressionNode =
  | StringLiteral
  | NumericLiteral
  | Identifier
  | BinaryExpression
  | LogicalExpression
  | ConditionalExpression;
