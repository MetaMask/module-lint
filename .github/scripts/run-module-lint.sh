#!/usr/bin/env bash

if [[ -z "$PROJECT_NAME" ]]; then
  echo "Missing PROJECT_NAME."
  exit 1
fi

if [[ -z "$MODULE_LINT_RUNS_DIRECTORY" ]]; then
  echo "Missing MODULE_LINT_RUNS_DIRECTORY."
  exit 1
fi

mkdir -p "$MODULE_LINT_RUNS_DIRECTORY"

yarn run-tool "$PROJECT_NAME" > "$MODULE_LINT_RUNS_DIRECTORY/$PROJECT_NAME--output.txt"

exitcode=$?

echo $exitcode > "$MODULE_LINT_RUNS_DIRECTORY/$PROJECT_NAME--exitcode.txt"

cat "$MODULE_LINT_RUNS_DIRECTORY/$PROJECT_NAME--output.txt"

if [[ $exitcode -ne 0 && $exitcode -ne 100 ]]; then
  exit 1
else
  exit 0
fi
