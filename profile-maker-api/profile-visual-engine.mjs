import crypto from 'node:crypto';

export const PROFILE_VISUAL_VARIATION_VERSION = 'profile-visual-v10-sinjeom-motif-rotation';

function createOptions(prefix, prompts) {
    return prompts.map((prompt, index) => ({ id: `${prefix}-${index + 1}`, prompt }));
}

const LIGHTING_OPTIONS = createOptions('light', [
    'Use soft morning side light with restrained contrast and natural contact shadows.',
    'Use clear late-morning window light with a neutral white balance and gentle shadow direction.',
    'Use diffuse overcast daylight with soft material separation and no dramatic glow.',
    'Use calm afternoon light entering from the opposite side of the paired image.',
    'Use bright indirect daylight reflected from a pale wall, keeping every object readable.',
    'Use soft north-facing window light with cool-neutral highlights and warm natural materials.',
    'Use mild warm practical room light balanced by neutral daylight, without theatrical contrast.',
    'Use even skylight-like illumination with realistic exposure and quiet dimensional shadows.',
    'Use a narrow band of natural side light while keeping the background softly illuminated.',
    'Use subdued end-of-day daylight with accurate color and no orange cinematic grading.',
    'Use clean front-side daylight with gentle highlight roll-off and visible surface texture.',
    'Use broad soft light from behind the camera with one subtle side shadow for depth.'
]);

const TONE_OPTIONS = createOptions('tone', [
    'Keep neutral whites and restrained natural saturation with a clean documentary color response.',
    'Use warm paper and wood tones balanced by quiet gray shadows.',
    'Use a cool-neutral room balance while preserving natural brass, paper, cloth, and wood colors.',
    'Use muted mineral colors with one category-appropriate accent and no luxury color grading.',
    'Use pale matte tones with controlled black levels and no washed-out highlights.',
    'Use medium natural contrast with accurate everyday smartphone color.',
    'Use soft cream highlights and neutral brown midtones without a vintage filter.',
    'Use restrained low-saturation color with one clearly identifiable hero-object color.',
    'Use balanced daylight color with slightly deeper material separation in the middle tones.',
    'Use calm editorial neutrals while keeping the result recognizably photographic and practical.'
]);

const MATERIAL_OPTIONS = createOptions('material', [
    'Emphasize believable paper fibers, matte ink, and clean folded edges.',
    'Emphasize natural wood grain and physically correct contact between every object and support.',
    'Emphasize restrained woven texture without turning cloth into decorative luxury fabric.',
    'Emphasize subtle age variation on practical objects while keeping them intact and clean.',
    'Emphasize matte surfaces and small realistic handling marks without dirt or damage.',
    'Emphasize distinct paper, wood, metal, and textile boundaries so objects never fuse together.',
    'Emphasize quiet handmade material variation with accurate scale and construction.',
    'Emphasize crisp object edges near the focal plane and natural texture falloff with depth.',
    'Emphasize functional storage and support materials rather than ornamental decoration.',
    'Emphasize realistic print, binding, joinery, and surface finishing appropriate to the assigned objects.'
]);

const FOCUS_OPTIONS = createOptions('focus', [
    'Keep the complete hero object sharp with a gently softened but recognizable environment.',
    'Use moderate depth of field so the hero object and its immediate support are both clear.',
    'Use layered focus with a restrained foreground edge, a sharp hero plane, and a soft distant background.',
    'Keep front-to-middle depth readable with no artificial portrait-mode cutout artifacts.',
    'Use selective focus only on the assigned object group while preserving its full outline.',
    'Keep broad practical focus across the scene with natural softness only at the far background.',
    'Use a clear middle-ground focal plane and let foreground texture provide subtle depth.',
    'Use gentle near-to-far focus falloff without microscopic macro treatment or accidental cropping.'
]);

const DEPTH_OPTIONS = createOptions('depth', [
    'Build three restrained depth layers without adding unrelated props.',
    'Use one clean foreground boundary and leave the opposite side open for breathing room.',
    'Use a shallow diagonal through the assigned setting while keeping verticals upright.',
    'Use lateral negative space and one distant architectural cue to distinguish the location.',
    'Use a centered depth path with the hero object offset slightly from the axis.',
    'Use two different support heights already available in the assigned scene, without inventing furniture.',
    'Use a quiet background opening or storage boundary to establish a separate physical place.',
    'Use asymmetrical depth with the visual weight balanced by empty space, not extra decoration.',
    'Use a low foreground texture and a higher background plane while preserving gravity and scale.',
    'Use compact depth around the hero subject and a clearly different distant material boundary.'
]);

const CATEGORY_LOCATION_GROUPS = {
    'tarot-ppt': createOptions('tarot-place', [
        'Realize the assigned scene as a working Korean card-reading nook with a clearly owned deck system and practical storage, never a generic office.',
        'Use the character of a quiet window-side reading corner where the assigned deck and cloth are the unmistakable working tools.',
        'Use a compact card atelier atmosphere with organized deck cases and one restrained material backdrop, without displaying unrelated decks.',
        'Use a private consultation alcove shaped by the assigned reading surface, clean circulation space, and a distinct wall or screen boundary.',
        'Use a practical deck-study corner with one category-consistent archive cue and no saju charts or ceremonial objects.',
        'Use a bright contemporary reading space whose identity comes from the assigned card family and spread geometry rather than mystical decoration.',
        'Use a calm timber-and-cloth card consultation corner with a visibly different footprint from the paired image.',
        'Use a minimal card interpretation workspace with deliberate empty space around the assigned spread and no generic lounge styling.'
    ]),
    'saju-ppt': createOptions('saju-place', [
        'Realize the assigned scene as a Korean saju analysis study with structured reference storage and no tarot or ritual objects.',
        'Use the character of a quiet manse-calendar research corner with practical indexing and restrained paper organization.',
        'Use a contemporary four-pillars consultation archive with clear document hierarchy and a distinct physical footprint.',
        'Use a seasonal-reference study nook shaped by calendars, folders, and neutral storage rather than decorative symbolism.',
        'Use a compact saju records room with anonymized worksheets and functional shelves, keeping all text unreadable.',
        'Use a calm Korean analysis library corner with the assigned study tool as the only hero subject.',
        'Use a practical long-cycle planning workspace with organized timelines, paper layers, and no generic corporate-office appearance.',
        'Use a restrained traditional-and-modern saju study setting with functional joinery, paper storage, and clear analytical order.'
    ]),
    'sinjeom-ppt': createOptions('sinjeom-place', [
        'Realize the assigned indoor, outdoor, or threshold environment as a bright, modest Korean prayer-preparation place with respectful spacing and no crowded altar.',
        'Use a quiet Korean architectural or natural boundary appropriate to the assigned environment, keeping the ceremonial object as the sole visual anchor.',
        'Use a clean ritual-object preparation zone based only on the support available in the assigned scene, with no smoke, uncontrolled flame, readable talisman, or theatrical spectacle; a small steady flame is allowed only for an assigned candle subject.',
        'Use a restrained prayer setting with open space, pale natural light, and one culturally appropriate support without changing the assigned environment type.',
        'Use a calm courtyard, veranda, or sheltered interior interpretation that follows the assigned environment without mixing in tarot or saju tools.',
        'Use respectful ceremonial preparation or fitted storage only where compatible with the assigned scene; outdoors, keep the object secured on the assigned support instead.',
        'Use a modest Korean spiritual consultation or preparation setting defined by the assigned architecture or landscape and the hero object, never horror or fantasy imagery.',
        'Use a quiet transition between preparation and consultation that follows the assigned environment while preserving open circulation and a visibly distinct location.'
    ])
};

const ENVIRONMENT_LOCATION_GROUPS = {
    indoor: createOptions('indoor-place', [
        'Use a physically distinct compact room with one plain wall boundary and practical circulation space.',
        'Use a separate window-side interior with a different floor material and no repeated furniture footprint.',
        'Use a quiet recessed alcove with built-in support appropriate to the assigned scene and no generic office desk.',
        'Use a modest room with a paper-screen boundary and restrained functional storage kept in the background.',
        'Use a separate interior bay defined by pale plaster, natural joinery, and one clear architectural edge.',
        'Use a calm corner room with a different window direction and visibly different background depth.',
        'Use a practical archive or preparation interior with closed storage and one open working zone.',
        'Use a bright uncluttered interior whose floor plan and support placement are distinct from the paired image.'
    ]),
    outdoor: createOptions('outdoor-place', [
        'Use a sheltered mountain-edge clearing with dry stable ground and subdued natural depth.',
        'Use a quiet courtyard edge with clean stone, open sky, and no indoor furniture.',
        'Use a protected garden boundary with one low masonry or wooden support appropriate to the assigned object.',
        'Use a calm forest-edge shelter with realistic daylight and no theatrical mist or fire.',
        'Use a broad dry riverside or hillside stone setting with the distant landscape kept secondary.',
        'Use an open pavilion edge with stable floor construction and restrained surrounding vegetation.',
        'Use a quiet exterior wall or eaves boundary with natural weathering and no staged altar.',
        'Use a separate outdoor preparation place with a secure fitted support and generous open air.'
    ]),
    threshold: createOptions('threshold-place', [
        'Use a distinct hanok doorway threshold with courtyard light entering from one side.',
        'Use a recessed paper-door alcove that clearly separates interior and exterior depth.',
        'Use a wooden corridor edge with strong architectural lines and no central table.',
        'Use a veranda boundary overlooking a quiet courtyard with a secure low support.',
        'Use an open inner doorway framed by one neutral screen and two visible depth layers.',
        'Use a sheltered eaves transition with a different floor level and restrained daylight.',
        'Use a side entrance bay with clean joinery and a clearly separate spatial footprint.',
        'Use a quiet room-to-courtyard transition where the hero object remains protected from weather.'
    ])
};

const CATEGORY_PLACEMENT_OPTIONS = {
    'tarot-ppt': createOptions('tarot-frame', [
        'Preserve the assigned spread exactly and frame its card rhythm as the main graphic structure.',
        'Keep the assigned deck complete and use clean negative space along one side of the spread.',
        'Frame from the assigned camera axis with the card backs, faces, and paper edges forming distinct layers.',
        'Use the assigned card arrangement as a strong diagonal while keeping every complete card inside the frame.',
        'Keep one clear visual entry point from the deck stack into the assigned spread without adding cards.',
        'Use balanced asymmetry between the assigned hero card group and its empty reading surface.',
        'Preserve the spread geometry and let one background boundary make this location unmistakably separate.',
        'Keep the card family visually consistent while emphasizing a different spacing rhythm from the paired image.',
        'Use the assigned support and camera distance to show believable card scale and handling space.',
        'Frame the complete reading setup with a restrained foreground edge and no unrelated divination props.'
    ]),
    'saju-ppt': createOptions('saju-frame', [
        'Arrange the assigned analysis tool with a clear hierarchy between primary sheet, reference layer, and storage.',
        'Use orderly document spacing and one open working area that communicates active analysis without readable text.',
        'Frame the assigned reference material against a distinct archive or study boundary rather than a generic desk.',
        'Use a measured grid-like spatial rhythm while keeping every physical object natural and unfused.',
        'Place the assigned study tool as the analytical anchor with supporting paper layers clearly secondary.',
        'Use a quiet diagonal between the active reference and its organized storage context.',
        'Keep the main worksheet or book fully visible and balance it with practical empty note-taking space.',
        'Use vertical and horizontal document edges to create structure without adding fictional writing.',
        'Frame the scene as a real research moment with the assigned object sharp and the archive context restrained.',
        'Use an asymmetrical study composition that keeps long-term records and current analysis visually separate.'
    ]),
    'sinjeom-ppt': createOptions('sinjeom-frame', [
        'Give the assigned ceremonial object respectful open space and keep every supporting material clearly secondary.',
        'Frame the hero object against one architectural boundary with no crowded altar or decorative accumulation.',
        'Use the assigned support as a stable visual base and leave a clear preparation area beside it.',
        'Keep the ceremonial object complete and centered within a quiet field of floor, ledge, case, or landscape.',
        'Use restrained asymmetry with the hero object on one side and open prayer or preparation space on the other.',
        'Frame through a doorway, screen, post, case edge, or natural boundary already compatible with the assigned scene.',
        'Use a low visual center of gravity and ample clear space above the assigned object.',
        'Keep the assigned object visually isolated from storage and architecture so its identity remains unmistakable.',
        'Use one directional line from the surrounding place toward the hero object without adding ritual spectacle.',
        'Present the object as carefully prepared for practical use, with clean separation from every support accessory.'
    ])
};

function validateOptionCollection(label, collection) {
    const lengths = new Set();
    for (const [groupId, options] of Object.entries(collection)) {
        if (!Array.isArray(options) || options.length < 2) {
            throw new Error(`[visual-combinations] ${label}.${groupId} requires at least two options.`);
        }
        if (new Set(options.map((option) => option.id)).size !== options.length) {
            throw new Error(`[visual-combinations] ${label}.${groupId} contains duplicate option IDs.`);
        }
        if (options.some((option) => !option.id || !option.prompt)) {
            throw new Error(`[visual-combinations] ${label}.${groupId} contains an incomplete option.`);
        }
        lengths.add(options.length);
    }
    if (lengths.size !== 1) {
        throw new Error(`[visual-combinations] ${label} groups must expose the same number of options.`);
    }
    return [...lengths][0];
}

const CATEGORY_LOCATION_COUNT = validateOptionCollection('categoryLocations', CATEGORY_LOCATION_GROUPS);
const ENVIRONMENT_LOCATION_COUNT = validateOptionCollection('environmentLocations', ENVIRONMENT_LOCATION_GROUPS);
const CATEGORY_PLACEMENT_COUNT = validateOptionCollection('categoryPlacements', CATEGORY_PLACEMENT_OPTIONS);

function digestFor(value) {
    return crypto.createHash('sha256').update(String(value || '')).digest();
}

function pickOption(options, digest, offset = 0, excludedId = '') {
    let index = digest.readUInt32BE(offset % (digest.length - 3)) % options.length;
    if (options[index].id === excludedId && options.length > 1) {
        index = (index + 1 + (digest[(offset + 7) % digest.length] % (options.length - 1))) % options.length;
    }
    return options[index];
}

function selectRealization({ templateType, stableIdentity, nonce, generationSequence, imageKind, scene, excluded = null }) {
    const digest = digestFor(`${PROFILE_VISUAL_VARIATION_VERSION}\0${templateType}\0${stableIdentity}\0${nonce}\0${generationSequence}\0${imageKind}`);
    const locationOptions = CATEGORY_LOCATION_GROUPS[templateType] || CATEGORY_LOCATION_GROUPS['sinjeom-ppt'];
    const environment = Object.hasOwn(ENVIRONMENT_LOCATION_GROUPS, scene?.environment) ? scene.environment : 'indoor';
    const environmentLocationOptions = ENVIRONMENT_LOCATION_GROUPS[environment];
    const placementOptions = CATEGORY_PLACEMENT_OPTIONS[templateType] || CATEGORY_PLACEMENT_OPTIONS['sinjeom-ppt'];
    const selected = {
        templateType,
        location: pickOption(locationOptions, digest, 0, excluded?.location?.id),
        environmentLocation: pickOption(environmentLocationOptions, digest, 28, excluded?.environmentLocation?.id),
        placement: pickOption(placementOptions, digest, 4, excluded?.placement?.id),
        lighting: pickOption(LIGHTING_OPTIONS, digest, 8, excluded?.lighting?.id),
        tone: pickOption(TONE_OPTIONS, digest, 12, excluded?.tone?.id),
        material: pickOption(MATERIAL_OPTIONS, digest, 16, excluded?.material?.id),
        focus: pickOption(FOCUS_OPTIONS, digest, 20, excluded?.focus?.id),
        depth: pickOption(DEPTH_OPTIONS, digest, 24, excluded?.depth?.id)
    };
    selected.id = [
        templateType,
        selected.location.id,
        selected.environmentLocation.id,
        selected.placement.id,
        selected.lighting.id,
        selected.tone.id,
        selected.material.id,
        selected.focus.id,
        selected.depth.id
    ].join(':');
    return selected;
}

export function getVisualRealizationPair({ templateType, stableIdentity, nonce, generationSequence = 0, portraitScene = null, moodScene = null }) {
    const portrait = selectRealization({ templateType, stableIdentity, nonce, generationSequence, imageKind: 'portrait', scene: portraitScene });
    const mood = selectRealization({ templateType, stableIdentity, nonce, generationSequence, imageKind: 'mood', scene: moodScene, excluded: portrait });
    return { portrait, mood };
}

export function buildVisualRealizationPrompt(realization) {
    return [
        `Category identity: ${realization.templateType}. Keep every location and placement specific to this consultation category.`,
        `Distinct category location: ${realization.location.prompt}`,
        `Environment-compatible physical place: ${realization.environmentLocation.prompt}`,
        `Category-specific photographic placement: ${realization.placement.prompt}`,
        `Lighting realization: ${realization.lighting.prompt}`,
        `Color and exposure realization: ${realization.tone.prompt}`,
        `Material realization: ${realization.material.prompt}`,
        `Focus realization: ${realization.focus.prompt}`,
        `Depth realization: ${realization.depth.prompt}`,
        'These are secondary realization constraints. They must preserve the assigned hero subject, scene family, environment, support method, spread or object arrangement, and camera distance.',
        'When reference images are attached, their safe compatible palette, material, lighting, and spatial traits remain the primary evidence; adapt these realization choices around those traits instead of overriding them.'
    ].join('\n');
}

export const VISUAL_REALIZATION_COUNT_PER_BASE = (
    LIGHTING_OPTIONS.length
    * TONE_OPTIONS.length
    * MATERIAL_OPTIONS.length
    * FOCUS_OPTIONS.length
    * DEPTH_OPTIONS.length
    * CATEGORY_LOCATION_COUNT
    * CATEGORY_PLACEMENT_COUNT
    * ENVIRONMENT_LOCATION_COUNT
);

export function calculateStructuredImageGroupCount({ heroSubjects, supportSubjects = 0, scenes, palettes, fixedHeroSubject = false }) {
    const heroCount = fixedHeroSubject ? 1 : Math.max(Number(heroSubjects) || 0, 0);
    const supportCount = Math.max(Number(supportSubjects) || 0, 1);
    return BigInt(heroCount)
        * BigInt(supportCount)
        * BigInt(Math.max(Number(scenes) || 0, 0))
        * BigInt(Math.max(Number(palettes) || 0, 0))
        * BigInt(VISUAL_REALIZATION_COUNT_PER_BASE);
}
