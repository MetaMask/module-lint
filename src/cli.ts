#!/usr/bin/env node

import {
  DEFAULT_PROJECT_NAMES,
  DEFAULT_CACHED_REPOSITORIES_DIRECTORY_PATH,
  VALID_REPOSITORIES_CACHE_PATH,
} from './constants';
import { main } from './main';

main({
  argv: process.argv,
  stdout: process.stdout,
  stderr: process.stderr,
  config: {
    validRepositoriesCachePath: VALID_REPOSITORIES_CACHE_PATH,
    cachedRepositoriesDirectoryPath: DEFAULT_CACHED_REPOSITORIES_DIRECTORY_PATH,
    defaultProjectNames: DEFAULT_PROJECT_NAMES,
  },
}).catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

// vi: ft=typescript
