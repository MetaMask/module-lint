import type { RuleName } from './types';
import type { MetaMaskRepository } from '../establish-metamask-repository';
import type {
  FailedPartialRuleExecutionResult,
  PartialRuleExecutionResult,
  Rule,
  SuccessfulPartialRuleExecutionResult,
} from '../execute-rules';

/**
 * Rule objects are fairly abstract: the name of a rule and the dependencies of
 * a rule (which are themselves names) can be anything; and unfortunately, we
 * cannot really enforce names, or else it would mean we'd have to have a
 * `RuleName` type everywhere.
 *
 * This function exists to bridge that gap at the point where the rule is
 * actually defined by validating the name and dependencies against a known set
 * of rules.
 *
 * @param args - The arguments to this function.
 * @param args.name - The name of a rule. This function assumes that all rule
 * names are predefined in an enum and that this is one of the values in that
 * enum.
 * @param args.description - The description of the rule. This will show up when
 * listing rules as a part of the lint report for a project.
 * @param args.dependencies - The names of rules that must be executed first
 * before executing this one.
 * @param args.execute - The "body" of the rule.
 * @returns The (validated) rule.
 */
export function buildRule<Name extends RuleName>({
  name,
  description,
  dependencies,
  execute,
}: {
  name: Name;
  description: string;
  dependencies: Exclude<RuleName, Name>[];
  execute(args: {
    template: MetaMaskRepository;
    project: MetaMaskRepository;
    pass: () => SuccessfulPartialRuleExecutionResult;
    fail: (
      failures: FailedPartialRuleExecutionResult['failures'],
    ) => FailedPartialRuleExecutionResult;
  }): Promise<PartialRuleExecutionResult>;
}): Rule {
  return {
    name,
    description,
    dependencies,
    execute,
  };
}
