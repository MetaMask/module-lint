import { createSandbox } from '@metamask/utils/node';

const { withinSandbox } = createSandbox('module-lint-tests');

export { withinSandbox };
