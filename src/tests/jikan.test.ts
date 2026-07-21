import assert from 'node:assert/strict';
import test from 'node:test';
import { isUnknownMessage, validMalId } from '../jikan';

test('Jikan IDs must be positive integers', () => {
    assert.equal(validMalId(1), true);
    assert.equal(validMalId(0), false);
    assert.equal(validMalId(-1), false);
    assert.equal(validMalId('1'), false);
    assert.equal(validMalId(undefined), false);
});

test('only Discord unknown-message errors are suppressed during cleanup', () => {
    assert.equal(isUnknownMessage({ code: 10008 }), true);
    assert.equal(isUnknownMessage({ code: 50001 }), false);
    assert.equal(isUnknownMessage(new Error('deleted')), false);
});
