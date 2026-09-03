import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const directory = path.dirname(fileURLToPath(import.meta.url));
const serverSource = fs.readFileSync(path.join(directory, 'server.mjs'), 'utf8');
const historySource = fs.readFileSync(path.join(directory, 'profile-generation-history.mjs'), 'utf8');
const visualEngineSource = fs.readFileSync(path.join(directory, 'profile-visual-engine.mjs'), 'utf8');

test('sinjeom offers broad lantern, prayer, Buddha, candle, and ritual motif families', () => {
    for (const subjectId of [
        'hanging-lotus-lantern',
        'lantern-canopy',
        'single-prayer-candle',
        'three-votive-candles',
        'small-stone-buddha',
        'small-brass-buddha',
        'wooden-moktak',
        'empty-prayer-cushion',
        'lotus-offering',
        'ceramic-water-offering',
        'wrapped-prayer-book',
        'unlit-incense-holder'
    ]) {
        assert.match(serverSource, new RegExp(`id: '${subjectId}'`));
    }
    assert.match(serverSource, /motifFamilyId: 'lantern'/);
    assert.match(serverSource, /motifFamilyId: 'candle'/);
    assert.match(serverSource, /motifFamilyId: 'buddha'/);
    assert.match(serverSource, /motifFamilyId: 'prayer'/);
});

test('themed sinjeom scenes declare compatible motifs and safe candle constraints', () => {
    for (const sceneId of [
        'sinjeom-lantern-eaves-row',
        'sinjeom-lantern-hall-ceiling',
        'sinjeom-single-candle-stone-ledge',
        'sinjeom-votive-candle-niche',
        'sinjeom-stone-buddha-garden',
        'sinjeom-brass-buddha-alcove',
        'sinjeom-empty-cushion-prayer-room',
        'sinjeom-moktak-prayer-mat',
        'sinjeom-lotus-water-offering'
    ]) {
        assert.match(serverSource, new RegExp(`createSceneArchetype\\('${sceneId}'`));
    }
    assert.match(serverSource, /A small steady candle flame is allowed only when the assigned hero subject belongs to the candle motif family/);
    assert.match(serverSource, /Show exactly one small controlled flame, no smoke/);
    assert.match(serverSource, /motifFamilies: \['candle'\]/);
    assert.match(serverSource, /function isSubjectCompatibleWithScene\([\s\S]*?scene\.motifFamilies/);
    assert.match(serverSource, /compatibleMotifFamilies/);
});

test('sinjeom motif rotation uses recent history and migrates legacy subject IDs', () => {
    assert.match(serverSource, /motifFamilyId: 500/);
    assert.match(serverSource, /previousVisuals\.slice\(0, 8\)/);
    assert.match(serverSource, /recentMotifFamilies\.has\(entry\.motifFamilyId\)/);
    assert.match(serverSource, /getSubjectMotifFamily\(pair\.portrait\.subject\) !== getSubjectMotifFamily\(pair\.mood\.subject\)/);
    assert.match(historySource, /'paper-lotus-lantern': 'lantern'/);
    assert.match(historySource, /motifFamilyId: String\(guide\.motifFamilyId \|\| LEGACY_VISUAL_MOTIF_FAMILIES\[subjectId\]/);
    assert.match(visualEngineSource, /profile-visual-v10-sinjeom-motif-rotation/);
});
