import {
  ensureDirectoryStructureExists,
  writeFile,
} from '@metamask/utils/node';
import path from 'path';

import { directoryExists, fileExists } from './helpers';
import { buildMetaMaskRepository, withinSandbox } from '../../tests/helpers';
import { fail, pass } from '../execute-rules';

describe('fileExists', () => {
  it('passes if the given path refers to an existing file', async () => {
    expect.assertions(1);

    await withinSandbox(async (sandbox) => {
      const project = buildMetaMaskRepository({
        shortname: 'project',
        directoryPath: path.join(sandbox.directoryPath, 'project'),
      });
      const filePath = path.join(project.directoryPath, 'some.file');
      await writeFile(filePath, '');

      const result = await fileExists(filePath, {
        template: buildMetaMaskRepository(),
        project,
        pass,
        fail,
      });

      expect(result).toStrictEqual({
        passed: true,
      });
    });
  });

  it('fails if the given path does not refer to an existing file', async () => {
    expect.assertions(1);

    await withinSandbox(async (sandbox) => {
      const project = buildMetaMaskRepository({
        shortname: 'project',
        directoryPath: path.join(sandbox.directoryPath, 'project'),
      });
      const filePath = path.join(project.directoryPath, 'some.file');

      const result = await fileExists(filePath, {
        template: buildMetaMaskRepository(),
        project,
        pass,
        fail,
      });

      expect(result).toStrictEqual({
        passed: false,
        failures: [
          {
            message: `\`${filePath}\` does not exist in this project.`,
          },
        ],
      });
    });
  });

  it('fails if the given path does refers to an entry, but it is not a file', async () => {
    expect.assertions(1);

    await withinSandbox(async (sandbox) => {
      const project = buildMetaMaskRepository({
        shortname: 'project',
        directoryPath: path.join(sandbox.directoryPath, 'project'),
      });
      const filePath = path.join(project.directoryPath, 'some.file');
      await ensureDirectoryStructureExists(filePath);

      const result = await fileExists(filePath, {
        template: buildMetaMaskRepository(),
        project,
        pass,
        fail,
      });

      expect(result).toStrictEqual({
        passed: false,
        failures: [
          { message: `\`${filePath}\` is not a file when it should be.` },
        ],
      });
    });
  });
});

describe('directoryExists', () => {
  it('passes if the given path refers to an existing directory', async () => {
    expect.assertions(1);

    await withinSandbox(async (sandbox) => {
      const project = buildMetaMaskRepository({
        shortname: 'project',
        directoryPath: path.join(sandbox.directoryPath, 'project'),
      });
      const directoryPath = path.join(project.directoryPath, 'some-directory');
      await ensureDirectoryStructureExists(directoryPath);

      const result = await directoryExists(directoryPath, {
        template: buildMetaMaskRepository(),
        project,
        pass,
        fail,
      });

      expect(result).toStrictEqual({
        passed: true,
      });
    });
  });

  it('fails if the given path does not refer to an existing directory', async () => {
    expect.assertions(1);

    await withinSandbox(async (sandbox) => {
      const project = buildMetaMaskRepository({
        shortname: 'project',
        directoryPath: path.join(sandbox.directoryPath, 'project'),
      });
      const directoryPath = path.join(project.directoryPath, 'some-directory');

      const result = await directoryExists(directoryPath, {
        template: buildMetaMaskRepository(),
        project,
        pass,
        fail,
      });

      expect(result).toStrictEqual({
        passed: false,
        failures: [
          {
            message: `\`${directoryPath}/\` does not exist in this project.`,
          },
        ],
      });
    });
  });

  it('fails if the given path does refers to an entry, but it is not a directory', async () => {
    expect.assertions(1);

    await withinSandbox(async (sandbox) => {
      const project = buildMetaMaskRepository({
        shortname: 'project',
        directoryPath: path.join(sandbox.directoryPath, 'project'),
      });
      const directoryPath = path.join(project.directoryPath, 'some-directory');
      await writeFile(directoryPath, '');

      const result = await directoryExists(directoryPath, {
        template: buildMetaMaskRepository(),
        project,
        pass,
        fail,
      });

      expect(result).toStrictEqual({
        passed: false,
        failures: [
          {
            message: `\`${directoryPath}/\` is not a directory when it should be.`,
          },
        ],
      });
    });
  });
});
