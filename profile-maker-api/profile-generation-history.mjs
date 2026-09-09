import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { compareImageSignatures } from './profile-image-similarity.mjs';

const PROFILE_TEXT_FIELDS = [
    'eyebrow',
    'headline',
    'intro',
    'sectionTitle',
    'sectionBody',
    'bulletPoints',
    'cardTitle',
    'cardBody',
    'closingTitle',
    'closingBody'
];

// Repeated four-character shingles across profiles share their digest. Bounded memory.
const shingleHashes = new Map();
function shingleHash(value) {
    let result = shingleHashes.get(value);
    if (!result) {
        result = hash(value).slice(0, 16);
        if (shingleHashes.size >= 32768) shingleHashes.delete(shingleHashes.keys().next().value);
        shingleHashes.set(value, result);
    }
    return result;
}

const LEGACY_VISUAL_MOTIF_FAMILIES = {
    'ritual-fan': 'fan',
    'brass-bell': 'bell',
    'paper-lotus-lantern': 'lantern',
    'five-color-cloth': 'cloth',
    'small-hand-drum': 'drum',
    'brass-mirror': 'mirror',
    'wooden-tray': 'tray',
    'brass-bowl': 'bowl',
    'traditional-knot': 'knot',
    'folded-hanji': 'hanji',
    'wooden-clappers': 'clappers',
    'prayer-beads': 'beads'
};

function hash(value) {
    return crypto.createHash('sha256').update(String(value || '')).digest('hex');
}

function historyCopyVariant(variant) {
    if (!variant?.sourceFocus) return variant || null;
    const { sourceFocus, ...assignment } = variant;
    return { ...assignment, sourceFocus: { limited: Boolean(sourceFocus.limited) } };
}

function normalizeProfileText(profile) {
    return PROFILE_TEXT_FIELDS
        .flatMap((field) => Array.isArray(profile?.[field]) ? profile[field] : [profile?.[field]])
        .map((value) => String(value || '').normalize('NFKC').toLowerCase())
        .join(' ')
        .replace(/[^0-9a-z가-힣]+/g, '')
        .trim();
}

export function createProfileSimilaritySignature(profile, shingleSize = 4) {
    const normalized = normalizeProfileText(profile);
    const shingles = new Set();
    const size = Math.max(Number(shingleSize) || 4, 2);
    for (let index = 0; index <= normalized.length - size; index += 1) {
        shingles.add(shingleHash(normalized.slice(index, index + size)));
    }
    return {
        exactHash: hash(normalized),
        length: normalized.length,
        shingles: [...shingles].sort().slice(0, 512)
    };
}

export function calculateProfileSimilarity(left, right) {
    if (!left?.shingles?.length || !right?.shingles?.length) return 0;
    if (left.exactHash && left.exactHash === right.exactHash) return 1;
    const leftSet = new Set(left.shingles);
    const rightSet = new Set(right.shingles);
    let intersection = 0;
    for (const item of leftSet) {
        if (rightSet.has(item)) intersection += 1;
    }
    const union = leftSet.size + rightSet.size - intersection;
    return union ? intersection / union : 0;
}

export function createProfileFieldSignatures(profile) {
    return Object.fromEntries(['headline', 'intro', 'sectionBody', 'cardBody', 'closingBody']
        .map((field) => [field, createProfileSimilaritySignature({ [field]: profile?.[field] || '' })])
        .filter(([, signature]) => signature.length >= 12));
}

function normalizeVisual(kind, guide = {}) {
    const subjectId = String(guide.subjectId || '');
    return {
        kind,
        visualGroupId: String(guide.visualGroupId || ''),
        subjectId,
        motifFamilyId: String(guide.motifFamilyId || LEGACY_VISUAL_MOTIF_FAMILIES[subjectId] || subjectId),
        sceneFamily: String(guide.sceneFamily || ''),
        shootType: String(guide.shootType || ''),
        shootingGroup: String(guide.shootingGroup || ''),
        cardLayout: String(guide.cardLayout || ''),
        packLayoutId: String(guide.packLayoutId || ''),
        packStructureId: String(guide.packStructureId || ''),
        packDesignId: String(guide.packDesignId || ''),
        tableShape: String(guide.tableShape || ''),
        clothColor: String(guide.clothColor || ''),
        tarotDiversityPolicyVersion: String(guide.tarotDiversityPolicyVersion || ''),
        accessoryId: String(guide.accessoryId || ''),
        accessoryFamily: String(guide.accessoryFamily || ''),
        distance: String(guide.distance || ''),
        support: String(guide.support || ''),
        background: String(guide.background || ''),
        cameraHeight: String(guide.cameraHeight || ''),
        sceneId: String(guide.sceneId || ''),
        venueId: String(guide.venueId || ''),
        paletteId: String(guide.paletteId || ''),
        photographicDirectionId: String(guide.photographicDirectionId || ''),
        exposureId: String(guide.exposureId || ''),
        toneId: String(guide.toneId || ''),
        realizationId: String(guide.realizationId || ''),
        locationId: String(guide.locationId || ''),
        physicalPlaceId: String(guide.physicalPlaceId || ''),
        placementId: String(guide.placementId || ''),
        lightingId: String(guide.lightingId || ''),
        surfaceId: String(guide.surfaceId || ''),
        editorialPolicy: String(guide.editorialPolicy || ''),
        focusId: String(guide.focusId || ''),
        depthId: String(guide.depthId || ''),
        promptHash: guide.prompt ? hash(guide.prompt) : String(guide.promptHash || '')
    };
}

function recordFromJob(job) {
    const payload = job?.input?.payload;
    if (!job?.id || !payload?.templateType) return null;
    const imageGuide = job?.result?.imageGuide || {};
    const visuals = ['portrait', 'mood']
        .filter((kind) => imageGuide[kind])
        .map((kind) => normalizeVisual(kind, imageGuide[kind]));
    const profile = job?.result?.profile;
    return {
        id: `${job.campaignId || 'legacy'}:${job.id}`,
        campaignId: String(job.campaignId || 'legacy'),
        jobId: String(job.id),
        templateType: String(payload.templateType),
        createdAt: String(job.createdAt || ''),
        updatedAt: String(job.completedAt || job.updatedAt || ''),
        copyVariant: historyCopyVariant(payload.copyVariant),
        visuals,
        profileSignature: profile ? createProfileSimilaritySignature(profile) : null,
        fieldSignatures: profile ? createProfileFieldSignatures(profile) : {},
        source: 'job-import'
    };
}

export class FileProfileGenerationHistory {
    constructor({ filePath, sourceJobDirectory = '', similarityThreshold = 0.55 }) {
        this.filePath = path.resolve(filePath);
        this.sourceJobDirectory = sourceJobDirectory ? path.resolve(sourceJobDirectory) : '';
        this.similarityThreshold = similarityThreshold;
        fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
        this.records = new Map();
        this.assignmentCache = new Map();
        this.load();
        this.importAvailableJobs();
    }

    load() {
        try {
            const parsed = JSON.parse(fs.readFileSync(this.filePath, 'utf8'));
            for (const record of parsed.records || []) {
                if (record?.id) {
                    this.records.set(record.id, {
                        ...record,
                        copyVariant: historyCopyVariant(record.copyVariant),
                        visuals: (record.visuals || []).map((visual) => normalizeVisual(visual.kind, visual))
                    });
                }
            }
        } catch (error) {
            if (error?.code !== 'ENOENT') throw error;
        }
    }

    write() {
        const temporaryPath = `${this.filePath}.${process.pid}.${crypto.randomUUID()}.tmp`;
        const document = { version: 1, records: [...this.records.values()] };
        fs.writeFileSync(temporaryPath, JSON.stringify(document), { encoding: 'utf8', mode: 0o600 });
        fs.renameSync(temporaryPath, this.filePath);
    }

    importAvailableJobs() {
        if (!this.sourceJobDirectory || !fs.existsSync(this.sourceJobDirectory)) return 0;
        let imported = 0;
        let scanned = 0;
        let skipped = 0;
        const started = Date.now();
        // Resolve sanitized directory names from stored campaign IDs before reading image-heavy JSON.
        const readyPaths = new Set([...this.records.values()]
            .filter(record => record.jobId && record.profileSignature && record.fieldSignatures)
            .map(record => String(record.campaignId).replace(/[^a-zA-Z0-9._-]/g, '_') + '/' + record.jobId + '.json'));
        console.log('[generation-history] import started');
        for (const campaignEntry of fs.readdirSync(this.sourceJobDirectory, { withFileTypes: true })) {
            if (!campaignEntry.isDirectory() || campaignEntry.name.startsWith('.')) continue;
            const campaignDirectory = path.join(this.sourceJobDirectory, campaignEntry.name);
            for (const entry of fs.readdirSync(campaignDirectory, { withFileTypes: true })) {
                if (!entry.isFile() || !/^[a-f0-9]{32}\.json$/.test(entry.name)) continue;
                scanned += 1;
                if (readyPaths.has(campaignEntry.name + '/' + entry.name)) { skipped += 1; continue; }
                if (scanned % 100 === 0) console.log('[generation-history] scanned=' + scanned + ' imported=' + imported + ' skipped=' + skipped);
                try {
                    const job = JSON.parse(fs.readFileSync(path.join(campaignDirectory, entry.name), 'utf8'));
                    const known = this.records.get(`${job.campaignId || 'legacy'}:${job.id}`);
                    if (known?.profileSignature && known.fieldSignatures) continue;
                    const record = recordFromJob(job);
                    if (!record) continue;
                    const existing = this.records.get(record.id);
                    if (!existing) {
                        this.records.set(record.id, record);
                        imported += 1;
                        continue;
                    }
                    if ((existing.profileSignature && existing.fieldSignatures) || !record.profileSignature) continue;
                    this.records.set(record.id, {
                        ...existing,
                        ...record,
                        copyVariant: record.copyVariant || existing?.copyVariant || null,
                        visuals: record.visuals.length ? record.visuals : (existing?.visuals || [])
                    });
                    imported += 1;
                } catch (error) {
                    console.warn(`[generation-history] skipped unreadable job ${entry.name}:`, error?.message || error);
                }
            }
        }
        if (imported) { this.assignmentCache.clear(); this.write(); }
        console.log('[generation-history] import complete scanned=' + scanned + ' imported=' + imported + ' skipped=' + skipped + ' durationMs=' + (Date.now() - started));
        return imported;
    }

    getAssignmentCache(templateType) {
        let cached = this.assignmentCache.get(templateType);
        if (!cached) {
            const records = [...this.records.values()]
                .filter(record => record.templateType === templateType)
                .sort((left, right) => Date.parse(right.createdAt || '') - Date.parse(left.createdAt || ''));
            cached = { copies: records.filter(record => record.copyVariant).map(record => record.copyVariant),
                visuals: records.flatMap(record => record.visuals || []), newest: records[0]?.createdAt || '' };
            this.assignmentCache.set(templateType, cached);
        }
        return cached;
    }

    getCopyAssignments(templateType) {
        return this.getAssignmentCache(templateType).copies;
    }

    getVisualAssignments(templateType) {
        return this.getAssignmentCache(templateType).visuals;
    }

    reserve({ id, campaignId, jobId = '', templateType, copyVariant, visuals = [], createdAt = new Date().toISOString() }) {
        const existing = this.records.get(id) || {};
        this.records.set(id, {
            ...existing,
            id,
            campaignId,
            jobId,
            templateType,
            createdAt: existing.createdAt || createdAt,
            updatedAt: new Date().toISOString(),
            copyVariant: historyCopyVariant(copyVariant || existing.copyVariant),
            visuals: visuals.map((visual) => normalizeVisual(visual.kind, visual)),
            source: existing.source || 'reservation'
        });
        const cached = this.assignmentCache.get(templateType);
        const record = this.records.get(id);
        if (cached && !existing.id && (!cached.newest || Date.parse(createdAt) > Date.parse(cached.newest))) {
            if (record.copyVariant) cached.copies.unshift(record.copyVariant);
            cached.visuals.unshift(...record.visuals);
            cached.newest = createdAt;
        } else {
            this.assignmentCache.delete(templateType);
        }
        if (existing.templateType && existing.templateType !== templateType) this.assignmentCache.delete(existing.templateType);
        this.write();
        return record;
    }

    complete(id, { profile, imageGuide = null, imageSignatures = {} } = {}) {
        const record = this.records.get(id);
        if (!record) return { similarityScore: 0, matchedRecordId: '', needsReview: false };
        const profileSignature = profile ? createProfileSimilaritySignature(profile) : null;
        const fieldSignatures = profile ? createProfileFieldSignatures(profile) : {};
        const fieldMatches = {};
        const imageMatches = {};
        let comparedImages = 0;
        let best = { score: 0, recordId: '' };
        if (profileSignature) {
            for (const candidate of this.records.values()) {
                if (candidate.id === id || candidate.templateType !== record.templateType || !candidate.profileSignature) continue;
                const score = calculateProfileSimilarity(profileSignature, candidate.profileSignature);
                if (score > best.score) best = { score, recordId: candidate.id };
                for (const [field, signature] of Object.entries(fieldSignatures)) {
                    const fieldScore = calculateProfileSimilarity(signature, candidate.fieldSignatures?.[field]);
                    if (fieldScore >= 0.8 && fieldScore > (fieldMatches[field]?.score || 0)) {
                        fieldMatches[field] = { score: Number(fieldScore.toFixed(4)), recordId: candidate.id };
                    }
                }
            }
        }
        for (const [kind, signature] of Object.entries(imageSignatures)) {
            if (!signature) continue;
            for (const candidate of this.records.values()) {
                if (candidate.id === id || candidate.templateType !== record.templateType) continue;
                for (const [matchedKind, previous] of Object.entries(candidate.imageSignatures || {})) {
                    if (!previous) continue;
                    comparedImages += 1;
                    const score = compareImageSignatures(signature, previous);
                    if (score >= 0.94 && score > (imageMatches[kind]?.score || 0)) imageMatches[kind] = { score, recordId: candidate.id, kind: matchedKind };
                }
            }
        }
        if (imageSignatures.portrait && imageSignatures.mood) {
            const score = compareImageSignatures(imageSignatures.portrait, imageSignatures.mood);
            if (score >= 0.94) imageMatches.pair = { score, recordId: id, kind: 'portrait/mood' };
        }
        record.profileSignature = profileSignature || record.profileSignature || null;
        if (profile) record.fieldSignatures = fieldSignatures;
        record.imageSignatures = { ...record.imageSignatures, ...imageSignatures };
        if (imageGuide) {
            const previousVisuals = record.visuals;
            record.visuals = ['portrait', 'mood']
                .filter((kind) => imageGuide[kind])
                .map((kind) => normalizeVisual(kind, imageGuide[kind]));
            const assignmentOnly = visuals => JSON.stringify(visuals.map(({ promptHash, ...assignment }) => assignment));
            if (assignmentOnly(record.visuals) !== assignmentOnly(previousVisuals)) {
                this.assignmentCache.delete(record.templateType);
            } else {
                // Prompt hash is not an allocation dimension. Keep cached assignment references stable.
                record.visuals.forEach((visual, index) => Object.assign(previousVisuals[index], visual));
                record.visuals = previousVisuals;
            }
        }
        record.updatedAt = new Date().toISOString();
        record.source = 'completed';
        this.records.set(id, record);
        this.write();
        const similarityScore = Number(best.score.toFixed(4));
        return {
            similarityScore,
            matchedRecordId: best.recordId,
            fieldMatches,
            imageMatches,
            imageComparison: { comparedImages, assessed: Object.values(imageSignatures).filter(Boolean).length, unassessed: Object.values(imageSignatures).filter((value) => !value).length },
            needsReview: similarityScore >= this.similarityThreshold || Object.keys(fieldMatches).length > 0 || Object.keys(imageMatches).length > 0
        };
    }

    count() {
        return this.records.size;
    }
}
