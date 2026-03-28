import mongoose from 'mongoose';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import connectDB, { disconnectDB, getActiveMongoUri } from '../config/db';

describe.sequential('database connection fallback', () => {
  const originalEnv = { ...process.env };

  beforeEach(async () => {
    await disconnectDB();
    process.env = {
      ...originalEnv,
      NODE_ENV: 'test',
      ALLOW_IN_MEMORY_DB_FALLBACK: 'true',
      MONGODB_SERVER_SELECTION_TIMEOUT_MS: '100',
    };
  });

  afterEach(async () => {
    await disconnectDB();
    process.env = originalEnv;
  });

  it('falls back to in-memory mongo when the configured database is unreachable', async () => {
    process.env.MONGODB_URI = 'mongodb://127.0.0.1:1/legal-fact-check';

    await connectDB();

    expect(mongoose.connection.readyState).toBe(1);
    expect(getActiveMongoUri()).toBeTruthy();
    expect(getActiveMongoUri()).not.toBe(process.env.MONGODB_URI);
  });
});
