import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

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

function hash(value) {
    return crypto.createHash('sha256').update(String(value || '')).digest('hex');
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
        shingles.add(hash(normalized.slice(index, index + size)).slice(0, 16));
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

function normalizeVisual(kind, guide = {}) {
    return {
        kind,
        visualGroupId: String(guide.visualGroupId || ''),
        subjectId: String(guide.subjectId || ''),
        sceneFamily: String(guide.sceneFamily || ''),
        sceneId: String(guide.sceneId || ''),
        venueId: String(guide.venueId || ''),
        paletteId: String(guide.paletteId || ''),
        realizationId: String(guide.realizationId || ''),
        locationId: String(guide.locationId || ''),
        physicalPlaceId: String(guide.physicalPlaceId || ''),
        placementId: String(guide.placementId || ''),
        lightingId: String(guide.lightingId || ''),
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
        copyVariant: payload.copyVariant || null,
        visuals,
        profileSignature: profile ? createProfileSimilaritySignature(profile) : null,
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
        this.load();
        this.importAvailableJobs();
    }

    load() {
        try {
            const parsed = JSON.parse(fs.readFileSync(this.filePath, 'utf8'));
            for (const record of parsed.records || []) {
                if (record?.id) this.records.set(record.id, record);
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
        for (const campaignEntry of fs.readdirSync(this.sourceJobDirectory, { withFileTypes: true })) {
            if (!campaignEntry.isDirectory() || campaignEntry.name.startsWith('.')) continue;
            const campaignDirectory = path.join(this.sourceJobDirectory, campaignEntry.name);
            for (const entry of fs.readdirSync(campaignDirectory, { withFileTypes: true })) {
                if (!entry.isFile() || !/^[a-f0-9]{32}\.json$/.test(entry.name)) continue;
                try {
                    const job = JSON.parse(fs.readFileSync(path.join(campaignDirectory, entry.name), 'utf8'));
                    const record = recordFromJob(job);
                    if (!record) continue;
                    const existing = this.records.get(record.id);
                    if (!existing) {
                        this.records.set(record.id, record);
                        imported += 1;
                        continue;
                    }
                    if (existing.profileSignature || !record.profileSignature) continue;
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
        if (imported) this.write();
        return imported;
    }

    getCopyAssignments(templateType) {
        return [...this.records.values()]
            .filter((record) => record.templateType === templateType && record.copyVariant)
            .sort((left, right) => Date.parse(right.createdAt || '') - Date.parse(left.createdAt || ''))
            .map((record) => record.copyVariant);
    }

    getVisualAssignments(templateType) {
        return [...this.records.values()]
            .filter((record) => record.templateType === templateType)
            .flatMap((record) => record.visuals || []);
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
            copyVariant: copyVariant || existing.copyVariant || null,
            visuals: visuals.map((visual) => normalizeVisual(visual.kind, visual)),
            source: existing.source || 'reservation'
        });
        this.write();
        return this.records.get(id);
    }

    complete(id, { profile, imageGuide = null } = {}) {
        const record = this.records.get(id);
        if (!record) return { similarityScore: 0, matchedRecordId: '', needsReview: false };
        const profileSignature = profile ? createProfileSimilaritySignature(profile) : null;
        let best = { score: 0, recordId: '' };
        if (profileSignature) {
            for (const candidate of this.records.values()) {
                if (candidate.id === id || candidate.templateType !== record.templateType || !candidate.profileSignature) continue;
                const score = calculateProfileSimilarity(profileSignature, candidate.profileSignature);
                if (score > best.score) best = { score, recordId: candidate.id };
            }
        }
        record.profileSignature = profileSignature || record.profileSignature || null;
        if (imageGuide) {
            record.visuals = ['portrait', 'mood']
                .filter((kind) => imageGuide[kind])
                .map((kind) => normalizeVisual(kind, imageGuide[kind]));
        }
        record.updatedAt = new Date().toISOString();
        record.source = 'completed';
        this.records.set(id, record);
        this.write();
        const similarityScore = Number(best.score.toFixed(4));
        return {
            similarityScore,
            matchedRecordId: best.recordId,
            needsReview: similarityScore >= this.similarityThreshold
        };
    }

    count() {
        return this.records.size;
    }
}
