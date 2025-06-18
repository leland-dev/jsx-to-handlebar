import { describe, it, expect } from 'vitest';
import { transformSync } from '@babel/core';
import plugin from '../src';
import prettier from 'prettier';

describe('babel-plugin-jsx-to-handlebars', () => {
  const transform = (code: string): string => {
    const output = transformSync(code, {
      plugins: [plugin],
      parserOpts: {
        plugins: ['jsx', 'typescript'],
      },
    })?.code;
    expect(output).toBeDefined();

    return output ?? '';
  };

  const expectEqual = async (expected: string, actual: string) => {
    const formattedExpected = await prettier.format(expected, {
      parser: 'typescript',
    });
    const formattedActual = await prettier.format(actual, {
      parser: 'typescript',
    });
    expect(formattedExpected).toBe(formattedActual);
  };

  describe('Variable transformation', () => {
    it('should transform simple variable expressions', async () => {
      const input = '<div>{firstName}</div>';
      const output = transform(input);
      await expectEqual(output, '<div>{"{{first_name}}"}</div>');
    });

    it('should handle nested camelCase variables', async () => {
      const input = '<div>{userProfileData}</div>';
      const output = transform(input);
      await expectEqual(output, '<div>{"{{user_profile_data}}"}</div>');
    });

    it('should handle nested variables in strings', async () => {
      const input = `<Link href={\`\${applicantBaseUrl}/inbox\`}>Inbox</Link>`;
      const output = transform(input);
      await expectEqual(
        output,
        `<Link href={"{{applicant_base_url}}/inbox"}>Inbox</Link>`
      );
    });
  });

  describe('Conditional transformation', () => {
    it('should transform simple ternary expressions', async () => {
      const input = `
        <div>
          {isAdmin ? (
            <span>Admin {firstName}</span>
          ) : (
            <span>User</span>
          )}
        </div>
      `;
      const output = transform(input);
      await expectEqual(
        output,
        `<div>
          {"{{#if is_admin}}"}
          <span>Admin {"{{first_name}}"}</span>
          {"{{else}}"}
          <span>User</span>
          {"{{/if}}"}
        </div>`
      );
    });

    it('should transform conditional strings', async () => {
      const input = `
        <div>
          Your subscription of {skuName}{' '}
          {coachFirstName ? \`with \${coachFirstName}\` : ''} has been
          successfully canceled. You'll have access to the existing coaching
          time on your balance until it expires.
        </div>`;
      const output = transform(input);
      await expectEqual(
        output,
        `<div>
          Your subscription of {"{{sku_name}}"}{' '}
          {"{{#if coach_first_name}}with {{coach_first_name}}{{else}}{{/if}}"}{' '}
          has been
          successfully canceled. You'll have access to the existing coaching
          time on your balance until it expires.
        </div>`
      );
    });

    // it('should transform nested logical AND expressions', async () => {
    //   const input = `
    //     <div>
    //       {isAdmin && isPremium && isActive ? (
    //         <span>Active Premium Admin</span>
    //       ) : (
    //         <span>Regular User</span>
    //       )}
    //     </div>
    //   `;
    //   const output = transform(input);
    //   await expectEqual(
    //     output,
    //     `<div>
    //     {"{{#if is_admin}}"}
    //     {"{{#if is_premium}}"}
    //     {"{{#if is_active}}"}
    //     <span>Active Premium Admin</span>
    //     {"{{else}}"}
    //     <span>Regular User</span>
    //     {"{{/if}}"}
    //     {"{{/if}}"}
    //     {"{{/if}}"}
    //   </div>`
    //   );
    // });

    // it('should not transform nested logical OR expressions', () => {
    //   const input = `
    //     <div>
    //       {isAdmin || (isModerator && hasPermission) ? (
    //         <span>Has Access</span>
    //       ) : (
    //         <span>No Access</span>
    //       )}
    //     </div>
    //   `;
    //   const output = transform(input);
    //   expectEqual(
    //     output,
    //     `<div>
    //     {{#if is_admin}}
    //     <span>Has Access</span>
    //     {{else}}
    //     {{#if is_moderator}}
    //     {{#if has_permission}}
    //     <span>Has Access</span>
    //     {{else}}
    //     <span>No Access</span>
    //     {{/if}}
    //     {{/if}}
    //     {{/if}}`
    //   );
    // });

    // it('should transform mixed logical expressions', () => {
    //   const input = `
    //     <div>
    //       {(isAdmin && hasPermission) || (isModerator && isActive) ? (
    //         <span>Has Access</span>
    //       ) : (
    //         <span>No Access</span>
    //       )}
    //     </div>
    //   `;
    //   const output = transform(input);
    //   expectEqual(
    //     output,
    //     `<div>
    //     {{#if is_admin}}
    //     {{#if has_permission}}
    //     <span>Has Access</span>
    //     {{else}}
    //     <span>No Access</span>
    //     {{/if}}
    //     {{else}}
    //     {{#if is_moderator}}
    //     {{#if is_active}}`
    //   );
    // });

    // it('should transform direct logical expressions', () => {
    //   const input = `
    //     <div>
    //       {isAdmin && isPremium && <span>Premium Admin Features</span>}
    //     </div>
    //   `;
    //   const output = transform(input);
    //   expect(output).toContain('{{#if is_admin}}');
    //   expect(output).toContain('{{#if is_premium}}');
    //   expect(output).toContain('<span>Premium Admin Features</span>');
    //   expect(output).toMatch(/\{\{\/if\}\}.*\{\{\/if\}\}/);
    // });

    // it('should transform nested comparison expressions', () => {
    //   const input = `
    //     <div>
    //       {age >= 18 && userType === 'premium' ? (
    //         <span>Adult Premium User</span>
    //       ) : (
    //         <span>Regular User</span>
    //       )}
    //     </div>
    //   `;
    //   const output = transform(input);
    //   expect(output).toContain("{{#if age '18' gte}}");
    //   expect(output).toContain("{{#if user_type 'premium'}}");
    //   expect(output).toMatch(/\{\{\/if\}\}.*\{\{\/if\}\}/);
    // });

    // it('should transform complex nested conditions', () => {
    //   const input = `
    //     <div>
    //       {(age >= 18 && userType === 'premium') || (isAdmin && hasPermission) ? (
    //         <span>Has Access</span>
    //       ) : (
    //         <span>No Access</span>
    //       )}
    //     </div>
    //   `;
    //   const output = transform(input);
    //   expect(output).toContain("{{#if age '18' gte}}");
    //   expect(output).toContain("{{#if user_type 'premium'}}");
    //   expect(output).toContain('{{else}}{{#if is_admin}}');
    //   expect(output).toContain('{{#if has_permission}}');
    // });
  });

  describe('TypeScript handling', () => {
    it('should remove TypeScript interfaces', async () => {
      const input = `
        interface Props {
          name: string;
        }
        const Component: React.FC<Props> = ({name}) => <div>{name}</div>;
      `;
      const output = transform(input);
      await expectEqual(
        output,
        `const Component = () => <div>{"{{name}}"}</div>;`
      );
    });
  });
});
