#!/usr/bin/env node

import {
  DEFAULT_PROJECT_NAMES,
  DEFAULT_CACHED_REPOSITORIES_DIRECTORY_PATH,
} from './constants';
import { main } from './main';

main({
  argv: process.argv,
  stdout: process.stdout,
  stderr: process.stderr,
  config: {
    cachedRepositoriesDirectoryPath: DEFAULT_CACHED_REPOSITORIES_DIRECTORY_PATH,
    defaultProjectNames: DEFAULT_PROJECT_NAMES,
  },
}).catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
