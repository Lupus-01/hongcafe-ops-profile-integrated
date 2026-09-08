import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

function stableValue(value) {
    if (Array.isArray(value)) return value.map(stableValue);
    if (!value || typeof value !== 'object') return value;
    return Object.fromEntries(
        Object.keys(value)
            .sort()
            .map((key) => [key, stableValue(value[key])])
    );
}

export function createProfileJobFingerprint(value) {
    return crypto
        .createHash('sha256')
        .update(JSON.stringify(stableValue(value)))
        .digest('hex');
}

function createHttpError(status, message) {
    const error = new Error(message);
    error.status = status;
    error.expose = true;
    return error;
}

export class FileProfileJobStore {
    constructor({ directory, campaignId, safetyCap = 24000, retentionDays = 45, fingerprintForJob = (job) => job.fingerprint }) {
        this.campaignId = campaignId;
        const safeCampaignDirectory = String(campaignId).replace(/[^a-zA-Z0-9._-]/g, '_');
        this.directory = path.resolve(directory, safeCampaignDirectory);
        this.safetyCap = safetyCap;
        this.retentionMs = retentionDays * 24 * 60 * 60 * 1000;
        fs.mkdirSync(this.directory, { recursive: true });
        fs.mkdirSync(path.join(this.directory, '.requests'), { recursive: true });
        this.copyAssignmentsByTemplate = new Map();
        this.startupJobs = [];
        this.loadStartupJobs(fingerprintForJob);
    }

    getJobId(fingerprint) {
        return crypto
            .createHash('sha256')
            .update(`${this.campaignId}\0${fingerprint}`)
            .digest('hex')
            .slice(0, 32);
    }

    getJobPath(jobId) {
        if (!/^[a-f0-9]{32}$/.test(jobId)) throw createHttpError(400, 'Invalid profile job ID.');
        return path.join(this.directory, `${jobId}.json`);
    }

    getRequestPath(requestKey) {
        const digest = crypto.createHash('sha256').update(requestKey).digest('hex');
        return path.join(this.directory, '.requests', `${digest}.json`);
    }

    writeRequestRecord(requestKey, { jobId, fingerprint, kind }) {
        if (!requestKey) return;
        const targetPath = this.getRequestPath(requestKey);
        const temporaryPath = `${targetPath}.${process.pid}.${crypto.randomUUID()}.tmp`;
        fs.writeFileSync(temporaryPath, JSON.stringify({ jobId, fingerprint, kind }), {
            encoding: 'utf8',
            mode: 0o600
        });
        fs.renameSync(temporaryPath, targetPath);
    }

    validateRequestKey(requestKey, fingerprint, kind, compatibleFingerprints = []) {
        if (!requestKey) return null;
        let record;
        try {
            record = JSON.parse(fs.readFileSync(this.getRequestPath(requestKey), 'utf8'));
        } catch (error) {
            if (error?.code === 'ENOENT') return null;
            throw error;
        }
        if (!record || record.kind !== kind || ![fingerprint, ...compatibleFingerprints].includes(record.fingerprint)) {
            throw createHttpError(409, 'The idempotency key was already used for different profile input.');
        }
        return record;
    }

    assertReusable(job) {
        if (job?.state === 'expired') {
            throw createHttpError(410, '저장된 결과의 보관 기간이 만료되었습니다. 중복 과금을 막기 위해 새 생성은 차단했습니다. 관리자에게 기존 결과 복원 여부를 확인해주세요.');
        }
    }

    read(jobId) {
        try {
            return JSON.parse(fs.readFileSync(this.getJobPath(jobId), 'utf8'));
        } catch (error) {
            if (error?.code === 'ENOENT') return null;
            throw error;
        }
    }

    write(job) {
        const targetPath = this.getJobPath(job.id);
        const temporaryPath = `${targetPath}.${process.pid}.${crypto.randomUUID()}.tmp`;
        fs.writeFileSync(temporaryPath, JSON.stringify(job), { encoding: 'utf8', mode: 0o600 });
        fs.renameSync(temporaryPath, targetPath);
        return job;
    }

    listJobIds() {
        return fs.readdirSync(this.directory, { withFileTypes: true })
            .filter((entry) => entry.isFile() && /^[a-f0-9]{32}\.json$/.test(entry.name))
            .map((entry) => entry.name.slice(0, -5));
    }

    count() {
        return this.listJobIds().length;
    }

    getRecentCopyAssignments(templateType, limit = 10) {
        return (this.copyAssignmentsByTemplate.get(templateType) || [])
            .slice(0, Math.max(Number(limit) || 0, 0))
            .map((assignment) => assignment.copyVariant);
    }

    getCopyAssignmentCount(templateType) {
        return (this.copyAssignmentsByTemplate.get(templateType) || []).length;
    }

    indexCopyAssignment(job) {
        const templateType = job?.input?.payload?.templateType;
        const copyVariant = job?.input?.payload?.copyVariant;
        if (!templateType || !copyVariant) return;
        const assignments = this.copyAssignmentsByTemplate.get(templateType) || [];
        const nextAssignments = [
            { jobId: job.id, createdAt: job.createdAt || '', copyVariant },
            ...assignments.filter((assignment) => assignment.jobId !== job.id)
        ].sort((left, right) => Date.parse(right.createdAt || '') - Date.parse(left.createdAt || ''));
        this.copyAssignmentsByTemplate.set(templateType, nextAssignments);
    }

    rebuildCopyAssignmentIndex() {
        this.copyAssignmentsByTemplate.clear();
        for (const jobId of this.listJobIds()) {
            const job = this.read(jobId);
            if (job) this.indexCopyAssignment(job);
        }
    }

    loadStartupJobs(fingerprintForJob) {
        const cutoff = Date.now() - this.retentionMs;
        for (const jobId of this.listJobIds()) {
            let job = this.read(jobId);
            if (!job) continue;
            const automaticFingerprint = job.automaticFingerprint || fingerprintForJob(job);
            const completedAt = Date.parse(job.completedAt || job.updatedAt || '');
            const hasUncertainStage = Object.values(job.stages || {}).some((stage) => ['running', 'unknown'].includes(stage.state));
            if (Number.isFinite(completedAt) && completedAt < cutoff && !hasUncertainStage && ['completed', 'partial', 'failed'].includes(job.state)) {
                // Keep a compact receipt permanently, even after large result images expire.
                // Replace atomically so a restart can never erase the billing guard.
                job = this.write({
                    id: job.id, campaignId: job.campaignId, fingerprint: job.fingerprint,
                    automaticFingerprint, kind: job.kind, createdAt: job.createdAt,
                    updatedAt: new Date().toISOString(), completedAt: job.completedAt,
                    state: 'expired', currentStage: 'expired', stages: {}, result: null
                });
            }
            this.startupJobs.push({ id: job.id, state: job.state, stages: job.stages, automaticFingerprint });
            const templateType = job.input?.payload?.templateType;
            const copyVariant = job.input?.payload?.copyVariant;
            if (templateType && copyVariant) {
                const assignments = this.copyAssignmentsByTemplate.get(templateType) || [];
                assignments.push({ jobId: job.id, createdAt: job.createdAt || '', copyVariant });
                this.copyAssignmentsByTemplate.set(templateType, assignments);
            }
        }
        for (const assignments of this.copyAssignmentsByTemplate.values()) {
            assignments.sort((left, right) => Date.parse(right.createdAt || '') - Date.parse(left.createdAt || ''));
        }
    }

    createOrGet({ fingerprint, kind, input, userId, requestKey = '', reusableJobId = '', compatibleFingerprints = [], initialState = 'queued' }) {
        const jobId = this.getJobId(fingerprint);
        const requestRecord = this.validateRequestKey(requestKey, fingerprint, kind, compatibleFingerprints);
        const requestJob = requestRecord && this.read(requestRecord.jobId);
        if (requestRecord && !requestJob) {
            throw createHttpError(410, '이 요청의 기존 생성 기록은 있지만 결과 파일이 없습니다. 중복 과금을 막기 위해 새 생성을 차단했습니다. 관리자에게 확인해주세요.');
        }
        const existing = requestJob
            || (reusableJobId && this.read(reusableJobId)) || this.read(jobId);
        if (existing) {
            if (existing.kind !== kind || (existing.id !== reusableJobId
                && ![fingerprint, ...compatibleFingerprints].includes(existing.fingerprint))) {
                throw createHttpError(409, 'The idempotency key conflicts with another profile job.');
            }
            this.assertReusable(existing);
            this.writeRequestRecord(requestKey, { jobId: existing.id, fingerprint, kind });
            return { job: existing, replayed: true };
        }

        if (this.count() >= this.safetyCap) {
            throw createHttpError(429, `Campaign safety cap ${this.safetyCap} has been reached.`);
        }

        const now = new Date().toISOString();
        const job = {
            id: jobId,
            campaignId: this.campaignId,
            fingerprint,
            requestKey,
            kind,
            userId,
            state: initialState,
            currentStage: initialState,
            createdAt: now,
            updatedAt: now,
            completedAt: null,
            stages: {
                text: { state: 'pending', attempts: 0 },
                portrait: { state: input.generateImageRequested ? 'pending' : 'skipped', attempts: 0 },
                mood: { state: input.generateImageRequested ? 'pending' : 'skipped', attempts: 0 }
            },
            input,
            outputs: {},
            result: null,
            error: null
        };
        this.write(job);
        this.indexCopyAssignment(job);
        this.writeRequestRecord(requestKey, { jobId, fingerprint, kind });
        return { job, replayed: false };
    }

    update(jobId, updater) {
        const current = this.read(jobId);
        if (!current) throw createHttpError(404, 'Profile job was not found.');
        const next = updater(structuredClone(current)) || current;
        next.updatedAt = new Date().toISOString();
        return this.write(next);
    }

    toPublicJob(job) {
        if (!job) return null;
        const { input, outputs, userId, fingerprint, automaticFingerprint, requestKey, ...safeJob } = job;
        const payload = input?.payload || {};
        return {
            ...safeJob,
            presentation: {
                templateType: payload.templateType,
                tarotCardType: payload.tarotCardType || '',
                referenceText: payload.referenceText || '',
                imageQuality: payload.imageQuality || 'standard',
                nameHint: payload.name || input?.parsedDocument?.documents?.[0]?.fileName?.replace(/\.[^.]+$/, '') || 'profile-builder'
            }
        };
    }
}
