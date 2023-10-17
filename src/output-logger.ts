import { format } from 'util';

import type { SimpleWriteStream } from './types';

/**
 * Wraps the two streams commonly used to output messages to the terminal,
 * but designed such that these streams can be swapped in tests for fake
 * versions.
 */
export class OutputLogger {
  #stdout: SimpleWriteStream;

  #stderr: SimpleWriteStream;

  /**
   * Constructs an OutputLogger instance.
   *
   * @param args - The arguments.
   * @param args.stdout - The standard out stream.
   * @param args.stderr - The standard error stream.
   */
  constructor({
    stdout,
    stderr,
  }: {
    stdout: SimpleWriteStream;
    stderr: SimpleWriteStream;
  }) {
    this.#stdout = stdout;
    this.#stderr = stderr;
  }

  /**
   * Writes a line to the standard out stream.
   *
   * @param args - Arguments to `stream.write`: either one or more
   * messages, or a format string followed by values.
   */
  logToStdout(...args: [string, ...any]) {
    this.#logTo(this.#stdout, args);
  }

  /**
   * Writes a line to the standard error stream.
   *
   * @param args - Arguments to `stream.write`: either one or more
   * messages, or a format string followed by values.
   */
  logToStderr(...args: [string, ...any]) {
    this.#logTo(this.#stderr, args);
  }

  #logTo(
    stream: SimpleWriteStream,
    [messageOrFormatString, ...rest]: [string, ...any],
  ) {
    if (rest.length > 0) {
      stream.write(format(`${messageOrFormatString}\n`, ...rest));
    } else {
      stream.write(`${messageOrFormatString}\n`);
    }
  }
}
