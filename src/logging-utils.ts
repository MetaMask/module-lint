import * as loglevel from 'loglevel';
import { format } from 'util';

/**
 * A logger object obtained via `loglevel` which has been assigned a `getLogger`
 * method, which allows for nesting loggers.
 */
export type AugmentedLogger = loglevel.Logger & {
  getLogger(name: string | symbol): AugmentedLogger;
};

/**
 * The `DEBUG` environment variable is a pattern that can be used to set one or
 * many loggers to use the "debug" log level. It can either be the name of a
 * logger or a namespace such as "metamask:*".
 *
 * This variable holds a representation of `DEBUG` as a regular expression that
 * can be matched against logger names to determine whether their levels should
 * be set to "debug".
 */
const DEBUG_LOGGING_REGEX = (() => {
  // This is okay; this tool is designed to be used on the command line.
  // eslint-disable-next-line n/no-process-env
  const pattern = process.env.DEBUG;

  if (pattern === undefined || pattern.trim() === '') {
    return null;
  }

  const regexpSource = `^${pattern.replace(':*', '(?::[^:]+)?')}$`;

  return new RegExp(regexpSource, 'u');
})();

/**
 * @see [`loglevel`](https://github.com/pimterry/loglevel/blob/f0187213feb6495630545a34a3b91633db47a1ee/index.d.ts#L33)
 */
const LOG_LEVEL_NAMES = ['TRACE', 'DEBUG', 'INFO', 'WARN', 'ERROR', 'SILENT'];

/**
 * @see [`loglevel`](https://github.com/pimterry/loglevel/blob/f0187213feb6495630545a34a3b91633db47a1ee/index.d.ts#L16)
 */
const DEBUG_LOG_LEVEL = 1;

/**
 * Returns a new logger object extended with a `getLogger` method, so that
 * loggers can be nested.
 *
 * @param logger - A logger object obtained via `loglevel`.
 * @returns A new logger with a `getLogger` method.
 */
function augmentLogger(logger: loglevel.Logger): AugmentedLogger {
  // const originalFactory = logger.methodFactory;
  return Object.assign(logger, {
    getLogger(name: string | symbol): AugmentedLogger {
      // @ts-expect-error `name` is not part of the types for `loglevel`, even
      // though it's part of the public API
      const loggerName: string | symbol = this.name;

      return getLogger(`${String(loggerName)}:${String(name)}`);
    },
    methodFactory(
      _methodName: loglevel.LogLevelNames,
      logLevel: loglevel.LogLevelNumbers,
      loggerName: string | symbol,
    ) {
      // const rawMethod = originalFactory(methodName, logLevel, loggerName);
      const loggingMethod: loglevel.LoggingMethod = (...messages) => {
        const formattedDate = new Date().toISOString();
        const logLevelName = LOG_LEVEL_NAMES[logLevel];
        const prefix = [
          `[${String(loggerName)}]`,
          logLevelName ? `[${logLevelName}]` : '',
          `[${formattedDate}]`,
        ]
          .map((piece) => `${piece} `)
          .join('');
        // rawMethod(prefix, ...messages);
        const stream =
          logLevel <= DEBUG_LOG_LEVEL ? process.stderr : process.stdout;
        if (typeof messages[0] === 'string') {
          const [firstMessage, ...rest] = messages;
          stream.write(`${format(`${prefix}${firstMessage}`, ...rest)}\n`);
        } else {
          stream.write(`${prefix}${messages.map(String).join(' ')}\n`);
        }
      };
      return loggingMethod;
    },
  });
}

/**
 * A version of `loglevel`'s `getLogger` function, but with three modifications:
 *
 * 1. Logger messages are reformatted to prefix the name of the logger (which
 * module is producing log messages) and the log level.
 * 2. The returned logger object is extended with a `getLogger` method. This
 * can be used to create nested loggers.
 * 3. The level of the logger is automatically set to "debug" if the `DEBUG`
 * environment variable is set and the pattern specified by this variable
 * matches the name of the logger.
 *
 * @param name - The name of the logger.
 * @returns The wrapped logger.
 */
function getLogger(name: string | symbol): AugmentedLogger {
  const augmentedLogger = augmentLogger(loglevel.getLogger(name));
  // @ts-expect-error `name` is not part of the types for `loglevel`, even
  // though it's part of the public API
  const loggerName: string | symbol = augmentedLogger.name;

  if (DEBUG_LOGGING_REGEX?.test(String(loggerName))) {
    augmentedLogger.setLevel('debug');
  }

  return augmentedLogger;
}

loglevel.setDefaultLevel('info');

/**
 * Logs a message with the name `metamask`.
 *
 * You can see these log messages by running the tool with `DEBUG="metamask:*"`
 * or `DEBUG="metamask:module-lint:*"`.
 */
const metamaskLogger = getLogger('metamask');

/**
 * Logs a message under the namespace `metamask:module-lint`.
 *
 * You can see these log messages by running the tool with `DEBUG="metamask:*"`
 * or `DEBUG="metamask:module-lint:*"`.
 */
export const logger = metamaskLogger.getLogger('module-lint');
