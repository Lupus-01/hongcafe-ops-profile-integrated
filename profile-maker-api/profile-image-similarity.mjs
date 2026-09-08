import crypto from 'node:crypto';
import sharp from 'sharp';

// 로컬 픽셀 비교용 보조 지표다. 의미나 예술적 독창성을 판정하지 않는다.
export async function createImageSimilaritySignature(dataUrl) {
    if (!dataUrl) return null;
    const match = /^data:image\/(png|jpeg|webp);base64,([a-z0-9+/=\s]+)$/i.exec(dataUrl);
    if (!match || match[2].length > 24 * 1024 * 1024) return null;
    try {
        const buffer = Buffer.from(match[2], 'base64');
        const pixels = await sharp(buffer, { limitInputPixels: 20000000, animated: false })
            .rotate().flatten({ background: '#ffffff' }).toColourspace('srgb')
            .resize(9, 8, { fit: 'fill' }).removeAlpha().raw().toBuffer();
        if (pixels.length !== 216) return null;
        const light = Array.from({ length: 72 }, (_, i) => pixels[i * 3] * 0.299 + pixels[i * 3 + 1] * 0.587 + pixels[i * 3 + 2] * 0.114);
        let bits = '';
        for (let y = 0; y < 8; y += 1) {
            for (let x = 0; x < 8; x += 1) bits += light[y * 9 + x] > light[y * 9 + x + 1] ? '1' : '0';
        }
        return {
            version: 1,
            exactHash: crypto.createHash('sha256').update(buffer).digest('hex'),
            edges: bits,
            colors: pixels.toString('base64'),
            contrast: Math.max(...light) - Math.min(...light)
        };
    } catch {
        // 검사 실패로 완료된 유료 이미지 생성을 실패 처리하거나 재호출하지 않는다.
        return null;
    }
}

export function compareImageSignatures(left, right) {
    if (left?.version !== 1 || right?.version !== 1) return 0;
    if (left.exactHash && left.exactHash === right.exactHash) return 1;
    if (left.contrast < 12 || right.contrast < 12 || left.edges?.length !== 64 || right.edges?.length !== 64) return 0;
    let matching = 0;
    for (let i = 0; i < 64; i += 1) if (left.edges[i] === right.edges[i]) matching += 1;
    if (matching < 60) return 0;
    const a = Buffer.from(left.colors || '', 'base64');
    const b = Buffer.from(right.colors || '', 'base64');
    if (a.length !== 216 || b.length !== 216) return 0;
    let distance = 0;
    for (let i = 0; i < 216; i += 1) distance += Math.abs(a[i] - b[i]);
    const colorSimilarity = 1 - distance / (216 * 255);
    return colorSimilarity >= 0.94 ? Number(Math.min(matching / 64, colorSimilarity).toFixed(4)) : 0;
}

export async function createProfileImageSignatures(profile) {
    const signatures = {};
    for (const [kind, field] of [['portrait', 'profileImage'], ['mood', 'moodImage']]) {
        if (!profile?.[field]) continue;
        const signature = await createImageSimilaritySignature(profile[field]);
        signatures[kind] = signature;
    }
    return signatures;
}
