import {
  ensureDirectoryStructureExists,
  writeFile,
} from '@metamask/utils/node';
import path from 'path';

import {
  combineRuleExecutionResults,
  dataConform,
  directoryAndContentsConform,
  directoryExists,
  fail,
  fileConforms,
  fileExists,
  packageManifestPropertiesConform,
  pass,
} from './rule-helpers';
import {
  buildMetaMaskRepository,
  buildPackageManifestMock,
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

describe('packageManifestPropertiesConform', () => {
  it('passes if the project and template have the same properties at the first level of the package manifest and their values match', async () => {
    await withinSandbox(async (sandbox) => {
      const template = buildMetaMaskRepository({
        shortname: 'template',
        directoryPath: path.join(sandbox.directoryPath, 'template'),
      });
      await writeFile(
        path.join(template.directoryPath, 'package.json'),
        buildPackageManifestMock(),
      );
      const project = buildMetaMaskRepository({
        shortname: 'project',
        directoryPath: path.join(sandbox.directoryPath, 'project'),
      });
      await writeFile(
        path.join(project.directoryPath, 'package.json'),
        buildPackageManifestMock(),
      );
      const result = await packageManifestPropertiesConform(
        ['main', 'module'],
        {
          template,
          project,
          pass,
          fail,
        },
      );

      expect(result).toStrictEqual({ passed: true });
    });
  });

  it('passes if the project and template have the same property at a deeper level of the package manifest and its value matches', async () => {
    await withinSandbox(async (sandbox) => {
      const template = buildMetaMaskRepository({
        shortname: 'template',
        directoryPath: path.join(sandbox.directoryPath, 'template'),
      });
      await writeFile(
        path.join(template.directoryPath, 'package.json'),
        buildPackageManifestMock({
          devDependencies: { test: '1.0.0', 'test-pack': '1.0.0' },
        }),
      );
      const project = buildMetaMaskRepository({
        shortname: 'project',
        directoryPath: path.join(sandbox.directoryPath, 'project'),
      });
      await writeFile(
        path.join(project.directoryPath, 'package.json'),
        buildPackageManifestMock({
          devDependencies: { test: '1.0.0', 'test-pack': '1.0.0' },
        }),
      );
      const result = await packageManifestPropertiesConform(
        ["devDependencies.['test']", "devDependencies.['test-pack']"],
        {
          template,
          project,
          pass,
          fail,
        },
      );

      expect(result).toStrictEqual({ passed: true });
    });
  });

  it('fails if the project and template have the same properties, but one or more of their values do not match', async () => {
    await withinSandbox(async (sandbox) => {
      const template = buildMetaMaskRepository({
        shortname: 'template',
        directoryPath: path.join(sandbox.directoryPath, 'template'),
      });
      await writeFile(
        path.join(template.directoryPath, 'package.json'),
        buildPackageManifestMock({
          devDependencies: { test: '1.0.0', 'test-pack': '1.0.0' },
        }),
      );
      const project = buildMetaMaskRepository({
        shortname: 'project',
        directoryPath: path.join(sandbox.directoryPath, 'project'),
      });
      await writeFile(
        path.join(project.directoryPath, 'package.json'),
        buildPackageManifestMock({
          devDependencies: { test: '0.0.1', 'test-pack': '1.0.0' },
        }),
      );
      const result = await packageManifestPropertiesConform(
        ["devDependencies.['test']", "devDependencies.['test-pack']"],
        {
          template,
          project,
          pass,
          fail,
        },
      );

      expect(result).toStrictEqual({
        passed: false,
        failures: [
          {
            message:
              "`devDependencies.['test']` is '0.0.1', when it should be '1.0.0'.",
          },
        ],
      });
    });
  });

  it('fails if the template has a property that the project does not have', async () => {
    await withinSandbox(async (sandbox) => {
      const template = buildMetaMaskRepository({
        shortname: 'template',
        directoryPath: path.join(sandbox.directoryPath, 'template'),
      });
      await writeFile(
        path.join(template.directoryPath, 'package.json'),
        buildPackageManifestMock({
          devDependencies: {
            test: '1.0.0',
            'new-pack': '1.0.0',
          },
        }),
      );
      const project = buildMetaMaskRepository({
        shortname: 'project',
        directoryPath: path.join(sandbox.directoryPath, 'project'),
      });

      await writeFile(
        path.join(project.directoryPath, 'package.json'),
        buildPackageManifestMock(),
      );

      const result = await packageManifestPropertiesConform(
        ["devDependencies.['new-pack']"],
        {
          template,
          project,
          pass,
          fail,
        },
      );

      expect(result).toStrictEqual({
        passed: false,
        failures: [
          {
            message:
              "`package.json` should list `'devDependencies.['new-pack']': '1.0.0'`, but does not.",
          },
        ],
      });
    });
  });

  it("throws error if a property does not exist in the template's package manifest", async () => {
    await withinSandbox(async (sandbox) => {
      const template = buildMetaMaskRepository({
        shortname: 'template',
        directoryPath: path.join(sandbox.directoryPath, 'template'),
      });
      await writeFile(
        path.join(template.directoryPath, 'package.json'),
        buildPackageManifestMock(),
      );
      const project = buildMetaMaskRepository({
        shortname: 'project',
        directoryPath: path.join(sandbox.directoryPath, 'project'),
      });
      await writeFile(
        path.join(project.directoryPath, 'package.json'),
        buildPackageManifestMock(),
      );

      await expect(
        packageManifestPropertiesConform(["devDependencies.['new-pack']"], {
          template,
          project,
          pass,
          fail,
        }),
      ).rejects.toThrow(
        "Could not find `devDependencies.['new-pack']` in reference `package.json`. This is not the fault of the target `package.json`, but is rather a bug in a rule.",
      );
    });
  });
});

describe('dataConform', () => {
  it('passes if the reference and target have the same properties at the first level and their values match', () => {
    const referenceObject = {
      firstLevel: 'test',
    };
    const targetObject = {
      firstLevel: 'test',
    };
    const result = dataConform(
      referenceObject,
      targetObject,
      'firstLevel',
      'test.json',
    );

    expect(result).toStrictEqual({ passed: true });
  });
  it('passes if the reference and target have the same property at a deeper level and its value matches', () => {
    const referenceObject = {
      firstLevel: 'test',
      deeperLevel: {
        test: 'test',
      },
    };
    const targetObject = {
      firstLevel: 'test',
      deeperLevel: {
        test: 'test',
      },
    };
    const result = dataConform(
      referenceObject,
      targetObject,
      "deeperLevel.['test']",
      'test.json',
    );

    expect(result).toStrictEqual({ passed: true });
  });
  it('passes if the target has same properties as reference with additional properties', () => {
    const referenceObject = {
      firstLevel: 'test',
      deeperLevel: {
        test: 'test',
      },
    };
    const targetObject = {
      firstLevel: 'test',
      deeperLevel: {
        test: 'test',
        'new-pack': 'new pack',
      },
    };
    const result = dataConform(
      referenceObject,
      targetObject,
      'deeperLevel',
      'test.json',
    );

    expect(result).toStrictEqual({ passed: true });
  });
  it('fails if the reference and target does not match at the first level', () => {
    const referenceObject = {
      firstLevel: 'first level',
      deeperLevel: {
        test: 'test',
      },
    };
    const targetObject = {
      firstLevel: 'test',
      deeperLevel: {
        test: 'test',
      },
    };

    const result = dataConform(
      referenceObject,
      targetObject,
      'firstLevel',
      'test.json',
    );

    expect(result).toStrictEqual({
      passed: false,
      failures: [
        {
          message: "`firstLevel` is 'test', when it should be 'first level'.",
        },
      ],
    });
  });

  it('fails if the reference and target does not match at the deeper level', () => {
    const referenceObject = {
      firstLevel: 'first level',
      deeperLevel: {
        test: 'deeper level',
      },
    };
    const targetObject = {
      firstLevel: 'test',
      deeperLevel: {
        test: 'test',
      },
    };

    const result = dataConform(
      referenceObject,
      targetObject,
      "deeperLevel.['test']",
      'test.json',
    );

    expect(result).toStrictEqual({
      passed: false,
      failures: [
        {
          message:
            "`deeperLevel.['test']` is 'test', when it should be 'deeper level'.",
        },
      ],
    });
  });

  it('fails if the reference has a property at the first level that the target does not have', () => {
    const referenceObject = {
      firstLevel: 'first level',
      deeperLevel: {
        test: 'deeper level',
      },
    };
    const targetObject = {
      deeperLevel: {
        test: 'test',
      },
    };

    const result = dataConform(
      referenceObject,
      targetObject,
      'firstLevel',
      'test.json',
    );

    expect(result).toStrictEqual({
      passed: false,
      failures: [
        {
          message:
            "`test.json` should list `'firstLevel': 'first level'`, but does not.",
        },
      ],
    });
  });
  it('throws error if a propertyPath does not exist in the reference object', () => {
    const referenceObject = {
      deeperLevel: {
        test: 'deeper level',
      },
    };
    const targetObject = {
      firstLevel: 'first level',
      deeperLevel: {
        test: 'deeper level',
      },
    };

    expect(() =>
      dataConform(referenceObject, targetObject, 'firstLevel', 'test.json'),
    ).toThrow(
      'Could not find `firstLevel` in reference `test.json`. This is not the fault of the target `test.json`, but is rather a bug in a rule.',
    );
  });
});
