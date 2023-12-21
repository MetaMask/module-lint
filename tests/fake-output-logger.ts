import { MockWritable } from 'stdio-mock';
import stripAnsi from 'strip-ansi';

import type { AbstractOutputLogger } from '../src/output-logger';
import { logToStream } from '../src/output-logger';

export class FakeOutputLogger implements AbstractOutputLogger {
  /**
   * The fake standard out stream. Lines written can be accessed via `.data()`.
   */
  stdout: MockWritable;

  /**
   * The fake standard error stream. Lines written can be accessed via
   * `.data()`.
   */
  stderr: MockWritable;

  /**
   * Constructs a FakeOutputLogger.
   */
  constructor() {
    this.stdout = new MockWritable();
    this.stderr = new MockWritable();
  }

  /**
   * Writes a line to the fake standard out stream.
   *
   * @param args - Arguments to `stream.write`: either one or more messages, or
   * a format string followed by values.
   */
  logToStdout(...args: unknown[]) {
    logToStream(this.stdout, args);
  }

  /**
   * Writes a line to the fake standard error stream.
   *
   * @param args - Arguments to `stream.write`: either one or more messages, or
   * a format string followed by values.
   */
  logToStderr(...args: unknown[]) {
    logToStream(this.stderr, args);
  }

  /**
   * Retrieves the content of the fake standard out stream as a string, with
   * color stripped out, as that isn't useful in tests.
   *
   * @returns The standard out content.
   */
  getStdout() {
    return this.stdout.data().map(stripAnsi).join('');
  }

  /**
   * Retrieves the content of the fake standard error stream as a string, with
   * color stripped out, as that isn't useful in tests.
   *
   * @returns The standard error content.
   */
  getStderr() {
    return this.stderr.data().map(stripAnsi).join('');
  }
}
