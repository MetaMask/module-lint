import type { MetaMaskRepository } from './establish-metamask-repository';
import { establishMetaMaskRepository } from './establish-metamask-repository';
import type { Rule, RootRuleExecutionResultNode } from './execute-rules';
import { executeRules } from './execute-rules';
import type { OutputLogger } from './output-logger';

/**
 * Data collected from linting a project.
 */
export type ProjectLintResult = {
  projectName: string;
  elapsedTimeExcludingLinting: number;
  elapsedTimeIncludingLinting: number;
  ruleExecutionResultTree: RootRuleExecutionResultNode;
};

/**
 * Executes the given lint rules against a project (either a MetaMask repository
 * or a local repository).
 *
 * @param args - The arguments to this function.
 * @param args.projectReference - Either the name of a MetaMask repository,
 * such as "utils", or the path to a local Git repository.
 * @param args.template - The repository to which the project should be
 * compared.
 * @param args.rules - The set of checks that should be applied against the
 * project.
 * @param args.workingDirectoryPath - The directory where this tool was run.
 * @param args.validRepositoriesCachePath - The file that holds known MetaMask
 * repositories (if previously retrieved).
 * @param args.cachedRepositoriesDirectoryPath - The directory where MetaMask
 * repositories will be (or have been) cloned.
 * @param args.outputLogger - Writable streams for output messages.
 */
export async function lintProject({
  projectReference,
  template,
  rules,
  workingDirectoryPath,
  validRepositoriesCachePath,
  cachedRepositoriesDirectoryPath,
  outputLogger,
}: {
  projectReference: string;
  template: MetaMaskRepository;
  rules: readonly Rule[];
  workingDirectoryPath: string;
  validRepositoriesCachePath: string;
  cachedRepositoriesDirectoryPath: string;
  outputLogger: OutputLogger;
}): Promise<ProjectLintResult> {
  const startDate = new Date();
  const repository = await establishMetaMaskRepository({
    repositoryReference: projectReference,
    workingDirectoryPath,
    validRepositoriesCachePath,
    cachedRepositoriesDirectoryPath,
    outputLogger,
  });
  const endDateExcludingLinting = new Date();
  const ruleExecutionResultTree = await executeRules({
    rules,
    project: repository,
    template,
  });
  const endDateIncludingLinting = new Date();

  return {
    projectName: repository.shortname,
    elapsedTimeExcludingLinting:
      endDateExcludingLinting.getTime() - startDate.getTime(),
    elapsedTimeIncludingLinting:
      endDateIncludingLinting.getTime() - startDate.getTime(),
    ruleExecutionResultTree,
  };
}
