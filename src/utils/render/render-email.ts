import { babelPlugin } from './esbuild/babel-plugin';
import { getEmailComponent } from './get-email-component';
import path from 'path';

export const renderEmail = async (
  srcPath: string
): Promise<{ result: string } | { error: string }> => {
  const componentResult = await getEmailComponent(srcPath, babelPlugin);
  if ('error' in componentResult) {
    return { error: `Failed while rendering ${path.basename(srcPath)}` };
  }

  const { emailComponent: Email, createElement, render } = componentResult;

  const previewProps = Email.PreviewProps || {};
  const EmailComponent = Email as React.FC;

  if (EmailComponent) {
    const markup = await render(createElement(EmailComponent, previewProps), {
      pretty: true,
    });

    return { result: markup };
  } else {
    return { error: `No component found in ${path.basename(srcPath)}` };
  }
};
