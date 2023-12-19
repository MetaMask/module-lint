import type { ProjectLintResult } from './lint-project';
import { reportProjectLintResult } from './report-project-lint-result';
import { FakeOutputLogger } from '../tests/fake-output-logger';

describe('reportProjectLintResult', () => {
  it('outputs the rules executed against a project, in the same hierarchy as they were run, and whether they passed or failed, along with a summary', () => {
    const projectLintResult: ProjectLintResult = {
      projectName: 'some-project',
      elapsedTimeIncludingLinting: 30,
      elapsedTimeExcludingLinting: 0,
      ruleExecutionResultTree: {
        children: [
          {
            result: {
              ruleName: 'rule-1',
              ruleDescription: 'Description for rule 1',
              passed: true,
            },
            elapsedTimeExcludingChildren: 0,
            elapsedTimeIncludingChildren: 0,
            children: [
              {
                result: {
                  ruleName: 'rule-2',
                  ruleDescription: 'Description for rule 2',
                  passed: false,
                  failures: [
                    { message: 'Failure 1' },
                    { message: 'Failure 2' },
                  ],
                },
                elapsedTimeExcludingChildren: 0,
                elapsedTimeIncludingChildren: 0,
                children: [],
              },
            ],
          },
          {
            result: {
              ruleName: 'rule-3',
              ruleDescription: 'Description for rule 3',
              passed: true,
            },
            elapsedTimeExcludingChildren: 0,
            elapsedTimeIncludingChildren: 0,
            children: [],
          },
        ],
      },
    };
    const outputLogger = new FakeOutputLogger();

    reportProjectLintResult({
      projectLintResult,
      outputLogger,
    });

    expect(outputLogger.getStdout()).toBe(
      `
some-project
------------

- Description for rule 1 ✅
  - Description for rule 2 ❌
    - Failure 1
    - Failure 2
- Description for rule 3 ✅

Results:       2 passed, 1 failed, 3 total
Elapsed time:  30 ms
`.trimStart(),
    );
  });

  it('prints "0 passed" if no rules passed', () => {
    const projectLintResult: ProjectLintResult = {
      projectName: 'some-project',
      elapsedTimeIncludingLinting: 30,
      elapsedTimeExcludingLinting: 0,
      ruleExecutionResultTree: {
        children: [
          {
            result: {
              ruleName: 'some-rule',
              ruleDescription: 'Description for rule',
              passed: false,
              failures: [{ message: 'Some failure' }],
            },
            elapsedTimeExcludingChildren: 0,
            elapsedTimeIncludingChildren: 0,
            children: [],
          },
        ],
      },
    };
    const outputLogger = new FakeOutputLogger();

    reportProjectLintResult({
      projectLintResult,
      outputLogger,
    });

    expect(outputLogger.getStdout()).toBe(
      `
some-project
------------

- Description for rule ❌
  - Some failure

Results:       0 passed, 1 failed, 1 total
Elapsed time:  30 ms
`.trimStart(),
    );
  });

  it('prints "0 failed" if no rules failed', () => {
    const projectLintResult: ProjectLintResult = {
      projectName: 'some-project',
      elapsedTimeIncludingLinting: 30,
      elapsedTimeExcludingLinting: 0,
      ruleExecutionResultTree: {
        children: [
          {
            result: {
              ruleName: 'some-rule',
              ruleDescription: 'Description for rule',
              passed: true,
            },
            elapsedTimeExcludingChildren: 0,
            elapsedTimeIncludingChildren: 0,
            children: [],
          },
        ],
      },
    };
    const outputLogger = new FakeOutputLogger();

    reportProjectLintResult({
      projectLintResult,
      outputLogger,
    });

    expect(outputLogger.getStdout()).toBe(
      `
some-project
------------

- Description for rule ✅

Results:       1 passed, 0 failed, 1 total
Elapsed time:  30 ms
`.trimStart(),
    );
  });
});
