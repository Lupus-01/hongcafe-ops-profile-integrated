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
    constructor({ directory, campaignId, safetyCap = 1500, retentionDays = 45 }) {
        this.campaignId = campaignId;
        const safeCampaignDirectory = String(campaignId).replace(/[^a-zA-Z0-9._-]/g, '_');
        this.directory = path.resolve(directory, safeCampaignDirectory);
        this.safetyCap = safetyCap;
        this.retentionMs = retentionDays * 24 * 60 * 60 * 1000;
        fs.mkdirSync(this.directory, { recursive: true });
        fs.mkdirSync(path.join(this.directory, '.requests'), { recursive: true });
        this.cleanupExpiredJobs();
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

    cleanupExpiredJobs() {
        const cutoff = Date.now() - this.retentionMs;
        for (const jobId of this.listJobIds()) {
            const job = this.read(jobId);
            if (!job) continue;
            const completedAt = Date.parse(job.completedAt || job.updatedAt || '');
            if (Number.isFinite(completedAt) && completedAt < cutoff && ['completed', 'partial', 'failed'].includes(job.state)) {
                fs.unlinkSync(this.getJobPath(job.id));
            }
        }
    }

    createOrGet({ fingerprint, kind, input, userId, requestKey = '' }) {
        const jobId = this.getJobId(fingerprint);
        if (requestKey) {
            try {
                const requestRecord = JSON.parse(fs.readFileSync(this.getRequestPath(requestKey), 'utf8'));
                if (requestRecord.fingerprint !== fingerprint || requestRecord.kind !== kind) {
                    throw createHttpError(409, 'The idempotency key was already used for different profile input.');
                }
                const requestJob = this.read(requestRecord.jobId);
                if (requestJob) return { job: requestJob, replayed: true };
            } catch (error) {
                if (error?.code !== 'ENOENT') throw error;
            }
        }
        const existing = this.read(jobId);
        if (existing) {
            if (existing.fingerprint !== fingerprint || existing.kind !== kind) {
                throw createHttpError(409, 'The idempotency key conflicts with another profile job.');
            }
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
            state: 'queued',
            currentStage: 'queued',
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
        if (requestKey) {
            fs.writeFileSync(this.getRequestPath(requestKey), JSON.stringify({ jobId, fingerprint, kind }), {
                encoding: 'utf8',
                mode: 0o600
            });
        }
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
        const { input, outputs, userId, fingerprint, requestKey, ...safeJob } = job;
        return safeJob;
    }
}
