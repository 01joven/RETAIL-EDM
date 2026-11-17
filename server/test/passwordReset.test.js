import test from 'node:test';
import assert from 'node:assert/strict';
import { hashResetCode } from '../src/utils/passwordReset.js';

test('reset code hashes are stable for verification', () => {
  assert.equal(hashResetCode('42', '123456'), hashResetCode('42', '123456'));
});

test('reset code hashes are bound to both the user and code', () => {
  const hash = hashResetCode('42', '123456');
  assert.notEqual(hash, hashResetCode('43', '123456'));
  assert.notEqual(hash, hashResetCode('42', '654321'));
});
