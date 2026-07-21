import assert from 'node:assert/strict';
import test from 'node:test';
import { calculateVoteThreshold, canDirectlyControlTrack, checkVoiceControl, formatDuration, moveArrayItem, parseSeekPosition } from '../music/utils';
import { validateMediaUrl } from '../music/service';

test('voice controls require the user to share the bot channel', () => {
    assert.equal(checkVoiceControl(null, null), 'not-in-voice');
    assert.equal(checkVoiceControl('voice-a', 'voice-b'), 'different-channel');
    assert.equal(checkVoiceControl('voice-a', null), 'allowed');
    assert.equal(checkVoiceControl('voice-a', 'voice-a'), 'allowed');
});

test('queue items can be moved without mutating the source', () => {
    const source = ['one', 'two', 'three'];
    assert.deepEqual(moveArrayItem(source, 0, 2), ['two', 'three', 'one']);
    assert.deepEqual(source, ['one', 'two', 'three']);
    assert.throws(() => moveArrayItem(source, -1, 1), RangeError);
    assert.throws(() => moveArrayItem(source, 0, 3), RangeError);
});

test('duration and seek inputs are normalized', () => {
    assert.equal(formatDuration(65_000), '1:05');
    assert.equal(formatDuration(3_665_000), '1:01:05');
    assert.equal(formatDuration(0, true), 'LIVE');
    assert.equal(parseSeekPosition('90'), 90_000);
    assert.equal(parseSeekPosition('1:30'), 90_000);
    assert.equal(parseSeekPosition('1:01:05'), 3_665_000);
    assert.equal(parseSeekPosition('1:bad'), null);
});

test('media URLs are restricted to supported providers', () => {
    assert.doesNotThrow(() => validateMediaUrl('song title'));
    assert.doesNotThrow(() => validateMediaUrl('https://youtu.be/dQw4w9WgXcQ'));
    assert.doesNotThrow(() => validateMediaUrl('https://open.spotify.com/track/example'));
    assert.doesNotThrow(() => validateMediaUrl('https://spotify.link/example'));
    assert.throws(() => validateMediaUrl('http://youtube.com/watch?v=example'));
    assert.throws(() => validateMediaUrl('https://youtube.com.example.org/audio'));
});

test('listener votes require half the channel with at least two voters', () => {
    assert.equal(calculateVoteThreshold(1), 1);
    assert.equal(calculateVoteThreshold(2), 2);
    assert.equal(calculateVoteThreshold(3), 2);
    assert.equal(calculateVoteThreshold(4), 2);
    assert.equal(calculateVoteThreshold(5), 3);
});

test('only a present requester directly controls their track', () => {
    assert.equal(canDirectlyControlTrack('owner', 'owner', true), true);
    assert.equal(canDirectlyControlTrack('owner', 'listener', true), false);
    assert.equal(canDirectlyControlTrack('owner', 'owner', false), false);
    assert.equal(canDirectlyControlTrack(null, 'listener', true), false);
});
