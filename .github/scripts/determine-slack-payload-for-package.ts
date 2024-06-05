#!/usr/bin/env tsx

import { setOutput } from '@actions/core';
import fs from 'fs';
import path from 'path';

type Inputs = {
  githubRepository: string;
  githubRunId: string;
  projectName: string;
  moduleLintRunsDirectory: string;
  channelId: string;
  threadTs: string;
  isRunningOnCi: boolean;
};

type ParsedModuleLintOutput = {
  passed: number;
  failed: number;
  errored: number;
  total: number;
  durationWithUnit: string;
  percentage: number;
};

/**
 * Obtains the inputs for this script from environment variables.
 *
 * @returns The inputs for this script.
 */
function getInputs(): Inputs {
  return {
    githubRepository: requireEnvironmentVariable('GITHUB_REPOSITORY'),
    githubRunId: requireEnvironmentVariable('GITHUB_RUN_ID'),
    projectName: requireEnvironmentVariable('PROJECT_NAME'),
    moduleLintRunsDirectory: requireEnvironmentVariable(
      'MODULE_LINT_RUNS_DIRECTORY',
    ),
    channelId: requireEnvironmentVariable('SLACK_CHANNEL_ID'),
    threadTs: requireEnvironmentVariable('SLACK_THREAD_TS'),
    isRunningOnCi: process.env.CI !== undefined,
  };
}

/**
 * Obtains the given environment variable, throwing if it has not been set.
 *
 * @param variableName - The name of the desired environment variable.
 * @returns The value of the given environment variable.
 * @throws if the given environment variable has not been set.
 */
function requireEnvironmentVariable(variableName: string): string {
  const value = process.env[variableName];

  if (value === undefined) {
    throw new Error(`Missing environment variable ${variableName}.`);
  }

  return value;
}

/**
 * Reads the output file produced by a previous `module-lint` run for the
 * project in question.
 *
 * @param projectName - The name of the project previously run.
 * @param moduleLintRunsDirectory - The directory where the output file was
 * stored.
 * @returns The content of the file (with leading and trailing whitespace
 * removed).
 */
async function readModuleLintOutputFile(
  projectName: string,
  moduleLintRunsDirectory: string,
) {
  const content = await fs.promises.readFile(
    path.join(moduleLintRunsDirectory, `${projectName}--output.txt`),
    'utf8',
  );
  return content.trim();
}

/**
 * Parses the output from a previous `module-lint` run into parts that can be
 * used to construct a Slack message.
 *
 * @param moduleLintOutput - The output from a previous `module-lint` run.
 * @returns The pieces of the `module-lint` output.
 */
function parseModuleLintOutput(
  moduleLintOutput: string,
): ParsedModuleLintOutput {
  const moduleLintOutputSections = moduleLintOutput.split('\n\n');

  const summarySection =
    moduleLintOutputSections[moduleLintOutputSections.length - 1];
  if (summarySection === undefined) {
    throw new Error("Couldn't parse module-lint report output");
  }

  const [reportSummaryLine, elapsedTimeLine] = summarySection.split('\n');
  if (reportSummaryLine === undefined || elapsedTimeLine === undefined) {
    throw new Error("Couldn't parse module-lint report output");
  }

  const reportSummary = reportSummaryLine.replace(/^Results:[ ]+/u, '');
  const reportSummaryMatch = reportSummary.match(
    /(\d+) passed, (\d+) failed, (\d+) errored, (\d+) total/u,
  );
  if (!reportSummaryMatch) {
    throw new Error("Couldn't parse module-lint report output");
  }

  const passed = Number(reportSummaryMatch[1]);
  const failed = Number(reportSummaryMatch[2]);
  const errored = Number(reportSummaryMatch[3]);
  const total = Number(reportSummaryMatch[4]);
  const durationWithUnit = elapsedTimeLine.replace(/^Elapsed time:[ ]+/u, '');

  const percentage = Math.round((passed / total) * 1000) / 10;

  return { passed, failed, errored, total, durationWithUnit, percentage };
}

/**
 * Constructs the payload that will be used to post a message in Slack
 * containing information about the `module-lint` run for the package in
 * question.
 *
 * @param inputs - The inputs to this script.
 * @param moduleLintOutput - The output from a previous `module-lint` run.
 * @returns The Slack payload.
 */
function constructSlackPayload(inputs: Inputs, moduleLintOutput: string) {
  const { passed, total, percentage } = parseModuleLintOutput(moduleLintOutput);

  const text = `Report for MetaMask/${inputs.projectName}`;

  const blocks = [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: `MetaMask/${inputs.projectName}`,
      },
    },
    {
      type: 'rich_text',
      elements: [
        {
          type: 'rich_text_section',
          elements: [
            {
              type: 'emoji',
              name: passed === total ? 'white_check_mark' : 'x',
            },
            {
              type: 'text',
              text: ` ${passed}/${total} rules passed (${percentage}% alignment with template).\n\n`,
              style: {
                bold: true,
              },
            },
          ],
        },
        {
          type: 'rich_text_preformatted',
          elements: [
            {
              type: 'text',
              text: moduleLintOutput,
            },
          ],
        },
      ],
    },
  ];

  if (inputs.isRunningOnCi) {
    return {
      text,
      blocks,
      channel: inputs.channelId,
      // The Slack API dictates use of this property.
      // eslint-disable-next-line @typescript-eslint/naming-convention
      thread_ts: inputs.threadTs,
    };
  }
  return { blocks };
}

/**
 * The entrypoint for this script.
 */
async function main() {
  const inputs = getInputs();

  const moduleLintOutput = await readModuleLintOutputFile(
    inputs.projectName,
    inputs.moduleLintRunsDirectory,
  );

  const slackPayload = constructSlackPayload(inputs, moduleLintOutput);

  // Offer two different ways of outputting the Slack payload so that this
  // script can be run locally and the output can be fed into Slack's Block Kit
  // Builder
  if (inputs.isRunningOnCi) {
    setOutput('SLACK_PAYLOAD', JSON.stringify(slackPayload));
  } else {
    console.log(JSON.stringify(slackPayload, null, '  '));
  }
}

main().catch(console.error);
