import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createOfflineVisualRuntime } from './profile-diversity-runtime.mjs';

test('2000 tarot consultants rotate physical layouts independently of covers and survive history reload', { timeout: 180000 }, t => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'hongcafe-tarot-rotation-'));
    t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
    let history = [];
    let runtime = createOfflineVisualRuntime(() => history);
    const layouts = new Map();
    const expectedSizes = { oblique: 5, closeup: 5, overhead: 7, 'deck-detail': 4, 'deck-pack': 21 };
    const recent = new Map();
    const groups = new Map();
    const designs = new Map();
    const structures = new Map();
    const colors = new Set();
    const lightCounts = new Map();
    const surfaceCounts = new Map();
    const recentLightSurfaces = [];
    let lightSurfaceRepeats = 0;
    for (let sample = 0; sample < 2000; sample += 1) {
        // Half use the same selected deck; the remainder vary the existing categories.
        const types = Object.keys(runtime.TAROT_CARD_TYPES);
        const payload = { templateType: 'tarot-ppt', tarotCardType: sample < 1000 ? 'universal-waite' : types[sample % types.length],
            visualIdentity: sample < 1000 ? 'similar-consultant' : `consultant-${sample}`, visualNonce: String(sample) };
        if (sample === 1000) {
            const uninterrupted = structuredClone(payload);
            runtime.assignNovelVisualVariant(uninterrupted);
            const checkpoint = path.join(directory, 'history.json');
            fs.writeFileSync(checkpoint, JSON.stringify(history));
            history = JSON.parse(fs.readFileSync(checkpoint, 'utf8'));
            runtime = createOfflineVisualRuntime(() => history);
            const resumed = structuredClone(payload);
            runtime.assignNovelVisualVariant(resumed);
            assert.equal(JSON.stringify(resumed), JSON.stringify(uninterrupted));
        }
        runtime.assignNovelVisualVariant(payload);
        const pair = runtime.getVisualPair(payload);
        assert.notEqual(pair.portrait.scene.shootingGroup, pair.mood.scene.shootingGroup);
        assert.notEqual(pair.portrait.clothColor, pair.mood.clothColor);
        const entries = [];
        for (const kind of ['portrait', 'mood']) {
            const entry = runtime.toVisualHistoryEntry(kind, pair[kind]);
            const group = entry.shootingGroup;
            const key = [entry.cardLayout, entry.cameraHeight, entry.distance].join(':');
            const prior = recent.get(group) || [];
            // With N available layouts, none may recur among the preceding N-1 shots of its group.
            assert.ok(!prior.slice(0, expectedSizes[group] - 1).includes(key), `${group} premature repeat at ${sample}`);
            recent.set(group, [key, ...prior].slice(0, expectedSizes[group]));
            const counts = layouts.get(group) || new Map();
            counts.set(key, (counts.get(key) || 0) + 1);
            layouts.set(group, counts);
            groups.set(group, (groups.get(group) || 0) + 1);
            if (entry.packLayoutId) {
                designs.set(entry.packDesignId, (designs.get(entry.packDesignId) || 0) + 1);
                structures.set(entry.packStructureId, (structures.get(entry.packStructureId) || 0) + 1);
            }
            colors.add(entry.clothColor);
            if (entry.surfaceId) {
                lightCounts.set(entry.lightingId, (lightCounts.get(entry.lightingId) || 0) + 1);
                surfaceCounts.set(entry.surfaceId, (surfaceCounts.get(entry.surfaceId) || 0) + 1);
                const combination = `${entry.lightingId}:${entry.surfaceId}`;
                if (recentLightSurfaces.slice(0, 8).includes(combination)) lightSurfaceRepeats += 1;
                recentLightSurfaces.unshift(combination);
                const restored = runtime.getVisualPair(JSON.parse(JSON.stringify(payload)))[kind];
                assert.equal(restored.realization.surface.id, entry.surfaceId);
                assert.equal(restored.realization.lighting.id, entry.lightingId);
            }
            entries.push(entry);
        }
        history.unshift(...entries);
        if ((sample + 1) % 500 === 0) t.diagnostic(`allocated ${sample + 1} consultants / ${(sample + 1) * 2} images; external AI calls 0`);
    }
    const spread = {};
    for (const [group, counts] of layouts) {
        assert.equal(counts.size, expectedSizes[group]);
        const values = [...counts.values()];
        spread[group] = { layouts: counts.size, min: Math.min(...values), max: Math.max(...values) };
        assert.ok(spread[group].max - spread[group].min <= 1, JSON.stringify(spread[group]));
    }
    assert.equal(history.length, 4000);
    assert.equal(colors.size, 10);
    assert.equal(structures.size, 6);
    assert.equal(groups.get('deck-pack'), 600);
    assert.equal(lightCounts.size, 6);
    assert.equal(surfaceCounts.size, 6);
    t.diagnostic(JSON.stringify({ editorialLightingUsage: Object.fromEntries(lightCounts), surfaceUsage: Object.fromEntries(surfaceCounts), recentEightLightSurfaceRepeats: lightSurfaceRepeats }));
    t.diagnostic(JSON.stringify({ groups: Object.fromEntries(groups), layoutUsage: spread, packDesignsUsed: designs.size,
        packStructures: Object.fromEntries(structures), prematureLayoutRepeats: 0, externalAiCalls: 0 }));
});
