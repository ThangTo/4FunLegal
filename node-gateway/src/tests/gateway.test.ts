import mongoose from 'mongoose';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';
import axios from 'axios';

import { app } from '../../app';
import { ContentPageModel } from '../models/content.model';
import { ReviewModel } from '../models/review.model';
import { SubmissionModel } from '../models/submission.model';
import { UserModel } from '../models/user.model';
import { seedDemoData } from '../seeds/demo.seed';
import { hashPassword } from '../utils/auth-password';

const loginAsDemoUser = async () => {
  const agent = request.agent(app);
  const response = await agent.post('/api/v1/auth/login').send({
    email: 'nguyenvana@gmail.com',
    password: 'User@123456',
  });

  expect(response.status).toBe(200);
  return agent;
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const waitForReviewState = async (
  agent: ReturnType<typeof request.agent>,
  submissionId: string,
  expectedStatus: 'completed' | 'failed',
) => {
  let lastStatus: number | null = null;
  let lastBody: unknown = null;

  for (let attempt = 0; attempt < 100; attempt += 1) {
    const response = await agent.get(`/api/v1/submissions/${submissionId}/reviews/latest`);
    lastStatus = response.status;
    lastBody = response.body;

    if (response.status === 200 && response.body.data.status === expectedStatus) {
      return response;
    }

    await sleep(50);
  }

  throw new Error(
    `Review never reached ${expectedStatus}. Last status=${lastStatus}, body=${JSON.stringify(lastBody)}, submission=${JSON.stringify(
      await SubmissionModel.findById(submissionId).lean(),
    )}, reviews=${JSON.stringify(await ReviewModel.find({ submissionId }).lean())}`,
  );
};

const buildSuccessAnalysis = () => ({
  provider: 'deterministic-fastapi',
  documents: [
    {
      id: expect.any(String),
      ocrStatus: 'completed',
      validationStatus: 'verified',
      ocrText: 'OCR text',
      ocrSummary: 'OCR summary',
    },
  ],
  review: {
    statusBanner: {
      tone: 'success',
      title: 'Du dieu kien so bo',
      description: 'Ready for official submission.',
      score: 92,
      scoreLabel: 'Ready for official submission',
    },
    summaryItems: [
      {
        id: 'documents-read',
        tone: 'success',
        icon: 'check_circle',
        text: 'Processed all uploaded documents.',
      },
    ],
    findings: [],
    missingDocuments: [],
    nextActions: [
      {
        id: 'official-submit',
        step: 1,
        title: 'Submit officially',
        description: 'Create the internal receipt.',
      },
    ],
    references: ['Nghi dinh 01/2021/ND-CP'],
  },
});

const mockSuccessfulReviewAnalysis = () => {
  vi.spyOn(axios, 'post').mockImplementation(async (url, payload) => {
    const targetUrl = String(url);

    if (targetUrl.includes('/internal/v1/reviews/analyze')) {
      const typedPayload = payload as {
        documents: Array<{ id: string }>;
      };

      return {
        data: {
          ...buildSuccessAnalysis(),
          documents: typedPayload.documents.map((document) => ({
            id: document.id,
            ocrStatus: 'completed',
            validationStatus: 'verified',
            ocrText: 'OCR text',
            ocrSummary: 'OCR summary',
          })),
        },
      };
    }

    if (targetUrl.includes('/internal/v1/assistant/reply')) {
      return {
        data: {
          provider: 'deterministic-fastapi',
          paragraphs: ['Assistant reply'],
          references: ['Nghi dinh 01/2021/ND-CP'],
          actions: [],
          suggestedPrompts: ['Ho so nay con thieu gi?'],
        },
      };
    }

    throw new Error(`Unexpected axios.post call: ${targetUrl}`);
  });
};

const createCompletedSubmission = async (
  agent: ReturnType<typeof request.agent>,
) => {
  const createResponse = await agent.post('/api/v1/submissions');
  const submissionId = createResponse.body.data.id as string;

  await agent.patch(`/api/v1/submissions/${submissionId}/owner`).send({
    ownerName: 'Tran Thi B',
    nationalId: '012345678901',
    birthDate: '1990-01-01',
    phone: '0911222333',
    email: 'tran@example.com',
    address: '123 Tran Hung Dao, Quan 1',
    submittedByProxy: false,
    proxyName: '',
    proxyRelationship: '',
  });
  await agent.patch(`/api/v1/submissions/${submissionId}/business`).send({
    businessName: 'Ho kinh doanh Tran Gia Quan 1',
    businessModel: 'Ho kinh doanh ca the',
    businessAddress: '123 Tran Hung Dao, Quan 1',
    startDate: '2026-05-01',
    businessDescription: 'Ban le thuc pham tai cua hang va giao hang online.',
    householdMembers: '',
  });
  await agent.patch(`/api/v1/submissions/${submissionId}/industry`).send({
    mainIndustry: 'Ban le do uong',
    expectedCapital: '10000000',
    laborScale: '1 - 2 lao dong',
    salesChannel: 'Tai cua hang va online',
    requiresPracticeLicense: false,
  });

  return submissionId;
};

const uploadRequiredDocuments = async (
  agent: ReturnType<typeof request.agent>,
  submissionId: string,
) => {
  await agent
    .post(`/api/v1/submissions/${submissionId}/documents`)
    .attach('files', Buffer.from('cccd text content'), 'cccd-owner.txt')
    .attach('files', Buffer.from('application text content'), 'don_dang_ky.txt')
    .attach('files', Buffer.from('lease text content'), 'lease-contract.txt');
};

describe.sequential('gateway api', () => {
  let mongoServer: MongoMemoryServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    process.env.MONGODB_URI = mongoServer.getUri();
    process.env.SEED_DEMO_DATA = 'true';
    process.env.SEED_SAMPLE_SUBMISSIONS = 'false';
    process.env.JWT_ACCESS_SECRET = 'test-access-secret';
    process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
    process.env.FRONTEND_ORIGIN = 'http://localhost:5173';
    process.env.FASTAPI_AI_BASE_URL = 'http://localhost:8000';
    process.env.FASTAPI_INTERNAL_API_KEY = 'test-fastapi-key';
    process.env.FASTAPI_TIMEOUT_MS = '5000';
    await mongoose.connect(process.env.MONGODB_URI);
  });

  beforeEach(async () => {
    vi.restoreAllMocks();
    await mongoose.connection.db!.dropDatabase();
    await seedDemoData();
  });

  afterAll(async () => {
    vi.restoreAllMocks();
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  it('serves public content pages even when there is no authenticated user', async () => {
    await mongoose.connection.db!.dropDatabase();
    await ContentPageModel.create({
      slug: 'landing',
      title: 'Landing',
      payload: {
        hero: {
          title: 'Landing page',
        },
      },
      version: 1,
    });

    const response = await request(app).get('/api/v1/content/pages/landing');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.slug).toBe('landing');
  });

  it('creates a fresh submission without seeded sample dossiers', async () => {
    const agent = await loginAsDemoUser();
    const response = await agent.post('/api/v1/submissions');
    const currentUser = await UserModel.findOne({ email: 'nguyenvana@gmail.com' }).lean();

    expect(response.status).toBe(201);
    expect(response.body.data.draft.ownerName).toBe('Nguyễn Văn A');
    expect(response.body.data.draft.businessName).toBe('');
    expect(response.body.data.status).toBe('draft');
    expect(currentUser?.defaultSubmissionId).toBe(response.body.data.id);
    expect(await SubmissionModel.countDocuments()).toBe(1);
  });

  it('builds a dynamic checklist and blocks review until required documents are present', async () => {
    const agent = await loginAsDemoUser();
    const submissionId = await createCompletedSubmission(agent);

    await agent.patch(`/api/v1/submissions/${submissionId}/owner`).send({
      ownerName: 'Tran Thi B',
      nationalId: '012345678901',
      birthDate: '1990-01-01',
      phone: '0911222333',
      email: 'tran@example.com',
      address: '123 Tran Hung Dao, Quan 1',
      submittedByProxy: true,
      proxyName: 'Le Van C',
      proxyRelationship: 'Nguoi duoc uy quyen',
    });
    await agent.patch(`/api/v1/submissions/${submissionId}/business`).send({
      businessName: 'Ho kinh doanh Gia Dinh Quan 1',
      businessModel: 'Ho kinh doanh co thanh vien ho gia dinh',
      businessAddress: '123 Tran Hung Dao, Quan 1',
      startDate: '2026-05-01',
      businessDescription: 'Ban le thuc pham tai cua hang va giao hang online.',
      householdMembers: '02 thanh vien cung tham gia',
    });
    await agent.patch(`/api/v1/submissions/${submissionId}/industry`).send({
      mainIndustry: 'Ban le do uong',
      expectedCapital: '10000000',
      laborScale: '1 - 2 lao dong',
      salesChannel: 'Tai cua hang va online',
      requiresPracticeLicense: true,
    });

    const documentsResponse = await agent.get(`/api/v1/submissions/${submissionId}/documents`);
    const reviewResponse = await agent.post(`/api/v1/submissions/${submissionId}/reviews`);
    const missingRequiredIds = documentsResponse.body.data.checklist
      .filter((item: { status: string }) => item.status === 'missing_required')
      .map((item: { id: string }) => item.id);

    expect(documentsResponse.status).toBe(200);
    expect(missingRequiredIds).toContain('authorization');
    expect(missingRequiredIds).toContain('practice-license');
    expect(missingRequiredIds).toContain('household-member-consent');
    expect(reviewResponse.status).toBe(422);
    expect(reviewResponse.body.error.details.missingDocuments).toContain('authorization');
  });

  it('completes the review through FastAPI integration and allows official submission', async () => {
    mockSuccessfulReviewAnalysis();
    const agent = await loginAsDemoUser();
    const submissionId = await createCompletedSubmission(agent);
    await uploadRequiredDocuments(agent, submissionId);

    const reviewCreateResponse = await agent.post(`/api/v1/submissions/${submissionId}/reviews`);
    expect(reviewCreateResponse.status).toBe(201);
    const reviewLatestResponse = await waitForReviewState(agent, submissionId, 'completed');
    const reviewResultResponse = await agent.get(
      `/api/v1/submissions/${submissionId}/reviews/latest/result`,
    );
    const submitResponse = await agent.post(`/api/v1/submissions/${submissionId}/submit`);
    const lockedEditResponse = await agent
      .patch(`/api/v1/submissions/${submissionId}/owner`)
      .send({ ownerName: 'Blocked Edit' });

    expect(reviewLatestResponse.body.data.status).toBe('completed');
    expect(reviewResultResponse.status).toBe(200);
    expect(reviewResultResponse.body.data.submissionStatus).toBe('eligible');
    expect(submitResponse.status).toBe(200);
    expect(submitResponse.body.data.status).toBe('submitted');
    expect(submitResponse.body.data.finalSubmission.confirmationNumber).toBeTruthy();
    expect(lockedEditResponse.status).toBe(409);
  }, 15000);

  it('invalidates the latest review when documents change after a successful result', async () => {
    mockSuccessfulReviewAnalysis();
    const agent = await loginAsDemoUser();
    const submissionId = await createCompletedSubmission(agent);
    await uploadRequiredDocuments(agent, submissionId);

    const reviewCreateResponse = await agent.post(`/api/v1/submissions/${submissionId}/reviews`);
    expect(reviewCreateResponse.status).toBe(201);
    await waitForReviewState(agent, submissionId, 'completed');

    const uploadResponse = await agent
      .post(`/api/v1/submissions/${submissionId}/documents`)
      .attach('files', Buffer.from('updated identity'), 'cccd-moi.txt');
    const refreshedSubmission = await agent.get(`/api/v1/submissions/${submissionId}`);
    const resultResponse = await agent.get(
      `/api/v1/submissions/${submissionId}/reviews/latest/result`,
    );

    expect(uploadResponse.status).toBe(201);
    expect(refreshedSubmission.body.data.status).toBe('documents_pending');
    expect(refreshedSubmission.body.data.latestReviewId).toBeNull();
    expect(resultResponse.status).toBe(404);
  }, 15000);

  it('maps FastAPI failures to failed review state and allows retry', async () => {
    vi.spyOn(axios, 'post').mockRejectedValue(new Error('connect ECONNREFUSED'));

    const agent = await loginAsDemoUser();
    const submissionId = await createCompletedSubmission(agent);
    await uploadRequiredDocuments(agent, submissionId);

    const reviewCreateResponse = await agent.post(`/api/v1/submissions/${submissionId}/reviews`);
    expect(reviewCreateResponse.status).toBe(201);
    const reviewLatestResponse = await waitForReviewState(agent, submissionId, 'failed');
    const submissionResponse = await agent.get(`/api/v1/submissions/${submissionId}`);

    expect(reviewLatestResponse.body.data.canRetry).toBe(true);
    expect(reviewLatestResponse.body.data.errorMessage).toBe(
      'FastAPI AI review service is unavailable.',
    );
    expect(submissionResponse.body.data.status).toBe('documents_pending');
  }, 15000);

  it('returns assistant session and proxies replies through FastAPI assistant endpoint', async () => {
    mockSuccessfulReviewAnalysis();
    const agent = await loginAsDemoUser();
    const submissionId = await createCompletedSubmission(agent);
    await uploadRequiredDocuments(agent, submissionId);
    const reviewCreateResponse = await agent.post(`/api/v1/submissions/${submissionId}/reviews`);
    expect(reviewCreateResponse.status).toBe(201);
    await waitForReviewState(agent, submissionId, 'completed');

    const sessionResponse = await agent.get(`/api/v1/submissions/${submissionId}/assistant/session`);
    const messageResponse = await agent
      .post(`/api/v1/submissions/${submissionId}/assistant/messages`)
      .send({ message: 'Ho so cua toi con thieu gi?' });

    expect(sessionResponse.status).toBe(200);
    expect(sessionResponse.body.data.messages.length).toBeGreaterThan(0);
    expect(messageResponse.status).toBe(201);
    expect(messageResponse.body.data.reply.paragraphs[0]).toBe('Assistant reply');
  }, 15000);

  it('serves library data publicly and personalizes related resources when authenticated', async () => {
    const publicDocumentsResponse = await request(app)
      .get('/api/v1/library/documents')
      .query({ category: 'procedure', q: 'dang ky' });

    const publicRelatedResponse = await request(app)
      .get('/api/v1/library/related')
      .query({ submissionId: '507f1f77bcf86cd799439011' });

    const agent = await loginAsDemoUser();
    const submissionId = await createCompletedSubmission(agent);
    const personalizedRelatedResponse = await agent
      .get('/api/v1/library/related')
      .query({ submissionId });

    const subscriptionResponse = await request(app)
      .post('/api/v1/library/subscriptions')
      .send({ email: 'notify@example.com', source: 'library' });

    expect(publicDocumentsResponse.status).toBe(200);
    expect(publicRelatedResponse.status).toBe(200);
    expect(personalizedRelatedResponse.status).toBe(200);
    expect(subscriptionResponse.status).toBe(201);
  });

  it('preserves ownership checks on submissions after auth migration', async () => {
    const agent = await loginAsDemoUser();
    const otherUser = await UserModel.create({
      fullName: 'Other User',
      email: 'other@example.com',
      phone: '0911111111',
      status: 'active',
      role: 'user',
      passwordHash: await hashPassword('Other@123456'),
    });
    const foreignSubmission = await SubmissionModel.create({
      userId: otherUser._id,
      submissionCode: 'HKD-2026-77777',
      type: 'household',
      currentStep: 1,
      status: 'draft',
      completionPercent: 25,
      owner: {
        ownerName: 'Other User',
        nationalId: '012345678901',
        birthDate: '1990-01-01',
        phone: '0911111111',
        email: 'other@example.com',
        address: '123 Other Street',
        submittedByProxy: false,
        proxyName: '',
        proxyRelationship: '',
      },
      business: {
        businessName: '',
        businessModel: 'Ho kinh doanh ca the',
        businessAddress: '',
        startDate: '',
        businessDescription: '',
        householdMembers: '',
      },
      industry: {
        mainIndustry: '',
        subIndustry: '',
        expectedCapital: '',
        laborScale: '',
        salesChannel: '',
        note: '',
        requiresPracticeLicense: false,
      },
    });

    const response = await agent.get(`/api/v1/submissions/${foreignSubmission.id}`);

    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
  });
});
