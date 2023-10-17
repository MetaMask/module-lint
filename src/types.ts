import type { WriteStream } from 'fs';

/**
 * Represents the commonality between an output stream such as `process.stdout`
 * and the MockWritable interface from `stdio-mock`. In other words, this
 * type exists so that we can designate that a function takes a writable stream
 * without enforcing that it must be a Stream object.
 */
export type SimpleWriteStream = Pick<WriteStream, 'write'>;
