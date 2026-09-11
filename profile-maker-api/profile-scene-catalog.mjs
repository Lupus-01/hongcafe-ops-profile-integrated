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
    scenes['tarot-ppt'].push(...createObliqueTarotScenes(createScene));
    scenes['tarot-ppt'].push(...createDiverseTarotScenes(createScene));
    scenes['tarot-ppt'].push(...createPackTarotScenes(createScene));
    scenes['tarot-ppt'].push(...createEditorialTarotScenes(createScene));
    scenes['saju-ppt'].push(...createSajuStudyScenes(createScene));
    return scenes;
}

function createSajuStudyScenes(createScene) {
    const groups = [
        ['analysis-overhead', 'tabletop-study', 'medium', 'overhead', 'flat-review-board', 'flat-paper-surface', true,
            ['pillars', 'diagram', 'timeline'], 'Lay the assigned complete analysis sheet or workbook flat, with one pencil parallel to its outer edge. Preserve four columns for a pillars sheet, five restrained color regions for an elements diagram, or a clear horizontal progression for a timeline.'],
        ['reference-oblique', 'research-space', 'medium', 'high-oblique', 'sloped-reading-stand', 'plain-study-wall', false,
            ['calendar-book', 'research-notes'], 'Place one assigned reference volume or bound research notebook on a fitted sloped reading stand. Show the complete binding, page block and stand with natural perspective; no extra books.'],
        ['material-close', 'detail-closeup', 'close', 'side-level', 'fitted-book-cradle', 'plain-matte-backing', false,
            ['calendar-book', 'research-notes', 'index-storage'], 'Show the entire assigned object close enough to distinguish its binding, tabs or index compartments. Preserve paper thickness and separate edges; no microscopic crop or extra papers.'],
        ['diagram-front', 'diagram-study', 'medium', 'front-level', 'vertical-document-holder', 'plain-hanji-panel', false,
            ['pillars', 'diagram', 'timeline'], 'Secure the assigned analysis material fully within a vertical document holder. Show the complete four-column grid, five-region relationship diagram or horizontal timeline appropriate to that object; no floating sheet.'],
        ['consultation-space', 'architectural-wide', 'wide', 'eye-level', 'fitted-review-alcove', 'modest-consultation-room', false,
            ['pillars', 'diagram', 'timeline', 'calendar-book', 'research-notes', 'index-storage'], 'Show a bright modest Korean consultation alcove with only the assigned study object on a built-in support, one empty seat and clear walking space. Keep the study object large enough to identify; no distant library shelves.']
    ];
    const finishes = [
        ['ivory', 'ivory matte support with pale timber trim'],
        ['sage', 'muted sage backing and natural oak support'],
        ['ink', 'soft ink-blue backing and light ash support'],
        ['sand', 'warm sand backing and walnut support']
    ];
    return groups.flatMap(([group, family, distance, cameraHeight, support, background, tabletop, motifFamilies, direction]) =>
        finishes.map(([finish, material]) => createScene(`saju-study-${group}-${finish}`, family,
            `${direction} Use ${material}. Keep the assigned object count; no decorative props. Paper, grid lines, binding and physical edges remain sharp; omit legible names, birth data and labels instead of blurring the entire object.`,
            `${cameraHeight} camera, zero roll, ${distance} framing, natural perspective`, tabletop,
            { sajuStudy: true, shootingGroup: group, shootType: `saju-${group}`, distance, cameraHeight, support, background, motifFamilies })));
}

// Original print directions, keyed by the existing selected deck family. Never
// substitute a published package or mix the active deck with another family.
const PACK_ART = {
    'classic-symbolic': ['cream woodcut-style symbols with a red frame', 'navy symbolic medallion with restrained mineral colors', 'ochre paper with separate narrative illustration panels'],
    'marseille-geometry': ['primary-color flat geometric frame', 'ivory ground with geometric ornamental bands', 'bold ink outlines around a yellow central illustration'],
    'modern-oracle': ['pastel abstract collage', 'teal negative space around one abstract emblem', 'overlapping coral and muted blue color planes'],
    botanical: ['pressed-flower specimen composition', 'night-brown garden illustration', 'cream herb atlas with fine botanical borders'],
    celestial: ['navy moon above a printed forest silhouette', 'lavender constellation geometry', 'silver-gray printed moon-phase bands'],
    'time-wheel': ['four-season circular illustration', 'vintage clock diagram without numbers', 'winding path through seasonal panels'],
    'art-nouveau': ['sage floral arch', 'rose-colored flowing botanical frame', 'ivory and violet iris ornament'],
    'european-narrative': ['small garden painting in a broad frame', 'vintage secular street illustration', 'interior still-life painting in an oval frame'],
    'animal-symbol': ['wolf and leaf emblem', 'blue songbird with curling plant ornament', 'fox and autumn botanical engraving'],
    'seasonal-watercolor': ['spring blossoms with pale watercolor washes', 'summer garden watercolor collage', 'winter forest with generous paper margins'],
    'dream-archetype': ['overlapping quiet landscape silhouettes', 'abstract stair shapes and muted color planes', 'quiet landscape within a simple window-shaped printed frame'],
    'color-symbolic': ['colored petal shapes on black', 'color-plane mosaic on ivory', 'controlled color bands on navy'],
    'iching-symbolic': ['ink landscape with accurate solid and broken trigram lines', 'wide ivory margins around accurate trigram lines', 'pale ink landscape with one small red geometric accent'],
    'minimal-monochrome': ['fine-line central emblem', 'black and white divided planes', 'small abstract symbol within generous blank margins']
};

const PACK_STRUCTURES = {
    tuck: 'a printed folding paperboard tuck box with a fitted tuck flap and visible fold seams',
    lift: 'a thick printed paperboard two-piece lift-off-lid box with a fitted inner tray',
    sleeve: 'a printed paperboard sliding sleeve with one fitted paper drawer',
    book: 'a book-opening rigid paperboard case with a paper hinge and fitted deck cavity, no metal hardware',
    magnetic: 'a rigid printed paperboard flip-lid case with concealed magnetic closure, no visible metal',
    compact: 'a compact printed paperboard deck case with a snug folding flap'
};

// Exactly 18 physical layouts. Three art variants per layout are NOT 54
// independent camera compositions. Each layout fixes a compatible structure.
const PACK_LAYOUTS = [
    ['standing-fan', 'tuck', 'Stand one closed pack behind a broad fan of matching card backs and two separate complete face-up cards.', 'high-oblique', '45mm at 45 degrees above the table'],
    ['standing-row', 'compact', 'Stand one closed pack beside three separate complete face-up cards in a straight row.', 'high-oblique', '50mm at 40 degrees above the table'],
    ['flat-deck', 'compact', 'Lay one closed pack flat beside its squared deck and one complete face-up card.', 'overhead', '50mm true vertical overhead'],
    ['open-lid', 'lift', 'Show one open box containing its deck, with the detached illustrated lid beside it and two complete face-up cards in front.', 'high-oblique', '55mm at 45 degrees above the table'],
    ['emerging-deck', 'tuck', 'Lay one pack down with its tuck flap open and its squared deck partly slid out onto the cloth, beside two complete face-up cards.', 'low-oblique', '65mm at 25 degrees above the table'],
    ['sliding-tray', 'sleeve', 'Slide the deck-filled paper drawer halfway out of its sleeve; place three separate complete face-up cards across the foreground.', 'high-oblique', '55mm at 40 degrees above the table'],
    ['open-book', 'book', 'Open the paper-hinged cover to the left, showing a fitted deck on the right and two complete face-up cards below.', 'high-oblique', '50mm at 50 degrees above the table'],
    ['flat-diagonal', 'magnetic', 'Lay one closed illustrated case face-up with two complete face-up cards diagonally beside it, leaving distinct gaps.', 'overhead', '55mm true vertical overhead'],
    ['two-staggered', 'tuck', 'Stand two matching closed packs at staggered depths, one showing its front and one its side; put three complete face-up cards in front.', 'high-oblique', '50mm at 35 degrees above the table'],
    ['two-stacked', 'lift', 'Stack two matching closed packs horizontally beside the squared active deck and one complete face-up card.', 'low-oblique', '60mm at 25 degrees above the table'],
    ['standing-flat', 'compact', 'Place one matching closed pack upright and another flat, with the active deck between them and two complete face-up cards in front.', 'high-oblique', '50mm at 40 degrees above the table'],
    ['cover-detail', 'lift', 'Show the front, side and closed lid seam of one pack beside two complete face-up cards and the squared deck; retain a visible cloth margin.', 'low-oblique', '65mm close at 30 degrees above the table'],
    ['prepared-reading', 'magnetic', 'Open the flip lid behind its deck-filled case, with three complete face-up cards in a loose triangle on the cloth in front.', 'high-oblique', '45mm at 45 degrees above the table'],
    ['spine-leading', 'tuck', 'Place one closed pack with its illustrated narrow side toward the foreground and its front still visible, leading into four complete face-up cards in a stepped row.', 'high-oblique', '55mm at 40 degrees above the table'],
    ['cover-and-backs', 'compact', 'Lay one pack front-up beside a compact fan of matching card backs and one separate complete face-up card.', 'overhead', '50mm true vertical overhead'],
    ['lid-triangle', 'lift', 'Arrange the detached illustrated lid, deck-filled base and one complete face-up card as three separated points of a triangle.', 'overhead', '55mm true vertical overhead'],
    ['book-overhead', 'book', 'Open one book-style case flat with its decorated inner cover on the left, deck cavity on the right and three complete face-up cards below.', 'overhead', '45mm true vertical overhead'],
    ['horizontal-pair', 'sleeve', 'Place a closed illustrated sleeve pack beside its matching squared active deck, with two complete face-up cards in a separate front row.', 'low-oblique', '60mm at 20 degrees above the table']
];

function createEditorialTarotScenes(createScene) {
    const layouts = [
        ['overhead', 'fan-three-row', 'A broad fan of matching card backs across the top, with three separate complete face-up cards in one row below.', 'overhead', 'medium', '50mm vertical 90-degree overhead'],
        ['overhead', 'fan-six-grid', 'A broad upper fan of matching card backs, with six separate complete face-up cards in a two by three grid below.', 'overhead', 'medium', '45mm vertical 90-degree overhead'],
        ['overhead', 'split-fans-center', 'Two separated fans of matching card backs at left and right, framing three separate complete face-up cards in a vertical central lane.', 'overhead', 'medium', '45mm vertical 90-degree overhead'],
        ['overhead', 'open-ring-center', 'Matching card backs form an open circular arc with a clear gap at the bottom, around two separate complete face-up cards in the center.', 'overhead', 'medium', '45mm vertical 90-degree overhead'],
        ['oblique', 's-curve-selection', 'Two connected arcs of matching card backs form a gentle S-shaped ribbon; three separate complete face-up cards sit in a clear zone beside the ribbon.', 'high-oblique', 'medium-environment', '45mm high three-quarter view at 45 degrees above the table'],
        ['oblique', 'side-fan-reading', 'One broad fan of matching card backs occupies the left half of the working surface, with four separate complete face-up cards in a reading grid on the right.', 'high-oblique', 'medium-environment', '40mm high three-quarter view at 50 degrees above the table'],
        ['closeup', 'rear-fan-front-two', 'A compact fan of matching card backs rests behind two separate complete face-up cards in the foreground; keep the full fan and both cards inside the crop.', 'low-oblique', 'close', '65mm close view at 30 degrees above the surface'],
        ['closeup', 'offset-three-space', 'Three separate complete face-up cards form an offset L-shaped arrangement on the right, leaving a broad quiet cloth area on the left for the assigned small accessory.', 'low-oblique', 'close', '65mm close view at 35 degrees above the surface'],
        ['deck-detail', 'split-deck-edges', 'Split the same deck into two short squared stacks at right angles, one showing its printed back and the other its top face; a separate complete face-up card lies beside them. Show realistic paper layers.', 'surface-level', 'tight-detail', '75mm detail view at 20 degrees above the surface'],
        ['deck-pack', 'pack-long-front-fan', 'Stand one illustrated closed paper tuck pack at the rear right, with a long shallow fan of matching card backs extending diagonally across the foreground and two separate complete face-up cards at the left.', 'high-oblique', 'desk-detail', '50mm high three-quarter view at 40 degrees above the table', 'tuck'],
        ['deck-pack', 'open-pack-split-reading', 'Center one open paper lift-off box containing its matching deck, place its illustrated lid behind it, and arrange two separate complete face-up cards on each side in two distinct reading areas.', 'high-oblique', 'desk-detail', '45mm high three-quarter view at 50 degrees above the table', 'lift'],
        ['deck-pack', 'rear-packs-front-reading', 'Place three illustrated closed compact paper packs from the same selected deck family in a short rear row; arrange six separate complete face-up cards in a two by three foreground reading grid. This is a working desk, not a bookshelf view.', 'high-oblique', 'desk-detail', '40mm high three-quarter view at 45 degrees above the table', 'compact']
    ];
    return layouts.flatMap(([group, layout, arrangement, cameraHeight, distance, camera, structure]) =>
        (structure ? [1, 2, 3] : [0]).map(variant => createScene(
            `tarot-editorial-${layout}${variant ? `-art-${variant}` : ''}`, `editorial-${layout}`,
            `Photograph a thoughtfully arranged real tarot consultation desk. ${arrangement} All cards belong to the selected deck family, with coherent dimensions, borders, backs and original printed illustrations. ${structure ? `REQUIRED TOGETHER: illustrated paper card packaging, its matching real deck, complete face-up cards, reading cloth and the assigned small accessory set. Package structure: ${PACK_STRUCTURES[structure]}. All boxes use printed paperboard, never wood, bare storage bins or metal tins. Never an empty organizer or a package-only product shot.` : 'Keep the actual reading arrangement as the main subject.'} The assigned reading cloth lies flat beneath every card; any folds stay in the empty outer margin. Cards and any assigned packs span 65 to 80 percent of the frame width. ${['oblique', 'deck-pack'].includes(group) ? 'Show a small near desk edge and only a restrained plain wall or curtain beyond it.' : 'Only cloth surrounds the assigned objects; exclude table edges, horizon, room, windows and walls.'} Every face-up card is complete, separate and unobstructed. Only explicitly assigned fans or arcs of card backs may overlap, with orderly visible individual edges; no fused or floating cards. Keep the assigned small accessory set in the cloth margin without covering cards. Follow the assigned light and surface treatment; printed scenery never becomes a real backdrop. No people, hands, extra props, readable text, logos, copied commercial designs, religious setting or ritual objects.`,
            `${camera}; zero roll, natural perspective, clear card faces and complete required objects`, true,
            { diverseTarot: true, editorialTarot: true, tabletopAccessories: true,
                shootingGroup: group, shootType: group, cardLayout: layout, cameraHeight, distance,
                support: 'reading-desk', tableShape: ['oblique', 'deck-pack'].includes(group) ? 'desk-edge' : 'outside-crop',
                background: ['oblique', 'deck-pack'].includes(group) ? 'plain-wall-or-curtain' : 'cloth-only',
                shotMode: ['closeup', 'deck-detail'].includes(group) ? 'close-detail' : 'environmental',
                simpleSurfaceOnly: ['closeup', 'deck-detail'].includes(group),
                ...(structure ? { packLayoutId: layout, packStructureId: structure, packArtVariant: variant,
                    packDesigns: Object.fromEntries(Object.entries(PACK_ART).map(([id, designs]) => [id, designs[variant - 1]])) } : {}) }
        )));
}

function createPackTarotScenes(createScene) {
    return PACK_LAYOUTS.flatMap(([layout, structure, arrangement, cameraHeight, camera]) =>
        [0, 1, 2].map(variant => createScene(
            `tarot-pack-${layout}-art-${variant + 1}`, `deck-pack-${layout}`,
            `A thoughtfully arranged working desk owned by an experienced tarot reader. REQUIRED TOGETHER: illustrated paper card packaging, its matching real deck, complete face-up cards, the independently assigned reading cloth, and the assigned small accessory set. ${arrangement} Package structure: ${PACK_STRUCTURES[structure]}. All boxes use printed paperboard, never wood, bare storage bins or metal tins. Never show an empty wooden organizer alone or a package-only product photograph. Keep package artwork and real cards jointly prominent across 65 to 80 percent of the frame width, with tactile cloth visible around them. Place the assigned accessory set neatly at the side, never on top of cards. Use a secular consultation desk with ${cameraHeight === 'overhead' ? 'only cloth visible beyond the assigned objects; no horizon or room' : 'a small near table edge and a restrained softly focused plain wall or curtain; no room-dominant view'}. Every face-up card is complete and separate; only the explicitly assigned fan of card backs may overlap. Keep squared decks coherent and boxes structurally separate from cards. No people, hands, extra decorations or readable text.`,
            `${camera}; zero roll, physically natural perspective, sharp printed covers and complete cards`, true,
            { shootingGroup: 'deck-pack', shootType: 'deck-pack', cardLayout: layout,
                packLayoutId: layout, packStructureId: structure, packArtVariant: variant + 1,
                packDesigns: Object.fromEntries(Object.entries(PACK_ART).map(([id, designs]) => [id, designs[variant]])),
                distance: 'desk-detail', cameraHeight, support: 'reading-desk',
                tableShape: cameraHeight === 'overhead' ? 'outside-crop' : 'desk-edge',
                background: cameraHeight === 'overhead' ? 'cloth-only' : 'plain-wall-or-curtain',
                shotMode: 'environmental', tabletopAccessories: true, diverseTarot: true }
        )));
}

// Additive policy: persisted v14-v16 definitions above remain unchanged.
function createDiverseTarotScenes(createScene) {
    const settings = [
        ['round', 'a round walnut reading table', 'window'],
        ['square', 'a square pale oak reading table', 'plaster-wall'],
        ['oval', 'an oval dark wooden reading table', 'curtain'],
        ['rectangular', 'a rectangular maple reading table', 'plain-screen'],
        ['rounded-square', 'a rounded-square ash reading table', 'alcove']
    ];
    const groups = [
        ['oblique', 'medium-environment', 'high-oblique', '40mm high three-quarter view at 45 degrees above the tabletop',
            'Show the near table edge and a little assigned background. The table fills 60 to 75 percent of the frame; cards span 35 to 55 percent of its width.',
            [['three-card-row', 'three face-up cards in a straight row'], ['four-card-grid', 'four face-up cards in a two by two grid'], ['five-card-arc', 'five face-up cards in an open arc']]],
        ['closeup', 'close', 'low-oblique', '70mm close photograph at 25 degrees above the reading surface',
            'The complete card arrangement spans 65 to 80 percent of the frame width. Only cards, assigned accessories and surrounding cloth are visible; exclude table edges, room, windows and walls.',
            [['single-card', 'one complete face-up card'], ['two-card-diagonal', 'two complete face-up cards placed diagonally with a clear gap'], ['three-card-fan', 'three separate complete face-up cards in a shallow fan without overlap']]],
        ['overhead', 'medium', 'overhead', '50mm true vertical 90-degree overhead photograph',
            'The card arrangement spans 60 to 75 percent of the frame width. Fill the remaining frame with reading cloth; exclude table edges, horizon, room, windows and walls.',
            [['three-card-triangle', 'three face-up cards in an open triangle'], ['five-card-cross', 'five face-up cards in a cross with clear gaps'], ['stepped-row', 'four face-up cards in a stair-step row']]],
        ['deck-detail', 'tight-detail', 'surface-level', '85mm close photograph at 15 degrees above the surface, focused on paper edges and printed faces',
            'Complete cards and matching deck span 65 to 80 percent of the frame width. Show paper layers and one matching card back; no microscopic magnification. Only cloth surrounds the objects; exclude table edges, room, windows and walls.',
            [['deck-and-one', 'one complete face-up card beside its squared matching deck'], ['deck-and-two', 'two complete face-up cards beside their squared matching deck'], ['deck-offset', 'one complete face-up card in front of its offset squared matching deck']]]
    ];
    return groups.flatMap(([shootingGroup, distance, cameraHeight, camera, framing, layouts]) =>
        settings.flatMap(([tableShape, table, background]) => layouts.map(([cardLayout, arrangement]) => createScene(
            `tarot-diverse-${shootingGroup}-${tableShape}-${cardLayout}`, shootingGroup,
            `Place ${arrangement} on the independently assigned reading cloth on ${table}. ${framing} ${shootingGroup === 'oblique' ? `The only room context is ${background}.` : 'The supporting table shape is outside the crop.'} Keep every card complete, separate and identifiable. Place the assigned accessory set in a small cloth margin beside the cards, never covering them. No extra objects, people, hands or readable text.`,
            `${camera}; zero camera roll, natural perspective and sufficient focus for every card and assigned accessory`, true,
            { shootingGroup, cardLayout, shootType: shootingGroup, distance, cameraHeight,
                support: tableShape, tableShape: shootingGroup === 'oblique' ? tableShape : 'outside-crop',
                background: shootingGroup === 'oblique' ? background : 'cloth-only',
                shotMode: ['closeup', 'deck-detail'].includes(shootingGroup) ? 'close-detail' : 'environmental',
                tabletopAccessories: true, diverseTarot: true }
        ))));
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

// Keep v15 IDs and prompts intact for saved jobs; new requests use these v16 scenes.
function createObliqueTarotScenes(createScene) {
    const settings = [
        ['round-window', 'a small pale round wooden table beside a window, with a round charcoal reading mat', 'window and a narrow strip of floor', '45 degrees'],
        ['square-wall', 'a compact square wooden table beside a warm plaster wall, with a dark velvet reading cloth', 'plaster wall and the near table edge', '55 degrees'],
        ['round-curtain', 'a round walnut consultation table beside a softly lit curtain, with a black linen reading cloth draped slightly over the near edge', 'curtain and a small part of the table pedestal', '40 degrees'],
        ['oak-corner', 'a small rectangular oak table in a quiet room corner, with a muted cream linen reading mat', 'two plain wall surfaces and the table edge', '60 degrees'],
        ['oval-alcove', 'a small oval wooden table in a daylight alcove, with a deep navy felt reading mat', 'a plain window recess and a little floor', '50 degrees']
    ];
    return createOverheadTarotScenes(createScene).map((scene, index) => {
        const [placeId, setting, background, angle] = settings[index % settings.length];
        const arrangement = scene.prompt.slice(0, scene.prompt.indexOf(' on '));
        return createScene(
            `tarot-oblique-${scene.shootType}-${placeId}`, scene.shootType,
            `${arrangement} on the reading mat of ${setting}. OBLIQUE READING TABLE: show the tabletop as the main setting, including its curved or straight edge, thickness and a little supporting structure. The table occupies about 60 to 75 percent of the frame; the card arrangement spans about 35 to 55 percent of the frame width. Keep every face-up card identifiable, complete, separate and naturally foreshortened by perspective. Include only ${background} as secondary context. Keep the existing assigned accessory set small beside the cards, never covering them. Natural window light and soft contact shadows; no tiny cards on a distant shelf, room-dominant wide shot, extra cups, candles or unassigned decorations. No people, hands or readable text.`,
            `40mm high three-quarter photograph looking down at ${angle} above the horizontal tabletop, from outside the near table edge; zero camera roll, natural perspective and broad focus across cards and accessories; never a vertical 90-degree flat lay`,
            true,
            { shootType: scene.shootType, distance: 'medium-environment', support: placeId, background, cameraHeight: 'high-oblique', shotMode: 'environmental', tabletopAccessories: true, obliqueTabletop: true }
        );
    });
}
