import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import path from 'node:path';

test('all compiled commands have unique valid definitions', () => {
    const commandsPath = path.join(__dirname, '..', 'commands');
    const definitions = fs.readdirSync(commandsPath)
        .filter(file => file.endsWith('.js'))
        .map(file => require(path.join(commandsPath, file)).data.toJSON());
    const names = definitions.map(definition => definition.name);

    assert.equal(new Set(names).size, names.length);
    assert.ok(names.length >= 40);
    for (const definition of definitions) {
        assert.match(definition.name, /^[\w-]{1,32}$/);
        assert.ok(definition.description.length >= 1 && definition.description.length <= 100);
        assert.ok((definition.options?.length ?? 0) <= 25);
    }
});

test('the full stateless music command surface is compiled', () => {
    const commandsPath = path.join(__dirname, '..', 'commands');
    const names = new Set(fs.readdirSync(commandsPath).filter(file => file.endsWith('.js')).map(file => require(path.join(commandsPath, file)).data.name));
    const expected = [
        'play', 'search', 'pause', 'resume', 'skip', 'stop', 'disconnect', 'previous', 'replay', 'nowplaying',
        'queue', 'remove', 'move', 'clear', 'duplicates', 'history', 'exportqueue', 'importqueue', 'volume',
        'loop', 'autoplay', 'shuffle', 'seek', 'filter', 'bassboost', '8d', 'speed', 'pitch', 'tremolo',
        'vibrato', 'lyrics',
    ];
    for (const command of expected) assert.ok(names.has(command), `Missing /${command}`);
});
