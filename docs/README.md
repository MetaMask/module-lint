# Documentation

Welcome to the documentation for `module-lint`, a tool to aid with keeping MetaMask library repos standardized.

## Table of contents

- [How this tool works](#technical-summary)
- [How to use this tool](#usage)
- [How to interpret a report and take action on an unsuccessful run](#taking-action-on-unsuccessful-runs)

## Technical summary

`module-lint` implements a series of predefined rules that are run against one or many project repos to measure how closely they conform to a model repo (currently defined as the [module template](https://github.com/MetaMask/metamask-module-template)). These rules inspect a repo directly to check the full — or in some cases, partial — contents of specific files within the repo and cross-reference them against corresponding portions of files in the template. All rules are designed to be granular and topical to make it easier for developers to test them and to provide better guidance for users in resolving lint violations. After the tool has run through all of the rules, it will print a report listing which ones passed and which ones failed, with detailed messages for each.

This project includes an executable which can be used to run the tool manually. However, it also includes a GitHub action, which runs the tool automatically on a cadence against a [predefined list of repos](../.github/workflows/generate-periodic-report.yml) and outputs a report of each repo to a Slack channel.

## Usage

**First, a disclaimer: This project is still under development by the Wallet Framework team and is not available for general use.**

### CLI

At the moment, this tool is only usable within the context of this repo. Make sure you've [cloned this repo and set it up](../README.md#setup) before continuing.

From here, there are two ways to run it:

#### Linting specific projects

``` bash
yarn run-tool <PROJECT> [<PROJECT> ...]
```

Here, `<PROJECT>` is the short name of a MetaMask repo, minus the `MetaMask/` scope. For instance, to lint `https://github.com/MetaMask/utils` and `https://github.com/MetaMask/create-release-branch`:

``` bash
yarn run-tool utils create-release-branch
```

This will clone all repos and run the list of rules against them.

#### Linting all projects

``` bash
yarn run-tool
```

This will clone a [predefined set of repos](../src/constants.ts) and run the list of rules against them.

### GitHub action

Although the GitHub action runs automatically, if you wish to run it manually, you may do so.

Simply navigate to [Actions](https://github.com/MetaMask/module-lint/actions) and click on the ["Periodically run module-lint and report results"](https://github.com/MetaMask/module-lint/actions/workflows/generate-periodic-report.yml) workflow. Then click on the "Run workflow" dropdown and finally press the "Run workflow" button.

## Taking action on unsuccessful runs

So, let's say you've run the tool and you get output that looks like this:

```
[✔︎] Is the classic Yarn config file (`.yarnrc`) absent?
[✘] Does the package have a well-formed manifest (`package.json`)?
    - Invalid `package.json`: Invalid `import` (Expected a string, but received: [object Object]); Invalid `require` (Expected a string, but received: [object Object]).
[✔︎] Is `README.md` present?
[?] Does the README conform by recommending the correct Yarn version to install?
    - ERROR: Could not find Yarn version in template's README. This is not the fault of the project, but is rather a bug in a rule.
[✘] Does the README conform by recommending node install from nodejs.org?
    - `README.md` should contain "Install the current LTS version of [Node.js](https://nodejs.org)", but does not.
[?] Are all of the files for Yarn Modern present, and do they conform?
    - ERROR: Could not read directory '/Users/elliot/code/metamask/module-lint/tmp/repositories/metamask-module-template/.yarn/releases'
[✔︎] Does the `src/` directory exist?
[✘] Is `.nvmrc` present, and does it conform?
    - `.nvmrc` does not match the same file in the template repo.
[✘] Is `jest.config.js` present, and does it conform?
    - `jest.config.js` does not match the same file in the template repo.
[✘] Is `tsconfig.json` present, and does it conform?
    - `tsconfig.json` does not match the same file in the template repo.
[✔︎] Is `tsconfig.build.json` present, and does it conform?
[✘] Is `tsup.config.ts` present, and does it conform?
    - `tsup.config.ts` does not exist in this project.
[✔︎] Is `typedoc.json` present, and does it conform?
[✔︎] Is `CHANGELOG.md` present?
[?] Is `CHANGELOG.md` well-formatted?
    - ERROR: Tried to get version from package manifest in order to validate changelog, but manifest is not well-formed (Invalid `import` (Expected a string, but received: [object Object]); Invalid `require` (Expected a string, but received: [object Object]).).
[✔︎] Is `.editorconfig` present, and does it conform?
[✔︎] Is `.gitattributes` present, and does it conform?
[✔︎] Is `.gitignore` present, and does it conform?

Results:       9 passed, 6 failed, 3 errored, 18 total
Elapsed time:  1742 ms
```

What do you do with this information?

<!--
As you can see, each rule has a small responsibility. Usually a rule checks whether a file or directory within the template repo is also present in the project repo and whether the contents match. But in some cases, a rule is concerned with a portion of a file (such as whether there are instructions for installing Yarn in the README and whether they match the corresponding portion of the template's README).
-->

There are three statuses that a rule can have, and they are indicated by an icon:

- Rules that start with `[✔︎]` succeeded. There is nothing you need to do.
- Rules that start with `[✘]` failed because one or more of the conditions on which the rule rests failed. To fix the violation, you may need to copy over an entire or a portion of file from the template repo to the project repo. You can use the failure message(s) to guide you.
- Rules that start with `[?]` are a bit different: these indicate bugs in `module-lint` itself that prevent the rule from running fully. Hence, to resolve these errors you will need to go into the rule and add some logic which prevents the error from occurring. If the rule relies on another rule, then you may need to add that rule as a dependency. This will prevent the rule from running entirely if its parent fails.

In addition to understanding how to read the output, it's also important to have a good strategy for resolving a failed run, particularly if a repo is severely out of alignment and there are many violations. While you can certainly start at the top, work your way down, and fix all violations in one go, you will likely find it easier to standardize a repo by creating and submitting rounds of changes centered around a similar focus. Many of the rules, in fact, were designed to fit into the following categories:

- Yarn configuration
- Node version configuration (development and production)
- TypeScript configuration
- Build process
- Testing configuration
- Publishing (configuration and workflow)
- Documentation (configuration and workflow)
- Dotfiles
- Overall structure

Taking a closer look at the example output above, the violations for `package.json` and `tsup.config.ts` tell us that the build process and some of the publishing configuration is likely out of date, and so we may wish to address the rules for these files in the same PR. The rules for `tsconfig.json` and `tsconfig.build.json` are also related and, although they fall into the TypeScript category, they may be related to publishing configuration (as these files control where built files go, and those built files are referenced in the exports), so we may even want to address them along with `package.json` and `tsup.config.ts`.