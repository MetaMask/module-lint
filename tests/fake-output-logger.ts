import { MockWritable } from 'stdio-mock';

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
   * @param args - Either one or more messages, or a format string followed by
   * values.
   */
  logToStdout(...args: [string, ...any]) {
    logToStream(this.stdout, args);
  }

  /**
   * Writes a line to the fake standard error stream.
   *
   * @param args - Either one or more messages, or a format string followed by
   * values.
   */
  logToStderr(...args: [string, ...any]) {
    logToStream(this.stderr, args);
  }
}
