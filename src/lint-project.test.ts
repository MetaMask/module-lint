import execa from 'execa';
import { mockDeep } from 'jest-mock-extended';

import type { MetaMaskRepository } from './establish-metamask-repository';
import type { Rule } from './execute-rules';
import { RuleExecutionStatus } from './execute-rules';
import { lintProject } from './lint-project';
import { FakeOutputLogger } from '../tests/fake-output-logger';
import { fakeDateOnly, withinSandbox } from '../tests/helpers';
import type { PrimaryExecaFunction } from '../tests/helpers';
import { setupToolWithMockRepositories } from '../tests/setup-tool-with-mock-repositories';

jest.mock('execa');

const execaMock = jest.mocked<PrimaryExecaFunction>(execa);

describe('lintProject', () => {
  beforeEach(() => {
    fakeDateOnly();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('executes all of the given rules against the given project, calculating the time including and excluding linting', async () => {
    jest.setSystemTime(new Date('2023-01-01T00:00:00Z'));

    await withinSandbox(async ({ directoryPath: sandboxDirectoryPath }) => {
      const { cachedRepositoriesDirectoryPath } =
        await setupToolWithMockRepositories({
          execaMock,
          sandboxDirectoryPath,
          repositories: [
            {
              name: 'some-project',
            },
          ],
        });
      const template = mockDeep<MetaMaskRepository>();
      const rules: Rule[] = [
        {
          name: 'rule-1',
          description: 'Description for rule 1',
          dependencies: ['rule-2'],
          execute: async () => {
            jest.setSystemTime(new Date('2023-01-01T00:00:02Z'));
            return {
              status: RuleExecutionStatus.Failed,
              failures: [{ message: 'Oops' }],
            };
          },
        },
        {
          name: 'rule-2',
          description: 'Description for rule 2',
          dependencies: [],
          execute: async () => {
            jest.setSystemTime(new Date('2023-01-01T00:00:01Z'));
            return {
              status: RuleExecutionStatus.Passed,
            };
          },
        },
      ];
      const outputLogger = new FakeOutputLogger();

      const projectLintResult = await lintProject({
        projectReference: 'some-project',
        template,
        rules,
        workingDirectoryPath: sandboxDirectoryPath,
        cachedRepositoriesDirectoryPath,
        outputLogger,
      });

      expect(projectLintResult).toStrictEqual({
        projectName: 'some-project',
        elapsedTimeExcludingLinting: 0,
        elapsedTimeIncludingLinting: 2000,
        ruleExecutionResultTree: {
          children: [
            expect.objectContaining({
              result: {
                ruleName: 'rule-2',
                ruleDescription: 'Description for rule 2',
                status: 'passed',
              },
              children: [
                expect.objectContaining({
                  result: {
                    ruleName: 'rule-1',
                    ruleDescription: 'Description for rule 1',
                    status: 'failed',
                    failures: [{ message: 'Oops' }],
                  },
                  children: [],
                }),
              ],
            }),
          ],
        },
      });
    });
  });
});
