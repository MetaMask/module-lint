import type { WriteStream } from 'fs';
import { format, inspect } from 'util';

/**
 * Represents the commonality between an output stream such as `process.stdout`
 * and the MockWritable interface from `stdio-mock`. In other words, this
 * type exists so that we can designate that a function takes a writable stream
 * without enforcing that it must be a Stream object.
 */
export type SimpleWriteStream = Pick<WriteStream, 'write'>;

/**
 * The minimal interface that an output logger is expected to have.
 */
export type AbstractOutputLogger = {
  /**
   * Writes a line to the standard out stream.
   *
   * @param args - Arguments to `stream.write`: either one or more
   * messages, or a format string followed by values.
   */
  logToStdout(...args: unknown[]): void;

  /**
   * Writes a line to the standard error stream.
   *
   * @param args - Arguments to `stream.write`: either one or more
   * messages, or a format string followed by values.
   */
  logToStderr(...args: unknown[]): void;
};

/**
 * A simple interface over the two streams commonly used to output messages to
 * the terminal. Designed such that a fake version of this class can be used in
 * tests.
 */
export class OutputLogger implements AbstractOutputLogger {
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
   * @param args - Arguments to `stream.write`: either one or more messages, or
   * a format string followed by values.
   */
  logToStdout(...args: unknown[]) {
    logToStream(this.#stdout, args);
  }

  /**
   * Writes a line to the standard error stream.
   *
   * @param args - Arguments to `stream.write`: either one or more messages, or
   * a format string followed by values.
   */
  logToStderr(...args: unknown[]) {
    logToStream(this.#stderr, args);
  }
}

/**
 * Writes a line to the given stream.
 *
 * @param stream - The stream.
 * @param args - Arguments to `stream.write`: either one or more messages, or a
 * format string followed by values.
 */
export function logToStream(stream: SimpleWriteStream, args: unknown[]) {
  if (typeof args[0] === 'string' && /%\w/u.test(args[0])) {
    stream.write(`${format(args[0], ...args.slice(1))}\n`);
  } else {
    stream.write(
      `${args
        .map((arg) => (typeof arg === 'string' ? arg : inspect(arg)))
        .join(' ')}\n`,
    );
  }
}
