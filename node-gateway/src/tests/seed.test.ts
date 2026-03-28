import mongoose from 'mongoose';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { MongoMemoryServer } from 'mongodb-memory-server';

import { ContentPageModel } from '../models/content.model';
import { LibraryDocumentModel } from '../models/library.model';
import { SubmissionModel } from '../models/submission.model';
import { UserModel } from '../models/user.model';
import { seedDemoData } from '../seeds/demo.seed';

describe.sequential('demo seed defaults', () => {
  let mongoServer: MongoMemoryServer;
  const originalEnv = { ...process.env };

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
  });

  beforeEach(async () => {
    await mongoose.connection.db!.dropDatabase();
    process.env = {
      ...originalEnv,
      NODE_ENV: 'development',
      SEED_SAMPLE_SUBMISSIONS: 'false',
    };
    delete process.env.SEED_DEMO_DATA;
  });

  afterAll(async () => {
    process.env = originalEnv;
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  it('seeds demo data by default in non-production when SEED_DEMO_DATA is not set', async () => {
    await seedDemoData();

    const userCount = await UserModel.countDocuments();
    const contentCount = await ContentPageModel.countDocuments();
    const libraryCount = await LibraryDocumentModel.countDocuments();
    const submissionCount = await SubmissionModel.countDocuments();
    const demoUser = await UserModel.findOne({ email: 'nguyenvana@gmail.com' }).lean();

    expect(userCount).toBeGreaterThan(0);
    expect(contentCount).toBeGreaterThanOrEqual(2);
    expect(libraryCount).toBeGreaterThan(0);
    expect(submissionCount).toBe(0);
    expect(demoUser?.defaultSubmissionId ?? null).toBeNull();
  });
});
