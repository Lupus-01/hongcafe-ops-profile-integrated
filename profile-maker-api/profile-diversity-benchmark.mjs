// Offline assignment benchmark. Never imports server.mjs or calls a model.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { setImmediate as yieldToEventLoop } from 'node:timers/promises';
import { selectProfileCopyVariant } from './profile-copy-engine.mjs';
import { createOfflineVisualRuntime } from './profile-diversity-runtime.mjs';

const CATEGORIES = ['tarot-ppt', 'saju-ppt', 'sinjeom-ppt'];
const SOURCES = ['server.mjs', 'profile-copy-engine.mjs', 'profile-copy-options.mjs', 'profile-visual-engine.mjs',
    'profile-scene-catalog.mjs', 'profile-assignment-index.mjs', 'profile-diversity-runtime.mjs', 'profile-diversity-benchmark.mjs'];

function codeHash() {
    const hash = crypto.createHash('sha256');
    for (const source of SOURCES) hash.update(fs.readFileSync(new URL(source, import.meta.url)));
    return hash.digest('hex');
}

export async function runAssignmentBenchmark({ profiles = 24000, scenario = 'balanced', checkpoint = '', stopAfter = Infinity, log = console.log } = {}) {
    assert.ok(Number.isSafeInteger(profiles) && profiles > 0, 'profiles must be a positive safe integer');
    assert.ok(scenario === 'balanced' || CATEGORIES.includes(scenario), 'Unknown scenario');
    assert.ok(stopAfter === Infinity || (Number.isSafeInteger(stopAfter) && stopAfter > 0), 'stopAfter must be positive');
    const configuration = { profiles, scenario, codeHash: codeHash() };
    let state = { format: 'hongcafe-offline-assignment-v1', configuration, completed: 0, elapsedMs: 0, peakRssBytes: 0,
        categories: Object.fromEntries(CATEGORIES.map(type => [type, { copies: [], visuals: [], directions: {}, scenes: {}, sameDirection: 0 }])) };
    if (checkpoint && fs.existsSync(checkpoint)) {
        const restored = JSON.parse(fs.readFileSync(checkpoint, 'utf8'));
        assert.equal(restored.format, state.format, 'Refusing to overwrite an unrelated checkpoint');
        assert.deepEqual(restored.configuration, configuration, 'Checkpoint code/configuration changed; use a new checkpoint path');
        state = restored;
    }
    const runtimes = Object.fromEntries(CATEGORIES.map(type => [type, createOfflineVisualRuntime(() => state.categories[type].visuals)]));
    const seen = Object.fromEntries(CATEGORIES.map(type => [type, {
        copies: new Set(state.categories[type].copies.map(copy => copy.groupId)),
        visuals: new Set(state.categories[type].visuals.map(visual => visual.visualGroupId))
    }]));
    assert.equal(Object.values(state.categories).reduce((n, group) => n + group.copies.length, 0), state.completed);
    for (const type of CATEGORIES) {
        const group = state.categories[type];
        assert.equal(seen[type].copies.size, group.copies.length);
        assert.equal(seen[type].visuals.size, group.visuals.length);
        assert.equal(group.visuals.length, group.copies.length * 2);
    }
    const started = performance.now();
    let measuredAt = started;
    let newAssignments = 0;
    let interrupted = false;
    const stop = () => { interrupted = true; };
    process.once('SIGINT', stop);
    const save = () => {
        const now = performance.now();
        state.elapsedMs += now - measuredAt;
        measuredAt = now;
        state.peakRssBytes = Math.max(state.peakRssBytes, process.memoryUsage().rss);
        if (checkpoint) {
            fs.mkdirSync(path.dirname(path.resolve(checkpoint)), { recursive: true });
            const temporary = `${checkpoint}.${process.pid}.tmp`;
            fs.writeFileSync(temporary, JSON.stringify(state), { mode: 0o600 });
            fs.renameSync(temporary, checkpoint);
        }
    };
    try {
        log(`[diversity] ${scenario}: resume ${state.completed}/${profiles}; AI calls=0`);
        while (state.completed < profiles && newAssignments < stopAfter && !interrupted) {
            if (state.completed % 10 === 0) await yieldToEventLoop();
            if (interrupted) break;
            const type = scenario === 'balanced' ? CATEGORIES[state.completed % 3] : scenario;
            const group = state.categories[type];
            const sequence = group.copies.length;
            const runtime = runtimes[type];
            const sourceText = sequence % 3 === 0 ? '차분하고 따뜻하게 상담합니다.' : '직장과 관계 상담을 전문으로 합니다. 12년 경력으로 질문을 정리해 설명합니다.';
            const copy = selectProfileCopyVariant({ templateType: type, sourceText, identity: 'same-consultant', generationSequence: sequence, recent: group.copies });
            assert.ok(!seen[type].copies.has(copy.groupId), `${type}: duplicate copy ${sequence}`);
            assert.ok(!group.copies.slice(0, 3).some(previous => previous.openingIndex === copy.openingIndex));
            const fixedDeck = type === 'tarot-ppt' && sequence % 2 === 0;
            const tarotCardType = fixedDeck ? Object.keys(runtime.TAROT_CARD_TYPES).find(key => runtime.TAROT_CARD_TYPES[key].subjectId) : 'auto';
            const payload = { templateType: type, visualIdentity: 'same', visualNonce: `scale-${sequence}`, copyVariant: copy, tarotCardType };
            runtime.assignNovelVisualVariant(payload);
            // Recompute from serialized payload exactly as persisted execution does.
            const pair = runtime.getVisualPair(JSON.parse(JSON.stringify(payload)));
            assert.notEqual(pair.portrait.scene.baseVenueId, pair.mood.scene.baseVenueId);
            assert.notEqual(pair.portrait.scene.family, pair.mood.scene.family);
            const entries = ['portrait', 'mood'].map(kind => {
                assert.ok(runtime.isSubjectCompatibleWithScene(pair[kind].subject, pair[kind].scene));
                if (fixedDeck) assert.equal(pair[kind].subject.id, runtime.TAROT_CARD_TYPES[tarotCardType].subjectId);
                const entry = runtime.toVisualHistoryEntry(kind, pair[kind]);
                assert.ok(!seen[type].visuals.has(entry.visualGroupId), `${type}: duplicate image ${sequence}`);
                seen[type].visuals.add(entry.visualGroupId);
                group.directions[entry.photographicDirectionId] = (group.directions[entry.photographicDirectionId] || 0) + 1;
                group.scenes[entry.sceneId] = (group.scenes[entry.sceneId] || 0) + 1;
                return entry;
            });
            if (entries[0].photographicDirectionId === entries[1].photographicDirectionId) group.sameDirection += 1;
            seen[type].copies.add(copy.groupId);
            // Evidence text is not needed in assignment history/checkpoints.
            const { sourceFocus, ...assignment } = copy;
            group.copies.unshift({ ...assignment, sourceFocus: { limited: sourceFocus.limited } });
            group.visuals.unshift(...entries);
            state.completed += 1;
            newAssignments += 1;
            if (state.completed % 1000 === 0) { save(); log(`[diversity] ${scenario}: ${state.completed}/${profiles}, elapsed=${Math.round(state.elapsedMs / 1000)}s`); }
        }
    } finally {
        save();
        process.removeListener('SIGINT', stop);
    }
    const categories = Object.fromEntries(CATEGORIES.map(type => {
        const group = state.categories[type];
        if (group.copies.length >= 100) {
            assert.ok(group.sameDirection / group.copies.length <= 0.1, `${type}: same-direction rate`);
            assert.ok(Object.keys(group.directions).length >= 3);
            assert.ok(Math.max(...Object.values(group.directions)) / group.visuals.length < 0.6, `${type}: direction imbalance`);
        }
        return [type, { profiles: group.copies.length, uniqueCopyGroups: seen[type].copies.size, uniqueImageGroups: seen[type].visuals.size,
            usedScenes: Object.keys(group.scenes).length, samePairDirection: group.sameDirection, directions: group.directions }];
    }));
    const report = { mode: 'offline-assignment-not-generated-content', configuration, complete: state.completed === profiles,
        profiles: state.completed, imagesAssigned: state.completed * 2, externalAiCalls: 0, elapsedMs: Math.round(state.elapsedMs), peakRssBytes: state.peakRssBytes, categories };
    if (checkpoint) fs.writeFileSync(`${checkpoint}.report.json`, JSON.stringify(report, null, 2));
    return report;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    const args = process.argv.slice(2);
    const options = {};
    for (let i = 0; i < args.length; i += 2) {
        const key = { '--profiles': 'profiles', '--scenario': 'scenario', '--checkpoint': 'checkpoint', '--stop-after': 'stopAfter' }[args[i]];
        if (!key || !args[i + 1]) throw new Error('Usage: --profiles N --scenario balanced|tarot-ppt|saju-ppt|sinjeom-ppt --checkpoint PATH [--stop-after N]');
        options[key] = ['profiles', 'stopAfter'].includes(key) ? Number(args[i + 1]) : args[i + 1];
    }
    const report = await runAssignmentBenchmark(options);
    console.log(JSON.stringify(report, null, 2));
    if (!report.complete) process.exitCode = 2;
}
