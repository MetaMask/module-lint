import type { WriteStream } from 'fs';
import { format } from 'util';

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
  logToStdout(...args: [string, ...any]): void;

  /**
   * Writes a line to the standard error stream.
   *
   * @param args - Arguments to `stream.write`: either one or more
   * messages, or a format string followed by values.
   */
  logToStderr(...args: [string, ...any]): void;
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
   * @param args - Either one or more messages, or a format string followed by
   * values.
   */
  logToStdout(...args: [string, ...any]) {
    logToStream(this.#stdout, args);
  }

  /**
   * Writes a line to the standard error stream.
   *
   * @param args - Either one or more messages, or a format string followed by
   * values.
   */
  logToStderr(...args: [string, ...any]) {
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
export function logToStream(stream: SimpleWriteStream, args: [string, ...any]) {
  const [messageOrFormatString, ...rest] = args;
  if (rest.length > 0) {
    stream.write(format(`${messageOrFormatString}\n`, ...rest));
  } else {
    stream.write(`${messageOrFormatString}\n`);
  }
}
