import { mockDeep } from 'jest-mock-extended';

import type { MetaMaskRepository } from './establish-metamask-repository';
import type { Rule } from './execute-rules';
import { executeRules } from './execute-rules';
import { fakeDateOnly } from '../tests/helpers';

describe('executeRules', () => {
  beforeEach(() => {
    fakeDateOnly();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('runs all of the given rules in dependency order against the given project and template, capturing their results', async () => {
    const rules: Rule[] = [
      {
        name: 'rule-1',
        description: 'Description for rule 1',
        dependencies: ['rule-2'],
        execute: async ({ fail }) => {
          return fail([{ message: 'Oops' }]);
        },
      },
      {
        name: 'rule-2',
        description: 'Description for rule 2',
        dependencies: [],
        execute: async ({ pass }) => {
          return pass();
        },
      },
    ];
    const project = mockDeep<MetaMaskRepository>();
    const template = mockDeep<MetaMaskRepository>();

    const ruleExecutionResultTree = await executeRules({
      rules,
      project,
      template,
    });

    expect(ruleExecutionResultTree).toMatchObject({
      children: [
        expect.objectContaining({
          result: {
            ruleName: 'rule-2',
            ruleDescription: 'Description for rule 2',
            passed: true,
          },
          children: [
            expect.objectContaining({
              result: {
                ruleName: 'rule-1',
                ruleDescription: 'Description for rule 1',
                passed: false,
                failures: [{ message: 'Oops' }],
              },
              children: [],
            }),
          ],
        }),
      ],
    });
  });

  it("does not run a rule's children if it fails", async () => {
    const rules: Rule[] = [
      {
        name: 'rule-1',
        description: 'Description for rule 1',
        dependencies: ['rule-2'],
        execute: async ({ pass }) => {
          return pass();
        },
      },
      {
        name: 'rule-2',
        description: 'Description for rule 2',
        dependencies: [],
        execute: async ({ fail }) => {
          return fail([{ message: 'Oops' }]);
        },
      },
    ];
    const project = mockDeep<MetaMaskRepository>();
    const template = mockDeep<MetaMaskRepository>();

    const ruleExecutionResultTree = await executeRules({
      rules,
      project,
      template,
    });

    expect(ruleExecutionResultTree).toMatchObject({
      children: [
        expect.objectContaining({
          result: {
            ruleName: 'rule-2',
            ruleDescription: 'Description for rule 2',
            passed: false,
            failures: [{ message: 'Oops' }],
          },
          children: [],
        }),
      ],
    });
  });

  it('records the time to run each rule, exclusive and inclusive of its children', async () => {
    jest.setSystemTime(new Date('2023-01-01T00:00:00Z'));

    const rules: Rule[] = [
      {
        name: 'rule-1',
        description: 'Description for rule 1',
        dependencies: ['rule-2'],
        execute: async ({ fail }) => {
          jest.setSystemTime(new Date('2023-01-01T00:00:02Z'));
          return fail([{ message: 'Oops' }]);
        },
      },
      {
        name: 'rule-2',
        description: 'Description for rule 2',
        dependencies: [],
        execute: async ({ pass }) => {
          jest.setSystemTime(new Date('2023-01-01T00:00:01Z'));
          return pass();
        },
      },
    ];
    const project = mockDeep<MetaMaskRepository>();
    const template = mockDeep<MetaMaskRepository>();

    const ruleExecutionResultTree = await executeRules({
      rules,
      project,
      template,
    });

    expect(ruleExecutionResultTree).toMatchObject({
      children: [
        expect.objectContaining({
          elapsedTimeExcludingChildren: 1000,
          elapsedTimeIncludingChildren: 2000,
          children: [
            expect.objectContaining({
              elapsedTimeExcludingChildren: 1000,
              elapsedTimeIncludingChildren: 1000,
            }),
          ],
        }),
      ],
    });
  });

  it('does nothing, returning an empty tree, if given no rules', async () => {
    const rules: Rule[] = [];
    const project = mockDeep<MetaMaskRepository>();
    const template = mockDeep<MetaMaskRepository>();

    const ruleExecutionResultTree = await executeRules({
      rules,
      project,
      template,
    });

    expect(ruleExecutionResultTree).toStrictEqual({ children: [] });
  });
});
