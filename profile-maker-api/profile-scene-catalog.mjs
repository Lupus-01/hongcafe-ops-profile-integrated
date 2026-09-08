// Each setting/layout pair changes physical arrangement, not just palette or seed.
// Existing scene IDs stay in server.mjs; these additive IDs are stable.
const SETTINGS = {
    'tarot-ppt': [
        ['corner-bench', 'a compact consultation corner with an L-shaped bench and a square reading surface'],
        ['bay-window', 'a shallow bay-window reading nook with a broad built-in ledge'],
        ['round-pedestal', 'a small round pedestal reading table with a clear curved edge'],
        ['folding-station', 'a practical portable reading station on a plain folding table'],
        ['library-nook', 'a quiet library alcove with a reading surface between two closed bookcases'],
        ['recessed-desk', 'a recessed card-reading desk with one deep side wall'],
        ['long-counter', 'a long narrow consultation counter with open space along one side'],
        ['screen-divider', 'a modest reading table beside a freestanding plain room divider'],
        ['floor-platform', 'a low raised reading platform with empty floor cushions beyond its edge']
    ],
    'saju-ppt': [
        ['archive-bay', 'a modern saju research bay between closed flat-file cabinets'],
        ['window-study', 'a narrow analyst study beside a tall window recess'],
        ['consultation-booth', 'a modest saju consultation booth separated by a plain partition'],
        ['corner-library', 'a corner reference library with an L-shaped wall ledge'],
        ['standing-review', 'a standing-height saju document review station'],
        ['low-study', 'a Korean floor-seated study with a low reference shelf'],
        ['alcove-review', 'a deep wall alcove used for reviewing anonymized saju materials'],
        ['drawer-station', 'a practical research station beside shallow plan drawers'],
        ['shared-library', 'a quiet shared reference room with one isolated saju work bay']
    ],
    'sinjeom-ppt': [
        ['inner-prayer', 'a modest Korean prayer room with plain plaster walls'],
        ['timber-bay', 'a quiet indoor prayer bay between two timber posts'],
        ['side-chamber', 'a small side chamber with an offset doorway'],
        ['paper-window', 'a prayer alcove beside a high paper-screen window'],
        ['plain-hall', 'a bright unoccupied Korean prayer hall with open circulation space'],
        ['recessed-room', 'a recessed prayer room with a deep plain side wall'],
        ['screened-bay', 'a respectful prayer area separated by an unadorned screen'],
        ['preparation-room', 'a clean indoor prayer preparation room with closed storage']
    ]
};

// id, family, concrete arrangement, camera, tabletop, optional compatibility
const LAYOUTS = {
    'tarot-ppt': [
        ['parallel-rows', 'overhead-spread', 'Place six assigned cards in two parallel rows with a broad empty channel between them; square the matching deck at the near edge.', '45mm true overhead view', true],
        ['stepped-row', 'overhead-spread', 'Place five assigned cards in a deliberate stair-step arrangement with even gaps and no overlap.', '45mm true overhead view', true],
        ['open-triangle', 'overhead-spread', 'Arrange three complete assigned cards at the corners of an open triangle with the matching deck outside the triangle.', '50mm true overhead view', true],
        ['upright-and-flat', 'reading-in-progress', 'Use one plain low card rail holding two complete assigned cards upright, with three matching cards flat in front.', '60mm frontal three-quarter view', true],
        ['split-fan', 'reading-in-progress', 'Separate two small fans of matching card backs with one complete face-up assigned card in the central gap.', '50mm high oblique view', true],
        ['edge-study', 'card-closeup', 'Place the squared matching deck beside one complete face-up card; let deck thickness and the card border form two clear planes.', '75mm close detail from the surface edge', true],
        ['single-rail', 'card-closeup', 'Place one complete assigned card in a plain shallow rail with the matching closed deck at a visibly different depth.', '80mm close frontal detail', true],
        ['end-on-spread', 'working-stilllife', 'Align four complete assigned cards along the long axis of the reading surface with the matching deck offset at the far end.', '50mm low end-on view with natural perspective', true],
        ['display-gap', 'deck-display', 'Show one open unbranded deck box, its matching squared deck, and three complete assigned face-up cards in separate zones.', '55mm elevated three-quarter view', true],
        ['broad-arc', 'ambient-table', 'Place five assigned cards in a broad shallow arc that follows the working surface edge, with the matching deck alone behind the arc.', '40mm wide high-oblique view of the complete surface', true]
    ],
    'saju-ppt': [
        ['sloped-rest', 'detail-closeup', 'Display the assigned study material on a shallow adjustable reference rest, keeping its complete outline visible.', '70mm close frontal detail', false],
        ['open-compartment', 'archive-storage', 'Place the assigned material in one open fitted shelf compartment while all neighboring compartments remain closed.', '55mm straight-on shelf view', false],
        ['vertical-review', 'research-space', 'Secure the assigned material on a plain tilted review support on a wall ledge; show the ledge and wall meeting.', '50mm oblique view across two depth planes', false],
        ['floor-study', 'floor-setting', 'Place the assigned material securely on a low study support beside one empty cushion, leaving a wide floor gap.', '40mm low diagonal view', false],
        ['wide-bay', 'architectural-wide', 'Keep the assigned material identifiable on one plain reference support and show the entire work bay with clear circulation space.', '30mm architectural wide view', false],
        ['parallel-review', 'tabletop-study', 'Place the assigned material flat on a review surface beside one closed plain folder, with a large gap and a single pencil.', '45mm true overhead view', true],
        ['drawer-review', 'archive-storage', 'Place the assigned material flat in one fully supported shallow open drawer; keep the full drawer boundary visible.', '50mm high three-quarter view', false],
        ['raised-ledge', 'research-space', 'Isolate the assigned material on a waist-height wall ledge, with a clear vertical wall plane behind and empty space below.', '50mm eye-level side view', false],
        ['boundary-detail', 'detail-closeup', 'Center the complete assigned material on a thin plain support at the junction of two surfaces; emphasize its physical structure.', '75mm close high-oblique detail', false],
        ['room-diagonal', 'architectural-wide', 'Show the assigned material on an isolated study support from the opposite corner, with a doorway and floor area defining depth.', '32mm diagonal architectural wide view', false]
    ],
    'sinjeom-ppt': [
        ['isolated-base', 'prayer-space', 'Place only the assigned hero on one stable plain base with a generous empty border.', '50mm frontal three-quarter view', false],
        ['ledge-detail', 'detail-closeup', 'Show the complete assigned hero on a plain fitted ledge with a quiet wall immediately behind it.', '75mm close detail view', false],
        ['floor-gap', 'floor-setting', 'Place the assigned hero securely on a low fitted support, with one empty cushion separated by a broad floor gap.', '40mm low diagonal view', false],
        ['wide-room', 'architectural-wide', 'Keep the assigned hero identifiable on a stable raised support while showing the room boundaries and clear empty floor.', '30mm architectural wide view', false],
        ['open-storage', 'archive-storage', 'Place the assigned hero in one open fitted storage compartment; keep adjacent compartments closed and uncluttered.', '55mm straight-on storage view', false],
        ['offset-platform', 'temple-interior', 'Place the assigned hero alone on an offset stable platform, with two empty architectural planes forming depth.', '45mm layered diagonal view', false],
        ['votive-stone', 'candle-prayer', 'Place only the assigned candle group on a broad nonflammable stone pedestal with no nearby paper, wood accessories, or fabric.', '65mm close detail with complete holders visible', false, { motifFamilies: ['candle'], traditions: ['neutral'] }],
        ['figure-niche', 'buddha-space', 'Place the complete assigned sacred figure respectfully on a fitted stable base inside a shallow plain niche.', '55mm frontal niche view', false, { motifFamilies: ['buddha'], traditions: ['buddhist'] }],
        ['suspended-bay', 'lantern-space', 'Secure the assigned lotus lantern arrangement beneath a plain overhead beam, showing suspension and empty space below; no flame.', '35mm upward architectural view', false, { motifFamilies: ['lantern'], traditions: ['buddhist'] }]
    ]
};

export function createAdditionalSceneArchetypes(createScene) {
    const scenes = Object.fromEntries(Object.entries(SETTINGS).map(([category, settings]) => [category,
        settings.flatMap(([placeId, place]) => LAYOUTS[category].map(([layoutId, family, layout, camera, tabletop, options = {}]) =>
            createScene(`${category}-expanded-${placeId}-${layoutId}`, family,
                `Use ${place}. ${layout} Preserve category identity and the assigned hero; no people or readable private information.`,
                camera, tabletop, options)))
    ]));
    scenes['tarot-ppt'].push(...createIndependentTarotScenes(createScene));
    scenes['tarot-ppt'].push(...createOverheadTarotScenes(createScene));
    return scenes;
}

// Separate photographic subjects, not room/cloth permutations. Legacy IDs above
// remain readable for persisted jobs but are excluded from new tarot assignments.
function createIndependentTarotScenes(createScene) {
    const groups = [
        ['single-card', 'close', 'card-rail', 'plain-backdrop', 'eye-level', 'close-detail', false,
            '70mm level frontal close photograph',
            'Show exactly one complete face-up card from the assigned family in a discreet fitted rail. The card occupies about half the frame; no deck stack, spread, cloth, table or room view.',
            ['an off-center card against matte ivory paper', 'a centered card against a muted terracotta panel', 'a card on the right against a plain cool-gray panel', 'a card against a softly curved beige paper backdrop', 'a card against a quiet charcoal panel']],
        ['deck-texture', 'tight-detail', 'fitted-cradle', 'soft-field', 'surface-level', 'close-detail', false,
            '85mm low side close photograph at deck-edge height',
            'Photograph the complete squared assigned deck in a fitted cradle. Paper layers and the single top card back dominate the frame; no face-up spread, cloth, table, shelf or room view. Keep the complete deck outline visible.',
            ['the long paper edge running horizontally', 'a corner showing two perpendicular paper edges', 'the short edge facing the camera', 'a diagonal deck with its back pattern clearly visible', 'a slightly tilted cradle revealing back print and paper layers']],
        ['deck-storage', 'medium', 'storage-compartment', 'cabinet-grid', 'eye-level', 'environmental', false,
            '50mm level straight-on medium photograph',
            'Photograph preparation and storage of the assigned deck, with one visible sample face identifying its family. Storage structure is the main composition. No reading spread, cloth-covered surface or consultation table.',
            ['one open cubby surrounded by closed cabinet doors', 'a fitted vertical deck compartment with a plain sliding lid', 'an open rigid card case standing securely inside a wall niche', 'two separated shelf compartments with the assigned deck in only one', 'a shallow wall cabinet with its door open to the side']],
        ['consultation-space', 'wide', 'wall-shelf', 'room-architecture', 'standing-level', 'wide-environment', false,
            '32mm level architectural wide photograph with broad practical focus',
            'Let the unoccupied consultation space occupy most of the frame. One assigned deck and one identifiable sample card on a wall shelf are small category cues, about 10 percent of the frame. Do not zoom into them or add a card spread, reading cloth or central table.',
            ['two empty chairs separated by generous floor space and a recessed shelf', 'a long empty bench with a side wall shelf and an offset doorway', 'a compact consultation booth with a tall plain partition', 'an open consultation alcove framed by a broad doorway', 'a room corner with an empty armchair and a narrow vertical shelving recess']],
        ['card-shadow', 'medium', 'stone-plinth', 'shadow-wall', 'eye-level', 'environmental', false,
            '55mm level side-front photograph with lateral negative space',
            'Show one complete assigned card securely supported upright on a small stone plinth. Its physically plausible cast shadow and a broad blank wall dominate; the card occupies about one fifth of the frame. Use directional side light and readable shadows. No deck spread, cloth, table or additional props.',
            ['a long shadow extending left across a pale wall', 'a short defined shadow to the right on warm plaster', 'a diagonal shadow across the meeting of two plain walls', 'a broad shaded wall with a narrow band of side light', 'a low shadow across a wall and the top of the plinth']],
        ['reading-spread', 'medium', 'reading-table', 'flat-surface', 'overhead', 'environmental', true,
            '45mm true overhead photograph with only the working surface as background',
            'Show a practical reading using only the assigned card family. Preserve the complete cards, natural spacing and assigned arrangement. No room horizon or extra decorations.',
            ['three face-up cards in a row on bare pale wood', 'four face-up cards in a loose square on matte charcoal', 'five face-up cards in a shallow arc on a small muted turquoise mat', 'three separated face-up cards in a triangle on plain cream paper', 'one face-up card beside a compact fan of card backs on bare walnut']]
    ];
    return groups.flatMap(([shootType, distance, support, background, cameraHeight, shotMode, tabletop, camera, direction, arrangements]) =>
        arrangements.map((arrangement, index) => createScene(
            `tarot-independent-${shootType}-${index + 1}`, shootType,
            `${direction} Specific composition: ${arrangement}. No people, hands or readable text.`, camera, tabletop,
            { shootType, distance, support, background, cameraHeight, shotMode }
        )));
}

// v15: cards remain the main subject; diversity comes from layouts and accessories.
function createOverheadTarotScenes(createScene) {
    const layouts = [
        ['three-card-row', 'three complete face-up cards in a straight horizontal row'],
        ['four-card-grid', 'four complete face-up cards in a balanced two-by-two grid'],
        ['five-card-arc', 'five complete face-up cards in a shallow arc with no overlapping faces'],
        ['three-card-triangle', 'three complete face-up cards in a spacious triangle'],
        ['five-card-cross', 'five complete face-up cards in a cross, with clear gaps between all cards'],
        ['stepped-row', 'four complete face-up cards in a gently stepped horizontal row']
    ];
    const surfaces = [
        ['linen', 'a plain natural linen reading cloth'],
        ['walnut', 'a bare matte walnut tabletop'],
        ['velvet', 'a plain muted velvet reading mat'],
        ['felt', 'a plain soft felt reading mat'],
        ['oak', 'a bare pale oak tabletop']
    ];
    return layouts.flatMap(([layoutId, layout]) => surfaces.map(([surfaceId, surface]) => createScene(
        `tarot-overhead-${layoutId}-${surfaceId}`, layoutId,
        `Arrange ${layout} on ${surface}. CARD-FIRST OVERHEAD: the card arrangement spans about 65 to 80 percent of the frame width and is the dominant subject. Show every complete rectangular card face with consistent size, distinct printed artwork, intact corners and natural gaps. Keep the assigned accessory set in the outer margin, visibly smaller than the spread, never covering cards. Show only the flat working surface; no chairs, shelf, room horizon, upright display cards or architectural view. No people, hands or readable text.`,
        '50mm true overhead photograph, camera directly above and parallel to the tabletop, looking vertically down at 90 degrees; broad sharp focus across all card faces and accessories',
        true,
        { shootType: layoutId, distance: 'medium', support: surfaceId, background: 'flat-surface', cameraHeight: 'overhead', shotMode: 'environmental', tabletopAccessories: true }
    )));
}
