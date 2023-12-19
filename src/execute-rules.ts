import { inspect } from 'util';

import type { RuleNode } from './build-rule-tree';
import { buildRuleTree } from './build-rule-tree';
import type { MetaMaskRepository } from './establish-metamask-repository';
import { createModuleLogger, projectLogger } from './logging-utils';

const log = createModuleLogger(projectLogger, 'establish-metamask-repository');

/**
 * Represents a successfully executed rule. ("Partial" because a full result
 * include the name and description of the rule.)
 */
export type SuccessfulPartialRuleExecutionResult = {
  passed: true;
};

/**
 * Clarifies why a rule failed.
 */
export type RuleExecutionFailure = {
  message: string;
};

/**
 * Represents an unsuccessfully executed rule. ("Partial" because a full result
 * include the name and description of the rule.)
 */
export type FailedPartialRuleExecutionResult = {
  passed: false;
  failures: RuleExecutionFailure[];
};

/**
 * Represents the result of an executed rule. ("Partial" because a full result
 * include the name and description of the rule.)
 */
export type PartialRuleExecutionResult =
  | SuccessfulPartialRuleExecutionResult
  | FailedPartialRuleExecutionResult;

/**
 * All of the information that designates the result of a rule execution.
 */
export type RuleExecutionResult = PartialRuleExecutionResult & {
  ruleName: string;
  ruleDescription: string;
};

/**
 * A node in the rule execution result tree.
 */
export type RuleExecutionResultNode = {
  result: RuleExecutionResult;
  elapsedTimeExcludingChildren: number;
  elapsedTimeIncludingChildren: number;
  children: RuleExecutionResultNode[];
};

/**
 * The "bottom" of the rule execution result tree, as it were. Really here just
 * to satisfy the definition of a tree (which can't have more than one trunk).
 */
export type RootRuleExecutionResultNode = {
  children: RuleExecutionResultNode[];
};

/**
 * The arguments passed to every rule's `execute` method.
 */
export type RuleExecutionArguments = {
  /**
   * A reference to a template repository that serves as a baseline for the
   * project.
   */
  template: MetaMaskRepository;
  /**
   * A reference to the project repository.
   */
  project: MetaMaskRepository;
  /**
   * A supporting function that causes the rule to pass.
   */
  pass: () => SuccessfulPartialRuleExecutionResult;
  /**
   * A supporting function that causes the rule to fail.
   */
  fail: (
    failures: FailedPartialRuleExecutionResult['failures'],
  ) => FailedPartialRuleExecutionResult;
};

/**
 * A lint rule that can be executed against a project.
 */
export type Rule = {
  /**
   * The name of the rule, used an internal reference.
   */
  name: string;
  /**
   * The description of the rule. This will show up when listing rules as a part
   * of the lint report for a project.
   */
  description: string;
  /**
   * The names of rules that must be executed first before executing this one.
   */
  dependencies: string[];
  /**
   * The "body" of the rule.
   */
  execute(args: RuleExecutionArguments): Promise<PartialRuleExecutionResult>;
};

/**
 * Executes the given lint rules against a project, using a template as a
 * reference.
 *
 * @param args - The arguments to this function.
 * @param args.rules - The rules to execute.
 * @param args.project - The project repository to execute the rules against.
 * @param args.template - The template repository to compare the project to.
 * @returns The results from executing the rules.
 */
export async function executeRules({
  rules,
  project,
  template,
}: {
  rules: readonly Rule[];
  project: MetaMaskRepository;
  template: MetaMaskRepository;
}): Promise<RootRuleExecutionResultNode> {
  const ruleTree = buildRuleTree(rules);
  const resultExecutionResultNodes = await executeRuleNodes({
    ruleNodes: ruleTree.children,
    project,
    template,
  });
  return { children: resultExecutionResultNodes };
}

/**
 * Given a set of rules as part of a rule tree, executes the rules along with
 * any children rules, storing the results in a similarly structured set of
 * nodes. This function is recursive via `executeRule`.
 *
 * @param args - The arguments to this function.
 * @param args.ruleNodes - The nodes of a rule tree that hold the rules.
 * @param args.project - The project repository to execute the rules against.
 * @param args.template - The template repository to compare the project to.
 * @returns The results from executing the rules, as nodes in a tree.
 */
export async function executeRuleNodes({
  ruleNodes,
  project,
  template,
}: {
  ruleNodes: RuleNode[];
  project: MetaMaskRepository;
  template: MetaMaskRepository;
}): Promise<RuleExecutionResultNode[]> {
  const ruleExecutionResultNodes: RuleExecutionResultNode[] = [];
  for (const ruleNode of ruleNodes) {
    ruleExecutionResultNodes.push(
      await executeRule({ ruleNode, project, template }),
    );
  }
  return ruleExecutionResultNodes;
}

/**
 * Given the node of a rule tree, executes the rule that it refers to, along
 * with any children rules, against the project. This function is recursive via
 * `executeRuleNodes`.
 *
 * @param args - The arguments to this function.
 * @param args.ruleNode - The node of a rule tree.
 * @param args.project - The project repository to execute the rule against.
 * @param args.template - The template repository to compare the project to.
 * @returns The result from executing the rule, placed in a similar node shape
 * as the rule node.
 */
async function executeRule({
  ruleNode,
  project,
  template,
}: {
  ruleNode: RuleNode;
  project: MetaMaskRepository;
  template: MetaMaskRepository;
}): Promise<RuleExecutionResultNode> {
  log('Running rule', ruleNode.rule.name);
  const startDate = new Date();

  const partialRuleExecutionResult = await ruleNode.rule.execute({
    project,
    template,
    pass,
    fail,
  });
  const ruleExecutionResult: RuleExecutionResult = {
    ruleName: ruleNode.rule.name,
    ruleDescription: ruleNode.rule.description,
    ...partialRuleExecutionResult,
  };
  log(
    'Result for',
    ruleNode.rule.name,
    inspect(ruleExecutionResult, { depth: null }),
  );
  const endDateBeforeChildren = new Date();

  const children: RuleExecutionResultNode[] =
    ruleExecutionResult.passed && ruleNode.children.length > 0
      ? await executeRuleNodes({
          ruleNodes: ruleNode.children,
          project,
          template,
        })
      : [];
  const endDateAfterChildren = new Date();

  const elapsedTimeExcludingChildren =
    endDateBeforeChildren.getTime() - startDate.getTime();
  const elapsedTimeIncludingChildren =
    endDateAfterChildren.getTime() - startDate.getTime();

  return {
    result: ruleExecutionResult,
    elapsedTimeExcludingChildren,
    elapsedTimeIncludingChildren,
    children,
  };
}

/**
 * A helper for a rule which is intended to end its execution by marking it as
 * passing.
 *
 * @returns Part of a successful rule execution result (the rest will be filled
 * in automatically).
 */
export function pass(): SuccessfulPartialRuleExecutionResult {
  return {
    passed: true,
  };
}

/**
 * A helper for a rule which is intended to end its execution by marking it as
 * failing.
 *
 * @param failures - The list of associated failures.
 * @returns Part of a failed rule execution result (the rest will be filled
 * in automatically).
 */
export function fail(
  failures: FailedPartialRuleExecutionResult['failures'],
): FailedPartialRuleExecutionResult {
  return { passed: false, failures };
}
