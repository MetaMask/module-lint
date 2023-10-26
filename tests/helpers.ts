import { createSandbox } from '@metamask/utils/node';

import { createModuleLogger, projectLogger } from '../src/logging-utils';

const { withinSandbox } = createSandbox('module-lint-tests');

export const log = createModuleLogger(projectLogger, 'tests');

export { withinSandbox };
