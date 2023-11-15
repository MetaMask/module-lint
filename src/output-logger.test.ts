import { MockWritable } from 'stdio-mock';

import { OutputLogger } from './output-logger';

describe('OutputLogger', () => {
  describe('logToStdout', () => {
    describe('given a single string', () => {
      it('prints the string as a line to stdout', () => {
        const stdout = new MockWritable();
        const stderr = new MockWritable();
        const outputLogger = new OutputLogger({ stdout, stderr });

        outputLogger.logToStdout('hello');

        expect(stdout.data()).toStrictEqual(['hello\n']);
      });

      it('does nothing to stderr', () => {
        const stdout = new MockWritable();
        const stderr = new MockWritable();
        const outputLogger = new OutputLogger({ stdout, stderr });

        outputLogger.logToStdout('hello');

        expect(stderr.data()).toStrictEqual([]);
      });
    });

    describe('given a format string plus values', () => {
      it('prints the formatted version of the string as a line to stdout', () => {
        const stdout = new MockWritable();
        const stderr = new MockWritable();
        const outputLogger = new OutputLogger({ stdout, stderr });

        outputLogger.logToStdout('shine on you %o', { crazy: 'diamond' });

        expect(stdout.data()).toStrictEqual([
          "shine on you { crazy: 'diamond' }\n",
        ]);
      });

      it('does nothing to stderr', () => {
        const stdout = new MockWritable();
        const stderr = new MockWritable();
        const outputLogger = new OutputLogger({ stdout, stderr });

        outputLogger.logToStdout('shine on you %o', { crazy: 'diamond' });

        expect(stderr.data()).toStrictEqual([]);
      });
    });
  });

  describe('logToStderr', () => {
    describe('given a single string', () => {
      it('prints the string as a line to stderr', () => {
        const stdout = new MockWritable();
        const stderr = new MockWritable();
        const outputLogger = new OutputLogger({ stdout, stderr });

        outputLogger.logToStderr('hello');

        expect(stderr.data()).toStrictEqual(['hello\n']);
      });

      it('does nothing to stdout', () => {
        const stdout = new MockWritable();
        const stderr = new MockWritable();
        const outputLogger = new OutputLogger({ stdout, stderr });

        outputLogger.logToStderr('hello');

        expect(stdout.data()).toStrictEqual([]);
      });
    });

    describe('given a format string plus values', () => {
      it('prints the formatted version of the string as a line to stderr', () => {
        const stdout = new MockWritable();
        const stderr = new MockWritable();
        const outputLogger = new OutputLogger({ stdout, stderr });

        outputLogger.logToStderr('shine on you %o', { crazy: 'diamond' });

        expect(stderr.data()).toStrictEqual([
          "shine on you { crazy: 'diamond' }\n",
        ]);
      });

      it('does nothing to stdout', () => {
        const stdout = new MockWritable();
        const stderr = new MockWritable();
        const outputLogger = new OutputLogger({ stdout, stderr });

        outputLogger.logToStderr('shine on you %o', { crazy: 'diamond' });

        expect(stdout.data()).toStrictEqual([]);
      });
    });
  });
});
