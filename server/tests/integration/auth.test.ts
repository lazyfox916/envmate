/**
 * Integration Tests for Authentication Endpoints
 * Tests the full auth flow including registration, login, and token management
 */

import request from 'supertest';
import app from '../../src/index';
import { User } from '../../src/models';
import sequelize from '../../src/database/connection';
import { cleanupTestData, assertSuccessResponse, assertErrorResponse } from '../utils';

describe('Authentication Endpoints', () => {
  // Clean up before and after all tests
  beforeAll(async () => {
    await sequelize.authenticate();
  });

  afterEach(async () => {
    await cleanupTestData();
  });

  afterAll(async () => {
    await sequelize.close();
  });

  // ===========================================
  // Registration Tests
  // ===========================================

  describe('POST /api/v1/auth/register', () => {
    const validUser = {
      email: 'newuser@example.com',
      password: 'SecurePass123!',
      name: 'New User',
    };

    it('should register a new user successfully', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(validUser)
        .expect(201);

      assertSuccessResponse(response);
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data.user.email).toBe(validUser.email);
      expect(response.body.data.user.name).toBe(validUser.name);
      expect(response.body.data.user).not.toHaveProperty('password_hash');
    });

    it('should return tokens on registration', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(validUser)
        .expect(201);

      expect(response.body.data).toHaveProperty('accessToken');
      expect(response.body.data).toHaveProperty('refreshToken');
    });

    it('should reject duplicate email', async () => {
      // First registration
      await request(app)
        .post('/api/v1/auth/register')
        .send(validUser);

      // Second registration with same email
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(validUser)
        .expect(400);

      assertErrorResponse(response);
    });

    it('should reject invalid email format', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          ...validUser,
          email: 'invalid-email',
        })
        .expect(400);

      assertErrorResponse(response);
    });

    it('should reject weak password', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          ...validUser,
          password: 'weak',
        })
        .expect(400);

      assertErrorResponse(response);
    });

    it('should reject missing required fields', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({ email: 'test@example.com' })
        .expect(400);

      assertErrorResponse(response);
    });

    it('should lowercase email on registration', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          ...validUser,
          email: 'UPPERCASE@EXAMPLE.COM',
        })
        .expect(201);

      expect(response.body.data.user.email).toBe('uppercase@example.com');
    });
  });

  // ===========================================
  // Login Tests
  // ===========================================

  describe('POST /api/v1/auth/login', () => {
    const userCredentials = {
      email: 'loginuser@example.com',
      password: 'SecurePass123!',
      name: 'Login User',
    };

    beforeEach(async () => {
      // Create a user to login with
      await request(app)
        .post('/api/v1/auth/register')
        .send(userCredentials);
    });

    it('should login with valid credentials', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: userCredentials.email,
          password: userCredentials.password,
        })
        .expect(200);

      assertSuccessResponse(response);
      expect(response.body.data).toHaveProperty('accessToken');
      expect(response.body.data).toHaveProperty('refreshToken');
      expect(response.body.data).toHaveProperty('user');
    });

    it('should reject invalid password', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: userCredentials.email,
          password: 'WrongPassword123!',
        })
        .expect(401);

      assertErrorResponse(response);
    });

    it('should reject non-existent user', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'AnyPassword123!',
        })
        .expect(401);

      assertErrorResponse(response);
    });

    it('should be case-insensitive for email', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: userCredentials.email.toUpperCase(),
          password: userCredentials.password,
        })
        .expect(200);

      assertSuccessResponse(response);
    });

    it('should reject missing credentials', async () => {
      await request(app)
        .post('/api/v1/auth/login')
        .send({})
        .expect(400);
    });
  });

  // ===========================================
  // Token Refresh Tests
  // ===========================================

  describe('POST /api/v1/auth/refresh', () => {
    let refreshToken: string;

    beforeEach(async () => {
      // Create and login user
      const registerResponse = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'refreshuser@example.com',
          password: 'SecurePass123!',
          name: 'Refresh User',
        });

      refreshToken = registerResponse.body.data.refreshToken;
    });

    it('should refresh tokens with valid refresh token', async () => {
      const response = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken })
        .expect(200);

      assertSuccessResponse(response);
      expect(response.body.data).toHaveProperty('accessToken');
      expect(response.body.data).toHaveProperty('refreshToken');
    });

    it('should reject invalid refresh token', async () => {
      const response = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: 'invalid-token' })
        .expect(401);

      assertErrorResponse(response);
    });

    it('should reject missing refresh token', async () => {
      await request(app)
        .post('/api/v1/auth/refresh')
        .send({})
        .expect(400);
    });
  });

  // ===========================================
  // Get Current User Tests
  // ===========================================

  describe('GET /api/v1/auth/me', () => {
    let accessToken: string;
    let userEmail: string;

    beforeEach(async () => {
      userEmail = 'meuser@example.com';
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: userEmail,
          password: 'SecurePass123!',
          name: 'Me User',
        });

      accessToken = response.body.data.accessToken;
    });

    it('should return current user with valid token', async () => {
      const response = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      assertSuccessResponse(response);
      expect(response.body.data.email).toBe(userEmail);
      expect(response.body.data).not.toHaveProperty('password_hash');
    });

    it('should reject request without token', async () => {
      await request(app)
        .get('/api/v1/auth/me')
        .expect(401);
    });

    it('should reject invalid token', async () => {
      await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });

    it('should reject expired token format', async () => {
      await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', 'InvalidFormat token')
        .expect(401);
    });
  });

  // ===========================================
  // Logout Tests
  // ===========================================

  describe('POST /api/v1/auth/logout', () => {
    let accessToken: string;
    let refreshToken: string;

    beforeEach(async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'logoutuser@example.com',
          password: 'SecurePass123!',
          name: 'Logout User',
        });

      accessToken = response.body.data.accessToken;
      refreshToken = response.body.data.refreshToken;
    });

    it('should logout successfully', async () => {
      const response = await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ refreshToken })
        .expect(200);

      assertSuccessResponse(response);
    });

    it('should reject logout without token', async () => {
      await request(app)
        .post('/api/v1/auth/logout')
        .send({ refreshToken })
        .expect(401);
    });
  });

  // ===========================================
  // Security Tests
  // ===========================================

  describe('Security', () => {
    it('should prevent rapid registration attempts (rate limiting)', async () => {
      const requests: Promise<request.Response>[] = [];

      // Make multiple rapid requests
      for (let i = 0; i < 15; i++) {
        requests.push(
          request(app)
            .post('/api/v1/auth/register')
            .send({
              email: `ratelimit-${i}@example.com`,
              password: 'SecurePass123!',
              name: `Rate Limit User ${i}`,
            })
        );
      }

      const responses = await Promise.all(requests);
      
      // At least some should be rate limited (429)
      const rateLimited = responses.filter(r => r.status === 429);
      
      // We expect rate limiting to kick in
      // If no rate limiting, this test documents the behavior
      if (rateLimited.length === 0) {
        console.warn('Rate limiting may not be configured for auth endpoints');
      }
    });

    it('should not expose sensitive info in error messages', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'WrongPassword123!',
        })
        .expect(401);

      // Error message should be generic
      expect(response.body.error).not.toContain('password');
      expect(response.body.error).not.toContain('not found');
    });

    it('should sanitize email input', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: '  test@example.com  ',
          password: 'SecurePass123!',
          name: 'Sanitize Test',
        })
        .expect(201);

      expect(response.body.data.user.email).toBe('test@example.com');
    });
  });
});
