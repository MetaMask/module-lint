#!/usr/bin/env tsx

import { setOutput } from '@actions/core';
import fs from 'fs';
import path from 'path';

type Inputs = {
  githubRepository: string;
  githubRunId: string;
  moduleLintRunsDirectory: string;
  channelId: string;
  isRunningOnCi: boolean;
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
    moduleLintRunsDirectory: requireEnvironmentVariable(
      'MODULE_LINT_RUNS_DIRECTORY',
    ),
    channelId: requireEnvironmentVariable('SLACK_CHANNEL_ID'),
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

  if (value === undefined || value === '') {
    throw new Error(`Missing environment variable ${variableName}.`);
  }

  return value;
}

/**
 * Reads the exit code files produced from previous `module-lint` runs.
 *
 * @param moduleLintRunsDirectory - The directory that holds the exit code
 * files.
 * @returns An array of exit codes.
 */
async function readModuleLintExitCodeFiles(moduleLintRunsDirectory: string) {
  const entryNames = (await fs.promises.readdir(moduleLintRunsDirectory)).map(
    (entryName) => path.join(moduleLintRunsDirectory, entryName),
  );
  const exitCodeFileNames = entryNames.filter((entry) =>
    entry.endsWith('--exitcode.txt'),
  );
  return Promise.all(
    exitCodeFileNames.map(async (exitCodeFileName) => {
      const content = (
        await fs.promises.readFile(exitCodeFileName, 'utf8')
      ).trim();
      const exitCode = Number(content);
      if (Number.isNaN(exitCode)) {
        throw new Error(`Could not parse '${content}' as exit code`);
      }
      return exitCode;
    }),
  );
}

/**
 * Constructs the payload that will be used to post a message in Slack
 * containing information about previous `module-lint` runs.
 *
 * @param inputs - The inputs to this script.
 * @param allModuleLintRunsSuccessful - Whether all of the previously linted projects passed
 * lint.
 * @returns The Slack payload.
 */
function constructSlackPayload(
  inputs: Inputs,
  allModuleLintRunsSuccessful: boolean,
) {
  const text =
    'A new package standardization report is available. Open this thread to view more details.';

  const successfulVersion = [
    {
      type: 'rich_text',
      elements: [
        {
          type: 'rich_text_section',
          elements: [
            {
              type: 'emoji',
              name: 'package',
            },
            {
              type: 'text',
              text: ' ',
            },
            {
              type: 'text',
              text: 'A new package standardization report is available.',
              style: {
                bold: true,
              },
            },
            {
              type: 'text',
              text: '\n\nGreat work! Your team has ',
            },
            {
              type: 'text',
              text: '5 repositories',
              style: {
                bold: true,
              },
            },
            {
              type: 'text',
              text: ' that fully align with the module template.\n\n',
            },
            {
              type: 'text',
              text: 'Open this thread to view more details:',
            },
            {
              type: 'emoji',
              name: 'point_right',
            },
          ],
        },
      ],
    },
  ];

  const unsuccessfulVersion = [
    {
      type: 'rich_text',
      elements: [
        {
          type: 'rich_text_section',
          elements: [
            {
              type: 'emoji',
              name: 'package',
            },
            {
              type: 'text',
              text: ' ',
            },
            {
              type: 'text',
              text: 'A new package standardization report is available.',
              style: {
                bold: true,
              },
            },
            {
              type: 'text',
              text: '\n\nYour team has ',
            },
            {
              type: 'text',
              text: '4 repositories',
              style: {
                bold: true,
              },
            },
            {
              type: 'text',
              text: ' that require maintenance in order to align with the module template. This is important for maintaining conventions across MetaMask and adhering to our security principles.\n\n',
            },
            {
              type: 'link',
              text: 'View this run',
              url: `https://github.com/${inputs.githubRepository}/actions/runs/${inputs.githubRunId}`,
            },
            {
              type: 'text',
              text: ', or open this thread to view more details:',
            },
            {
              type: 'emoji',
              name: 'point_right',
            },
          ],
        },
      ],
    },
  ];

  const blocks = allModuleLintRunsSuccessful
    ? successfulVersion
    : unsuccessfulVersion;

  if (inputs.isRunningOnCi) {
    return {
      text,
      blocks,
      // The Slack API dictates use of this property.
      // eslint-disable-next-line @typescript-eslint/naming-convention
      icon_url:
        'https://raw.githubusercontent.com/MetaMask/action-npm-publish/main/robo.png',
      username: 'MetaMask Bot',
      channel: inputs.channelId,
    };
  }

  return { blocks };
}

/**
 * The entrypoint for this script.
 */
async function main() {
  const inputs = getInputs();

  const exitCodes = await readModuleLintExitCodeFiles(
    inputs.moduleLintRunsDirectory,
  );
  const allModuleLintRunsSuccessful = exitCodes.every(
    (exitCode) => exitCode === 0,
  );

  const slackPayload = constructSlackPayload(
    inputs,
    allModuleLintRunsSuccessful,
  );

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
