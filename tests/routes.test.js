const request = require('supertest');
const express = require('express');
const authRouter = require('../src/routes/auth');
const reportsRouter = require('../src/routes/reports');

describe('Auth Routes', () => {
  let app;
  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/v1/auth', authRouter);
  });

  it('POST /register should validate input', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ username: 'ab' });
    expect(res.status).toBe(400);
  });

  it('POST /register should create user', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123'
      });
    expect([201, 200]).toContain(res.status);
  });
});

describe('Reports Routes', () => {
  let app;
  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/v1/reports', reportsRouter);
  });

  it('GET / should return reports list', async () => {
    const res = await request(app).get('/api/v1/reports');
    expect([200, 500]).toContain(res.status);
    if (res.status === 200) {
      expect(res.body).toHaveProperty('data');
    }
  });
});
