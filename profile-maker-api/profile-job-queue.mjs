export function isAmbiguousExternalFailure(error) {
    const status = Number(error?.status);
    if (error?.externalRequestStarted) return true;
    if ([400, 401, 403, 404, 409, 429].includes(status)) return false;
    return Boolean(!status || status >= 500);
}

export function reuseCompletedProfileImageStages(record, sourceJob) {
    for (const stageName of ['portrait', 'mood']) {
        const sourceStage = sourceJob?.stages?.[stageName];
        const sourceOutput = sourceJob?.outputs?.[stageName];
        if (!record?.stages?.[stageName]) continue;
        if (['running', 'unknown'].includes(sourceStage?.state)) {
            record.stages[stageName] = {
                ...record.stages[stageName],
                state: 'unknown',
                attempts: 0,
                startedAt: null,
                completedAt: sourceStage.completedAt || null,
                error: sourceStage.error || 'A previous external image request requires review.',
                reused: true
            };
            continue;
        }
        if (sourceStage?.state !== 'completed' || !sourceOutput) continue;
        record.stages[stageName] = {
            ...record.stages[stageName],
            state: 'completed',
            attempts: 0,
            startedAt: null,
            completedAt: sourceStage.completedAt || null,
            error: null,
            reused: true
        };
        record.outputs[stageName] = sourceOutput;
    }
    return record;
}

export class DurableProfileJobQueue {
    constructor({ store, execute }) {
        this.store = store;
        this.execute = execute;
        this.pending = [];
        this.pendingIds = new Set();
        this.running = false;
    }

    recover() {
        for (const jobId of this.store.listJobIds()) {
            const job = this.store.read(jobId);
            if (!job) continue;
            const hasRunningStage = Object.values(job.stages || {}).some((stage) => stage.state === 'running');
            if (job.state === 'running' || hasRunningStage) {
                this.store.update(job.id, (record) => {
                    record.state = 'needs_review';
                    record.currentStage = 'needs_review';
                    record.error = 'The server stopped while an external AI request was in progress. Automatic retry is blocked to prevent duplicate billing.';
                    for (const stage of Object.values(record.stages || {})) {
                        if (stage.state === 'running') stage.state = 'unknown';
                    }
                    return record;
                });
                continue;
            }
            if (job.state === 'queued') this.enqueue(job.id);
        }
    }

    enqueue(jobId) {
        const job = this.store.read(jobId);
        if (!job || job.state !== 'queued' || this.pendingIds.has(jobId)) return;
        this.pending.push(jobId);
        this.pendingIds.add(jobId);
        this.drain();
    }

    async drain() {
        if (this.running) return;
        this.running = true;
        try {
            while (this.pending.length) {
                const jobId = this.pending.shift();
                this.pendingIds.delete(jobId);
                const job = this.store.read(jobId);
                if (!job || job.state !== 'queued') continue;

                this.store.update(jobId, (record) => {
                    record.state = 'running';
                    record.currentStage = 'starting';
                    return record;
                });

                try {
                    const result = await this.execute(jobId);
                    this.store.update(jobId, (record) => {
                        const failedStages = Object.values(record.stages || {}).filter((stage) => stage.state === 'failed');
                        const unknownStages = Object.values(record.stages || {}).filter((stage) => stage.state === 'unknown');
                        record.state = unknownStages.length ? 'needs_review' : (failedStages.length ? 'partial' : 'completed');
                        record.currentStage = record.state;
                        record.result = result;
                        record.completedAt = new Date().toISOString();
                        return record;
                    });
                } catch (error) {
                    this.store.update(jobId, (record) => {
                        const hasUnknownStage = Object.values(record.stages || {}).some((stage) => stage.state === 'unknown');
                        record.state = hasUnknownStage ? 'needs_review' : 'failed';
                        record.currentStage = record.state;
                        record.error = error?.expose ? error.message : 'Profile generation failed.';
                        record.completedAt = new Date().toISOString();
                        return record;
                    });
                }
            }
        } finally {
            this.running = false;
        }
    }
}
