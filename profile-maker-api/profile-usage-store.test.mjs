import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { readProfileUsage, writeProfileUsage } from './profile-usage-store.mjs';

function temporaryLedger(t) {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'hongcafe-usage-'));
    t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
    return path.join(directory, 'usage.json');
}

test('usage starts empty only for a missing ledger and persists valid counters', (t) => {
    const file = temporaryLedger(t);
    assert.deepEqual(readProfileUsage(file), {});
    const usage = { '2026-09-08': 5, '2026-09-08:geminiAttempts': 15 };
    writeProfileUsage(file, usage);
    assert.deepEqual(readProfileUsage(file), usage);
});

test('corrupt, non-object, and invalid usage counters fail closed without overwriting evidence', (t) => {
    const file = temporaryLedger(t);
    for (const content of ['{broken', 'null', '[]', '{"count":-1}', '{"count":"10"}', '{"count":1.5}']) {
        fs.writeFileSync(file, content);
        assert.throws(() => readProfileUsage(file), (error) => error.status === 503 && error.expose);
        assert.equal(fs.readFileSync(file, 'utf8'), content);
    }
});

test('ledger read permission failures never reset usage', (t) => {
    const file = temporaryLedger(t);
    const original = fs.readFileSync;
    t.mock.method(fs, 'readFileSync', (target, ...args) => {
        if (target === file) throw Object.assign(new Error('denied'), { code: 'EACCES' });
        return original(target, ...args);
    });
    assert.throws(() => readProfileUsage(file), (error) => error.status === 503);
});

test('failed atomic replacement preserves the previous ledger and blocks the request', (t) => {
    const file = temporaryLedger(t);
    writeProfileUsage(file, { count: 12 });
    const original = fs.renameSync;
    t.mock.method(fs, 'renameSync', (from, to) => {
        if (to === file) throw Object.assign(new Error('disk failure'), { code: 'EIO' });
        return original(from, to);
    });
    assert.throws(() => writeProfileUsage(file, { count: 13 }), (error) => error.status === 503);
    assert.deepEqual(readProfileUsage(file), { count: 12 });
    assert.deepEqual(fs.readdirSync(path.dirname(file)), ['usage.json']);
});
