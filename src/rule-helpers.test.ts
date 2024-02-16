import {
  ensureDirectoryStructureExists,
  writeFile,
} from '@metamask/utils/node';
import path from 'path';

import {
  combineRuleExecutionResults,
  directoryAndContentsConform,
  directoryExists,
  fail,
  fileConforms,
  fileExists,
  getString,
  packagePropertiesConform,
  pass,
} from './rule-helpers';
import {
  buildMetaMaskRepository,
  fakePackageManifest,
  withinSandbox,
} from '../tests/helpers';

describe('pass', () => {
  it('returns a result that represents a passing rule', () => {
    expect(pass()).toStrictEqual({ passed: true });
  });
});

describe('fail', () => {
  it('returns a result that represents a failing rule, with the given failures', () => {
    expect(fail([{ message: 'oops' }])).toStrictEqual({
      passed: false,
      failures: [{ message: 'oops' }],
    });
  });
});

describe('combineRuleExecutionResults', () => {
  it('returns a single passing result if all of the given results are passing', () => {
    const result = combineRuleExecutionResults([
      {
        passed: true,
      },
      {
        passed: true,
      },
    ]);

    expect(result).toStrictEqual({ passed: true });
  });

  it('returns a single failed result, consolidating all failures, if any of the given results are failing', () => {
    const result = combineRuleExecutionResults([
      {
        passed: true,
      },
      {
        passed: false,
        failures: [{ message: 'message 1' }],
      },
      {
        passed: true,
      },
      {
        passed: false,
        failures: [{ message: 'message 2' }, { message: 'message 3' }],
      },
    ]);

    expect(result).toStrictEqual({
      passed: false,
      failures: [
        { message: 'message 1' },
        { message: 'message 2' },
        { message: 'message 3' },
      ],
    });
  });

  it('returns a passing result if given nothing to combine', () => {
    const result = combineRuleExecutionResults([]);

    expect(result).toStrictEqual({ passed: true });
  });
});

describe('fileExists', () => {
  it('passes if the given path refers to an existing file', async () => {
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

describe('fileConforms', () => {
  it('passes if the project and template have the same referenced file with the same content', async () => {
    await withinSandbox(async (sandbox) => {
      const template = buildMetaMaskRepository({
        shortname: 'template',
        directoryPath: path.join(sandbox.directoryPath, 'template'),
      });
      await writeFile(
        path.join(template.directoryPath, 'some.file'),
        'some content',
      );
      const project = buildMetaMaskRepository({
        shortname: 'project',
        directoryPath: path.join(sandbox.directoryPath, 'project'),
      });
      await writeFile(
        path.join(project.directoryPath, 'some.file'),
        'some content',
      );

      const result = await fileConforms('some.file', {
        template,
        project,
        pass,
        fail,
      });

      expect(result).toStrictEqual({ passed: true });
    });
  });

  it('fails if the project has the same referenced file as the template, but its content does not match', async () => {
    await withinSandbox(async (sandbox) => {
      const template = buildMetaMaskRepository({
        shortname: 'template',
        directoryPath: path.join(sandbox.directoryPath, 'template'),
      });
      await writeFile(
        path.join(template.directoryPath, 'some.file'),
        'some content',
      );
      const project = buildMetaMaskRepository({
        shortname: 'project',
        directoryPath: path.join(sandbox.directoryPath, 'project'),
      });
      await writeFile(
        path.join(project.directoryPath, 'some.file'),
        'different content',
      );

      const result = await fileConforms('some.file', {
        template,
        project,
        pass,
        fail,
      });

      expect(result).toStrictEqual({
        passed: false,
        failures: [
          {
            message:
              '`some.file` does not match the same file in the template repo.',
          },
        ],
      });
    });
  });

  it('fails if the project does not have the same referenced file as the template', async () => {
    await withinSandbox(async (sandbox) => {
      const template = buildMetaMaskRepository({
        shortname: 'template',
        directoryPath: path.join(sandbox.directoryPath, 'template'),
      });
      await writeFile(
        path.join(template.directoryPath, 'some.file'),
        'different content',
      );
      const project = buildMetaMaskRepository({
        shortname: 'project',
        directoryPath: path.join(sandbox.directoryPath, 'project'),
      });

      const result = await fileConforms('some.file', {
        template,
        project,
        pass,
        fail,
      });

      expect(result).toStrictEqual({
        passed: false,
        failures: [
          {
            message: '`some.file` does not exist in this project.',
          },
        ],
      });
    });
  });
});

describe('directoryAndContentsConform', () => {
  it('passes if the project and template have the same referenced directory with the same file structure, and all files have the same content', async () => {
    await withinSandbox(async (sandbox) => {
      const template = buildMetaMaskRepository({
        shortname: 'template',
        directoryPath: path.join(sandbox.directoryPath, 'template'),
      });
      await writeFile(
        path.join(
          template.directoryPath,
          'some-directory',
          'child-directory',
          'some.file',
        ),
        'some content',
      );
      await writeFile(
        path.join(
          template.directoryPath,
          'some-directory',
          'child-directory',
          'grandchild-directory',
          'some.file',
        ),
        'some content',
      );
      const project = buildMetaMaskRepository({
        shortname: 'project',
        directoryPath: path.join(sandbox.directoryPath, 'project'),
      });
      await writeFile(
        path.join(
          project.directoryPath,
          'some-directory',
          'child-directory',
          'some.file',
        ),
        'some content',
      );
      await writeFile(
        path.join(
          project.directoryPath,
          'some-directory',
          'child-directory',
          'grandchild-directory',
          'some.file',
        ),
        'some content',
      );

      const result = await directoryAndContentsConform('some-directory', {
        template,
        project,
        pass,
        fail,
      });

      expect(result).toStrictEqual({ passed: true });
    });
  });

  it('fails if the project and template have the same referenced directory with the same file structure, but some files do not have the same content', async () => {
    await withinSandbox(async (sandbox) => {
      const template = buildMetaMaskRepository({
        shortname: 'template',
        directoryPath: path.join(sandbox.directoryPath, 'template'),
      });
      await writeFile(
        path.join(
          template.directoryPath,
          'some-directory',
          'child-directory',
          'some.file',
        ),
        'some content',
      );
      await writeFile(
        path.join(
          template.directoryPath,
          'some-directory',
          'child-directory',
          'grandchild-directory',
          'some.file',
        ),
        'some content',
      );
      const project = buildMetaMaskRepository({
        shortname: 'project',
        directoryPath: path.join(sandbox.directoryPath, 'project'),
      });
      await writeFile(
        path.join(
          project.directoryPath,
          'some-directory',
          'child-directory',
          'some.file',
        ),
        'some content',
      );
      await writeFile(
        path.join(
          project.directoryPath,
          'some-directory',
          'child-directory',
          'grandchild-directory',
          'some.file',
        ),
        'different content',
      );

      const result = await directoryAndContentsConform('some-directory', {
        template,
        project,
        pass,
        fail,
      });

      expect(result).toStrictEqual({
        passed: false,
        failures: [
          {
            message:
              '`some-directory/child-directory/grandchild-directory/some.file` does not match the same file in the template repo.',
          },
        ],
      });
    });
  });

  it('fails if the project and template have the same referenced directory, but it does not have the same file structure', async () => {
    await withinSandbox(async (sandbox) => {
      const template = buildMetaMaskRepository({
        shortname: 'template',
        directoryPath: path.join(sandbox.directoryPath, 'template'),
      });
      await writeFile(
        path.join(
          template.directoryPath,
          'some-directory',
          'child-directory',
          'some.file',
        ),
        'some content',
      );
      await writeFile(
        path.join(
          template.directoryPath,
          'some-directory',
          'child-directory',
          'grandchild-directory',
          'some.file',
        ),
        'some content',
      );
      const project = buildMetaMaskRepository({
        shortname: 'project',
        directoryPath: path.join(sandbox.directoryPath, 'project'),
      });
      await writeFile(
        path.join(
          project.directoryPath,
          'some-directory',
          'child-directory',
          'some.file',
        ),
        'some content',
      );

      const result = await directoryAndContentsConform('some-directory', {
        template,
        project,
        pass,
        fail,
      });

      expect(result).toStrictEqual({
        passed: false,
        failures: [
          {
            message:
              '`some-directory/child-directory/grandchild-directory/some.file` does not exist in this project.',
          },
        ],
      });
    });
  });

  it('fails if the project does not have the same referenced directory as the template', async () => {
    await withinSandbox(async (sandbox) => {
      const template = buildMetaMaskRepository({
        shortname: 'template',
        directoryPath: path.join(sandbox.directoryPath, 'template'),
      });
      await writeFile(
        path.join(
          template.directoryPath,
          'some-directory',
          'child-directory',
          'some.file',
        ),
        'some content',
      );
      await writeFile(
        path.join(
          template.directoryPath,
          'some-directory',
          'child-directory',
          'grandchild-directory',
          'some.file',
        ),
        'some content',
      );
      const project = buildMetaMaskRepository({
        shortname: 'project',
        directoryPath: path.join(sandbox.directoryPath, 'project'),
      });

      const result = await directoryAndContentsConform('some-directory', {
        template,
        project,
        pass,
        fail,
      });

      expect(result).toStrictEqual({
        passed: false,
        failures: [
          {
            message: '`some-directory/` does not exist in this project.',
          },
        ],
      });
    });
  });
});

describe('packagePropertiesConform', () => {
  it('passes if the project and template have the same referenced property with its value matching', async () => {
    await withinSandbox(async (sandbox) => {
      const template = buildMetaMaskRepository({
        shortname: 'template',
        directoryPath: path.join(sandbox.directoryPath, 'template'),
      });
      await writeFile(
        path.join(template.directoryPath, 'package.json'),
        JSON.stringify(fakePackageManifest),
      );
      const project = buildMetaMaskRepository({
        shortname: 'project',
        directoryPath: path.join(sandbox.directoryPath, 'project'),
      });
      await writeFile(
        path.join(project.directoryPath, 'package.json'),
        JSON.stringify(fakePackageManifest),
      );
      const result = await packagePropertiesConform('main', {
        template,
        project,
        pass,
        fail,
      });

      expect(result).toStrictEqual({ passed: true });
    });
  });

  it('passes if the project and template have the same referenced property and its child properties', async () => {
    await withinSandbox(async (sandbox) => {
      const template = buildMetaMaskRepository({
        shortname: 'template',
        directoryPath: path.join(sandbox.directoryPath, 'template'),
      });
      await writeFile(
        path.join(template.directoryPath, 'package.json'),
        JSON.stringify(fakePackageManifest),
      );
      const project = buildMetaMaskRepository({
        shortname: 'project',
        directoryPath: path.join(sandbox.directoryPath, 'project'),
      });
      await writeFile(
        path.join(project.directoryPath, 'package.json'),
        JSON.stringify(fakePackageManifest),
      );
      const result = await packagePropertiesConform(
        'devDependencies',
        {
          template,
          project,
          pass,
          fail,
        },
        ['test'],
      );

      expect(result).toStrictEqual({ passed: true });
    });
  });

  it('fails if the project has the same referenced package as the template, but its version does not match', async () => {
    await withinSandbox(async (sandbox) => {
      const template = buildMetaMaskRepository({
        shortname: 'template',
        directoryPath: path.join(sandbox.directoryPath, 'template'),
      });
      await writeFile(
        path.join(template.directoryPath, 'package.json'),
        JSON.stringify(fakePackageManifest),
      );
      const project = buildMetaMaskRepository({
        shortname: 'project',
        directoryPath: path.join(sandbox.directoryPath, 'project'),
      });
      const fakeProjectPackageManifest = {
        ...fakePackageManifest,
        devDependencies: {
          test: '0.0.1',
        },
      };

      await writeFile(
        path.join(project.directoryPath, 'package.json'),
        JSON.stringify(fakeProjectPackageManifest),
      );
      const result = await packagePropertiesConform(
        'devDependencies',
        {
          template,
          project,
          pass,
          fail,
        },
        ['test'],
      );

      expect(result).toStrictEqual({
        passed: false,
        failures: [
          {
            message: '`test` is "0.0.1", when it should be "1.0.0".',
          },
        ],
      });
    });
  });

  it('fails if the project does not have the same referenced package as the template', async () => {
    await withinSandbox(async (sandbox) => {
      const template = buildMetaMaskRepository({
        shortname: 'template',
        directoryPath: path.join(sandbox.directoryPath, 'template'),
      });
      const fakeTemplatePackageManifest = {
        ...fakePackageManifest,
        devDependencies: {
          test: '1.0.0',
          'new-pack': '1.0.0',
        },
      };
      await writeFile(
        path.join(template.directoryPath, 'package.json'),
        JSON.stringify(fakeTemplatePackageManifest),
      );
      const project = buildMetaMaskRepository({
        shortname: 'project',
        directoryPath: path.join(sandbox.directoryPath, 'project'),
      });

      await writeFile(
        path.join(project.directoryPath, 'package.json'),
        JSON.stringify(fakePackageManifest),
      );

      const result = await packagePropertiesConform(
        'devDependencies',
        {
          template,
          project,
          pass,
          fail,
        },
        ['new-pack'],
      );

      expect(result).toStrictEqual({
        passed: false,
        failures: [
          {
            message:
              '`package.json` should list `"new-pack": "1.0.0"`, but does not.',
          },
        ],
      });
    });
  });

  it('throws error if the package does not exist in the template devDependencies', async () => {
    await withinSandbox(async (sandbox) => {
      const template = buildMetaMaskRepository({
        shortname: 'template',
        directoryPath: path.join(sandbox.directoryPath, 'template'),
      });
      await writeFile(
        path.join(template.directoryPath, 'package.json'),
        JSON.stringify(fakePackageManifest),
      );
      const project = buildMetaMaskRepository({
        shortname: 'project',
        directoryPath: path.join(sandbox.directoryPath, 'project'),
      });
      await writeFile(
        path.join(project.directoryPath, 'package.json'),
        JSON.stringify(fakePackageManifest),
      );

      await expect(
        packagePropertiesConform(
          'devDependencies',
          {
            template,
            project,
            pass,
            fail,
          },
          ['new-pack'],
        ),
      ).rejects.toThrow(
        'Could not find "new-pack" in template\'s package.json. This is not the fault of the project, but is rather a bug in a rule.',
      );
    });
  });
});

describe('getString', () => {
  it('returns empty string when the input is undefined', async () => {
    expect(getString(undefined)).toBe('');
  });

  it('returns same string when the input is string', async () => {
    expect(getString('test')).toBe('test');
  });

  it('returns stringified object when the input is json object', async () => {
    expect(getString({ test: 'test' })).toBe("{ test: 'test' }");
  });
});
