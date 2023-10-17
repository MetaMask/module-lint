import { MockWritable } from 'stdio-mock';
import stripAnsi from 'strip-ansi';

import type { ProjectLintResult } from './lint-project';
import { OutputLogger } from './output-logger';
import { reportProjectLintResult } from './report-project-lint-result';

describe('reportProjectLintResult', () => {
  it('outputs the rules executed against a project, in the same hierarchy as they exist, and whether they passed or failed', () => {
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
    const stdout = new MockWritable();
    const stderr = new MockWritable();
    const outputLogger = new OutputLogger({ stdout, stderr });

    reportProjectLintResult({
      projectLintResult,
      outputLogger,
    });

    const output = stdout.data().map(stripAnsi).join('');

    expect(output).toBe(
      `
some-project
------------

Linted project in 30 ms.

- Description for rule 1 ✅
  - Description for rule 2 ❌
    - Failure 1
    - Failure 2
- Description for rule 3 ✅


`,
    );
  });
});
