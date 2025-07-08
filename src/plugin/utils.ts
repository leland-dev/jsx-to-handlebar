import * as t from '@babel/types';

const isUndefinedLiteral = (node: t.Node): boolean => {
  return t.isIdentifier(node) && node.name === 'undefined';
};

export const isFalsyNode = (node: t.Node): boolean => {
  return (
    t.isNullLiteral(node) ||
    (t.isBooleanLiteral(node) && !node.value) ||
    isUndefinedLiteral(node)
  );
};
