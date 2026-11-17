import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';

process.env.DATABASE_URL = 'postgres://test:test@localhost:5432/test';
process.env.JWT_SECRET = 'test-jwt-secret-that-is-at-least-32-characters';
process.env.POS_API_KEY = 'test-pos-api-key-that-is-at-least-32-characters';
process.env.CLIENT_ORIGIN = 'http://localhost:3000,https://retail-edm.vercel.app';

const { default: app } = await import('../src/app.js');
let server;
let baseUrl;

before(async () => {
  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  if (server) await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
});

for (const origin of ['http://localhost:3000', 'https://retail-edm.vercel.app']) {
  test(`CORS allows ${origin}`, async () => {
    const response = await fetch(`${baseUrl}/api/v1/auth/forgot-password`, {
      method: 'OPTIONS',
      headers: {
        Origin: origin,
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'content-type'
      }
    });
    assert.equal(response.status, 204);
    assert.equal(response.headers.get('access-control-allow-origin'), origin);
  });
}

test('CORS does not allow an unconfigured origin', async () => {
  const response = await fetch(`${baseUrl}/api/v1/auth/forgot-password`, {
    method: 'OPTIONS',
    headers: {
      Origin: 'https://untrusted.example',
      'Access-Control-Request-Method': 'POST',
      'Access-Control-Request-Headers': 'content-type'
    }
  });
  assert.equal(response.status, 204);
  assert.equal(response.headers.get('access-control-allow-origin'), null);
});
