import { RuleExecutionStatus } from './execute-rules';
import { reportProjectLintResult } from './report-project-lint-result';
import { FakeOutputLogger } from '../tests/fake-output-logger';

describe('reportProjectLintResult', () => {
  it('outputs the rules executed against a project and whether they passed, failed, or errored, along with a summary', () => {
    const projectLintResult = {
      projectName: 'some-project',
      elapsedTimeIncludingLinting: 30,
      elapsedTimeExcludingLinting: 0,
      ruleExecutionResultTree: {
        children: [
          {
            result: {
              ruleName: 'rule-1',
              ruleDescription: 'Description for rule 1',
              status: RuleExecutionStatus.Passed as const,
            },
            elapsedTimeExcludingChildren: 0,
            elapsedTimeIncludingChildren: 0,
            children: [
              {
                result: {
                  ruleName: 'rule-2',
                  ruleDescription: 'Description for rule 2',
                  status: RuleExecutionStatus.Failed as const,
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
              status: RuleExecutionStatus.Passed as const,
            },
            elapsedTimeExcludingChildren: 0,
            elapsedTimeIncludingChildren: 0,
            children: [],
          },
          {
            result: {
              ruleName: 'rule-4',
              ruleDescription: 'Description for rule 4',
              status: RuleExecutionStatus.Errored as const,
              error: new Error('oops'),
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
- Description for rule 4 ⚠️
  - ERROR: oops

Results:       2 passed, 1 failed, 1 errored, 4 total
Elapsed time:  30 ms
`.trimStart(),
    );
  });

  it('outputs an empty report if no rules were executed', () => {
    const projectLintResult = {
      projectName: 'some-project',
      elapsedTimeIncludingLinting: 30,
      elapsedTimeExcludingLinting: 0,
      ruleExecutionResultTree: {
        children: [],
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

Results:       0 passed, 0 failed, 0 errored, 0 total
Elapsed time:  30 ms
`.trimStart(),
    );
  });
});
