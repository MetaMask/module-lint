import * as dependencyGraphModule from 'dependency-graph';

import { buildRuleTree } from './build-rule-tree';
import type { Rule } from './execute-rules';

jest.mock('dependency-graph', () => {
  return {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    __esModule: true,
    ...jest.requireActual('dependency-graph'),
  };
});

describe('buildRuleTree', () => {
  it('builds a nested data structure that starts with the rules that have no dependencies and navigates through their dependents recursively', () => {
    const rule1: Rule = {
      name: 'rule-1',
      description: 'Description for rule 1',
      dependencies: ['rule-2'],
      execute: async () => {
        return {
          passed: true,
        };
      },
    };
    const rule2: Rule = {
      name: 'rule-2',
      description: 'Description for rule 2',
      dependencies: ['rule-3'],
      execute: async () => {
        return {
          passed: true,
        };
      },
    };
    const rule3: Rule = {
      name: 'rule-3',
      description: 'Description for rule 3',
      dependencies: [],
      execute: async () => {
        return {
          passed: true,
        };
      },
    };
    const rules = [rule1, rule2, rule3];

    const ruleTree = buildRuleTree(rules);

    expect(ruleTree).toStrictEqual({
      children: [
        {
          rule: rule3,
          children: [
            {
              rule: rule2,
              children: [
                {
                  rule: rule1,
                  children: [],
                },
              ],
            },
          ],
        },
      ],
    });
  });

  it('reinterprets a dependency cycle error from dep-graph if given a set of rules where a dependency cycle is present', () => {
    const rule1: Rule = {
      name: 'rule-1',
      description: 'Description for rule 1',
      dependencies: ['rule-2'],
      execute: async () => {
        return {
          passed: false,
          failures: [{ message: 'Oops' }],
        };
      },
    };
    const rule2: Rule = {
      name: 'rule-2',
      description: 'Description for rule 2',
      dependencies: ['rule-3'],
      execute: async () => {
        return {
          passed: true,
        };
      },
    };
    const rule3: Rule = {
      name: 'rule-3',
      description: 'Description for rule 3',
      dependencies: ['rule-1'],
      execute: async () => {
        return {
          passed: true,
        };
      },
    };
    const rules = [rule1, rule2, rule3];

    expect(() => buildRuleTree(rules)).toThrow(
      new Error(
        `
Could not build rule tree as some rules depend on each other circularly:

- Rule "rule-1" depends on...
  - Rule "rule-2", which depends on...
    - Rule "rule-3", which depends on...
      - Rule "rule-1" again (creating the cycle)
`.trim(),
      ),
    );
  });

  it('re-throws any unknown if given a set of rules where a dependency cycle is present', () => {
    const error = new Error('oops');
    const depGraph = new dependencyGraphModule.DepGraph();
    jest.spyOn(depGraph, 'overallOrder').mockImplementation(() => {
      throw error;
    });
    jest.spyOn(dependencyGraphModule, 'DepGraph').mockReturnValue(depGraph);

    expect(() => buildRuleTree([])).toThrow(error);
  });

  it('returns an empty root node if given no rules', () => {
    const ruleTree = buildRuleTree([]);

    expect(ruleTree).toStrictEqual({
      children: [],
    });
  });
});
