import assert from 'node:assert/strict';
import test from 'node:test';
import sharp from 'sharp';
import { createImageSimilaritySignature, compareImageSignatures, createProfileImageSignatures } from './profile-image-similarity.mjs';

function pixels(reverse = false) {
    const data = Buffer.alloc(90 * 80 * 3);
    for (let y = 0; y < 80; y += 1) for (let x = 0; x < 90; x += 1) {
        const i = (y * 90 + x) * 3;
        data[i] = reverse ? 240 - x * 2 : 30 + x * 2;
        data[i + 1] = 30 + y * 2;
        data[i + 2] = reverse ? 220 : 60;
    }
    return sharp(data, { raw: { width: 90, height: 80, channels: 3 } });
}

test('pixel comparison detects re-encoded copies and distinguishes different layout/color without AI', async () => {
    const png = await pixels().png().toBuffer();
    const jpeg = await pixels().resize(180, 160).jpeg({ quality: 90 }).toBuffer();
    const other = await pixels(true).png().toBuffer();
    const sign = (buffer, format) => createImageSimilaritySignature(`data:image/${format};base64,${buffer.toString('base64')}`);
    const a = await sign(png, 'png');
    const b = await sign(jpeg, 'jpeg');
    const c = await sign(other, 'png');
    assert.ok(a && b && c);
    assert.equal(compareImageSignatures(a, a), 1);
    assert.ok(compareImageSignatures(a, b) >= 0.94);
    assert.equal(compareImageSignatures(a, c), 0);
});

test('missing, remote, corrupt and low-information images are not reported as perceptual matches', async () => {
    assert.equal(await createImageSimilaritySignature('https://example.com/image.png'), null);
    assert.equal(await createImageSimilaritySignature('data:image/png;base64,YmFk'), null);
    const flat = await sharp({ create: { width: 16, height: 16, channels: 3, background: '#fff' } }).png().toBuffer();
    const signature = await createImageSimilaritySignature(`data:image/png;base64,${flat.toString('base64')}`);
    assert.equal(compareImageSignatures(signature, { ...signature, exactHash: 'different' }), 0);
    const profile = { profileImage: 'data:image/png;base64,YmFk', moodImage: '' };
    assert.deepEqual(await createProfileImageSignatures(profile), { portrait: null });
    assert.equal(profile.profileImage, 'data:image/png;base64,YmFk');
});
