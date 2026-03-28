import mongoose from 'mongoose';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';
import axios from 'axios';

import { app } from '../../app';
import { UserModel } from '../models/user.model';
import { seedDemoData } from '../seeds/demo.seed';

const getCookieValue = (
  cookies: string | string[] | undefined,
  cookieName: string,
) => {
  const cookieList = typeof cookies === 'string' ? [cookies] : cookies;
  const cookie = cookieList?.find((item) => item.startsWith(`${cookieName}=`));
  return cookie?.split(';')[0];
};

const startGoogleAuth = async (agent: ReturnType<typeof request.agent>, redirect = '/register') => {
  const response = await agent.get('/api/v1/auth/google/start').query({ redirect });
  const location = new URL(response.headers.location);
  const state = location.searchParams.get('state');

  expect(response.status).toBe(302);
  expect(location.origin).toBe('https://accounts.google.com');
  expect(state).toBeTruthy();

  return state!;
};

describe.sequential('auth api', () => {
  let mongoServer: MongoMemoryServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    process.env.MONGODB_URI = mongoServer.getUri();
    process.env.SEED_DEMO_DATA = 'true';
    process.env.SEED_SAMPLE_SUBMISSIONS = 'false';
    process.env.JWT_ACCESS_SECRET = 'test-access-secret';
    process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
    process.env.FRONTEND_ORIGIN = 'http://localhost:5173';
    process.env.GOOGLE_CLIENT_ID = 'google-client-id';
    process.env.GOOGLE_CLIENT_SECRET = 'google-client-secret';
    process.env.GOOGLE_CALLBACK_URL = 'http://localhost:3000/api/v1/auth/google/callback';
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

  it('registers a user, hashes the password and sets auth cookies', async () => {
    const agent = request.agent(app);
    const response = await agent.post('/api/v1/auth/register').send({
      fullName: 'Tran Thi Test',
      email: 'tranthi@example.com',
      phone: '0901231234',
      password: 'Password@123',
    });

    const persistedUser = await UserModel.findOne({ email: 'tranthi@example.com' }).lean();
    const meResponse = await agent.get('/api/v1/auth/me');

    expect(response.status).toBe(201);
    expect(response.headers['set-cookie']).toBeTruthy();
    expect(persistedUser?.passwordHash).toBeTruthy();
    expect(persistedUser?.passwordHash).not.toBe('Password@123');
    expect(meResponse.status).toBe(200);
    expect(meResponse.body.data.email).toBe('tranthi@example.com');
  });

  it('rejects invalid password login attempts', async () => {
    const response = await request(app).post('/api/v1/auth/login').send({
      email: 'nguyenvana@gmail.com',
      password: 'wrong-password',
    });

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });

  it('returns auth me only when the session is authenticated', async () => {
    const unauthenticatedResponse = await request(app).get('/api/v1/auth/me');
    const agent = request.agent(app);

    await agent.post('/api/v1/auth/login').send({
      email: 'nguyenvana@gmail.com',
      password: 'User@123456',
    });
    const meResponse = await agent.get('/api/v1/auth/me');

    expect(unauthenticatedResponse.status).toBe(401);
    expect(meResponse.status).toBe(200);
    expect(meResponse.body.data.role).toBe('user');
  });

  it('rotates refresh tokens and rejects refresh token reuse', async () => {
    const agent = request.agent(app);
    const loginResponse = await agent.post('/api/v1/auth/login').send({
      email: 'nguyenvana@gmail.com',
      password: 'User@123456',
    });

    const originalRefreshCookie = getCookieValue(
      loginResponse.headers['set-cookie'],
      'refreshToken',
    );
    const refreshResponse = await agent.post('/api/v1/auth/refresh');
    const reuseResponse = await request(app)
      .post('/api/v1/auth/refresh')
      .set('Cookie', originalRefreshCookie ?? '');
    const meAfterReuse = await agent.get('/api/v1/auth/me');

    expect(refreshResponse.status).toBe(200);
    expect(
      getCookieValue(refreshResponse.headers['set-cookie'], 'refreshToken'),
    ).not.toBe(originalRefreshCookie);
    expect(reuseResponse.status).toBe(401);
    expect(meAfterReuse.status).toBe(401);
  });

  it('logs the user out and clears the session immediately', async () => {
    const agent = request.agent(app);
    await agent.post('/api/v1/auth/login').send({
      email: 'nguyenvana@gmail.com',
      password: 'User@123456',
    });

    const logoutResponse = await agent.post('/api/v1/auth/logout');
    const meResponse = await agent.get('/api/v1/auth/me');

    expect(logoutResponse.status).toBe(200);
    expect(logoutResponse.body.data.loggedOut).toBe(true);
    expect(meResponse.status).toBe(401);
  });

  it('creates a new Google-linked user when the email does not exist yet', async () => {
    const agent = request.agent(app);
    const state = await startGoogleAuth(agent, '/results');

    vi.spyOn(axios, 'post').mockResolvedValue({
      data: {
        access_token: 'google-access-token',
        token_type: 'Bearer',
        expires_in: 3600,
      },
    });
    vi.spyOn(axios, 'get').mockResolvedValue({
      data: {
        sub: 'google-sub-new',
        email: 'google.new@example.com',
        name: 'Google New User',
        picture: 'https://example.com/avatar.png',
      },
    });

    const callbackResponse = await agent
      .get('/api/v1/auth/google/callback')
      .query({ code: 'google-code', state });
    const meResponse = await agent.get('/api/v1/auth/me');

    expect(callbackResponse.status).toBe(302);
    expect(callbackResponse.headers.location).toBe(
      'http://localhost:5173/auth/complete-profile?redirect=%2Fresults',
    );
    expect(meResponse.status).toBe(200);
    expect(meResponse.body.data.email).toBe('google.new@example.com');
    expect(meResponse.body.data.profileCompleted).toBe(false);
  });

  it('links Google OAuth to an existing password account with the same email', async () => {
    const agent = request.agent(app);
    const state = await startGoogleAuth(agent, '/history');

    vi.spyOn(axios, 'post').mockResolvedValue({
      data: {
        access_token: 'google-access-token',
        token_type: 'Bearer',
        expires_in: 3600,
      },
    });
    vi.spyOn(axios, 'get').mockResolvedValue({
      data: {
        sub: 'google-linked-sub',
        email: 'nguyenvana@gmail.com',
        name: 'Nguyen Van A',
        picture: 'https://example.com/avatar-linked.png',
      },
    });

    const callbackResponse = await agent
      .get('/api/v1/auth/google/callback')
      .query({ code: 'google-code', state });
    const linkedUser = await UserModel.findOne({ email: 'nguyenvana@gmail.com' }).lean();

    expect(callbackResponse.status).toBe(302);
    expect(callbackResponse.headers.location).toBe('http://localhost:5173/history');
    expect(linkedUser?.googleSub).toBe('google-linked-sub');
  });

  it('completes the phone profile for a Google-first user and unlocks protected routes', async () => {
    const agent = request.agent(app);
    const state = await startGoogleAuth(agent, '/register');

    vi.spyOn(axios, 'post').mockResolvedValue({
      data: {
        access_token: 'google-access-token',
        token_type: 'Bearer',
        expires_in: 3600,
      },
    });
    vi.spyOn(axios, 'get').mockResolvedValue({
      data: {
        sub: 'google-needs-phone',
        email: 'google.phone@example.com',
        name: 'Phone Missing User',
        picture: 'https://example.com/avatar-phone.png',
      },
    });

    await agent.get('/api/v1/auth/google/callback').query({ code: 'google-code', state });
    const protectedBeforeCompletion = await agent.get('/api/v1/submissions');
    const completeProfileResponse = await agent
      .patch('/api/v1/auth/profile')
      .send({ phone: '0912345678' });
    const protectedAfterCompletion = await agent.get('/api/v1/submissions');

    expect(protectedBeforeCompletion.status).toBe(403);
    expect(completeProfileResponse.status).toBe(200);
    expect(completeProfileResponse.body.data.profileCompleted).toBe(true);
    expect(protectedAfterCompletion.status).toBe(200);
  });
});
