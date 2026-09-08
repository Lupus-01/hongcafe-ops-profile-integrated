import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

function usageError(cause) {
    return Object.assign(new Error('사용량 기록을 확인하거나 저장하지 못해 AI 요청을 중단했습니다. 관리자에게 사용량 파일 확인을 요청해주세요.'), {
        status: 503, expose: true, cause
    });
}

function validateUsage(usage) {
    if (!usage || typeof usage !== 'object' || Array.isArray(usage)
        || Object.values(usage).some((count) => !Number.isSafeInteger(count) || count < 0)) {
        throw new Error('Invalid profile usage counters.');
    }
    return usage;
}

export function readProfileUsage(filePath) {
    let content;
    try {
        content = fs.readFileSync(filePath, 'utf8');
    } catch (error) {
        if (error?.code === 'ENOENT') return {};
        throw usageError(error);
    }
    try {
        return validateUsage(JSON.parse(content));
    } catch (error) {
        throw usageError(error);
    }
}

export function writeProfileUsage(filePath, usage) {
    const temporaryPath = `${filePath}.${process.pid}.${crypto.randomUUID()}.tmp`;
    try {
        validateUsage(usage);
        fs.mkdirSync(path.dirname(filePath), { recursive: true });
        fs.writeFileSync(temporaryPath, JSON.stringify(usage, null, 2), { encoding: 'utf8', mode: 0o600 });
        fs.renameSync(temporaryPath, filePath);
    } catch (error) {
        // Never replace a readable ledger with a partial write.
        try { fs.unlinkSync(temporaryPath); } catch {}
        throw usageError(error);
    }
}
