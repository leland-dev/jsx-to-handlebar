import { ReactNode } from 'react';

export interface EmailTemplate {
  (props: Record<string, unknown> | Record<string, never>): ReactNode;
  PreviewProps?: Record<string, unknown>;
}

export const isEmailTemplate = (val: unknown): val is EmailTemplate => {
  return typeof val === 'function';
};
