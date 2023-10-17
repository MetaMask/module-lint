import { getErrorMessage } from '@metamask/utils/node';
import { DepGraph } from 'dependency-graph';

import type { Rule } from './execute-rules';
import { logger } from './logging-utils';
import { indent } from './misc-utils';

/**
 * A rule in the rule tree.
 */
export type RuleNode = {
  rule: Rule;
  children: RuleNode[];
};

/**
 * The "bottom" of the rule tree, as it were. Really here just to satisfy the
 * definition of a tree (which can't have more than one trunk).
 */
type RootRuleNode = {
  children: RuleNode[];
};

/**
 * Some rules are dependent on other rules to execute. For instance, if a rule
 * is checking for a property within `tsconfig.json`, another rule that checks
 * for the existence of `tsconfig.json` may need to be executed first. To
 * determine the execution priority, we need to create a tree structure. The
 * root of this tree is a dummy node whose children are all of the rules that do
 * not depend on any other rules to execute. Some of these nodes may have
 * children, which are the dependents of the rules represented by those nodes.
 *
 * @param rules - The rules to rearrange into a tree.
 * @returns The rule tree.
 */
export function buildRuleTree(rules: readonly Rule[]): RootRuleNode {
  const graph = new DepGraph<Rule>();

  // Add all of the rules to the graph first so that they are available
  rules.forEach((rule) => {
    logger.debug(`Adding to graph: ${rule.name}`);
    graph.addNode(rule.name, rule);
  });

  // Now we specify the connections between nodes
  rules.forEach((rule) => {
    rule.dependencies.forEach((dependencyName) => {
      logger.debug(
        `Adding connection to graph: ${rule.name} -> ${dependencyName}`,
      );
      graph.addDependency(rule.name, dependencyName);
    });
  });

  checkForDependencyCycle(graph);

  const nodesWithoutDependencies = graph.overallOrder(true);
  const children = buildRuleNodes(graph, nodesWithoutDependencies);

  return { children };
}

/**
 * The `dependency-graph` package will throw an error if it detects a dependency
 * cycle in the graph (i.e., a node that depends on another node, which depends
 * on the first node). It is impossible to turn a circular graph into a tree,
 * as it would take forever (literally) to iterate through it. We take advantage
 * of this to look for dependency cycles in the graph we've build from the rules
 * and throw a similar error.
 *
 * @param graph - The graph made up of rules.
 * @throws If a dependency cycle is present.
 */
function checkForDependencyCycle(graph: DepGraph<Rule>): void {
  try {
    graph.overallOrder();
  } catch (error) {
    const message = getErrorMessage(error);
    const match = /^Dependency Cycle Found: (.+)$/u.exec(message);

    if (match?.[1]) {
      const nodesInCycle = match[1].split(' -> ');
      const lines = [
        'Could not build rule tree as some rules depend on each other circularly:',
        '',
        ...nodesInCycle.map((node, i) => {
          let line = `- Rule "${node}"`;
          if (i === 0) {
            line += ' depends on...';
          } else if (i === nodesInCycle.length - 1) {
            line += ' again (creating the cycle)';
          } else {
            line += ', which depends on...';
          }
          return indent(line, i);
        }),
      ];
      throw new Error(lines.join('\n'));
    } else {
      throw error;
    }
  }
}

/**
 * Converts a series of node in the rule _graph_ into nodes into the rule
 * _tree_. This function is called two ways: once when first building the tree
 * for the rules that don't depend on any other rules, and then each time a
 * rule's dependents are seen.
 *
 * @param graph - The rule graph.
 * @param nodeNames - The names of rules in the graph to convert.
 * @returns The built rule nodes.
 * @see {@link buildRuleNode}
 */
function buildRuleNodes(
  graph: DepGraph<Rule>,
  nodeNames: string[],
): RuleNode[] {
  return nodeNames.map((nodeName) => buildRuleNode(graph, nodeName));
}

/**
 * Converts a node in the rule _graph_ into a node into the rule _tree_. As the
 * nodes of the graph and the connections of the graph are kept separately, this
 * function essentially combines them by nesting the rule's dependents under the
 * rule itself. This function is recursive via `buildRuleNodes`, as doing so
 * means that all of the dependents for a rule get their own node in the rule
 * tree too.
 *
 * @param graph - The rule graph.
 * @param nodeName - The name of a rule in the graph.
 * @returns The built rule node.
 */
function buildRuleNode(graph: DepGraph<Rule>, nodeName: string): RuleNode {
  const rule = graph.getNodeData(nodeName);
  const dependents = graph.directDependentsOf(nodeName);
  return {
    rule,
    children: buildRuleNodes(graph, dependents),
  };
}
