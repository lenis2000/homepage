/**
 * SEO Metadata Generator
 * Generates titles, tags, and descriptions for Redbubble/Spoonflower listings.
 */

const BASE_TAGS = [
    'geometric art', 'mathematical art', 'tessellation',
    'abstract geometry', 'math art print', 'probability art',
    'random tiling', 'combinatorics art', 'pattern design',
];

const REGION_TAGS = {
    hexagon: ['hexagonal pattern', 'hexagon art', 'honeycomb geometry'],
    diamond: ['diamond pattern', 'rhombus art', 'crystallography'],
    heart: ['heart pattern', 'heart geometric', 'love math art'],
};

const SCHEME_COLOR_TAGS = {
    'UVA': ['orange geometric', 'navy art', 'university colors'],
    'Albina': ['teal art', 'coral geometric', 'warm colors'],
    'Ocean Breeze': ['blue geometric', 'ocean art', 'cool tones'],
    'Cherry Blossom': ['pink geometric', 'floral art', 'pastel pattern'],
    'Forest Calm': ['green geometric', 'nature art', 'earth tones'],
    'Sunset Glow': ['orange art', 'sunset colors', 'warm pattern'],
    'Arctic Frost': ['ice blue art', 'winter pattern', 'cool geometric'],
    'Escher': ['grayscale art', 'monochrome pattern', 'minimalist geometric'],
    'Rainbow Pride': ['pride art', 'rainbow heart', 'LGBTQ art', 'pride geometric'],
    'Trans Pride': ['trans pride art', 'trans flag heart', 'trans geometric', 'pink blue white'],
    'Bi Pride': ['bi pride art', 'bisexual flag heart', 'bi geometric', 'pink purple blue'],
};

const PRODUCT_TAGS = {
    poster: ['wall art geometric', 'geometric poster', 'art print'],
    sticker: ['geometric sticker', 'math sticker', 'laptop sticker'],
    fabric: ['fabric pattern', 'seamless pattern', 'textile design'],
    phone: ['phone case art', 'geometric phone case'],
    pillow: ['throw pillow pattern', 'decorative pillow'],
};

/**
 * Generate metadata for a design
 */
export function generateMetadata(options = {}) {
    const {
        region = 'hexagon',
        scheme = 'UVA',
        size = 10,
        product = 'poster',
        qBias = 1.0,
        variation = 1,
    } = options;

    const schemeName = typeof scheme === 'string' ? scheme : scheme.name;

    // Title
    const regionName = region.charAt(0).toUpperCase() + region.slice(1);
    const title = `Geometric Lozenge Tiling Art Print - ${schemeName} ${regionName}`;

    // Tags
    const tags = [
        ...BASE_TAGS,
        ...(REGION_TAGS[region] || []),
        ...(SCHEME_COLOR_TAGS[schemeName] || []),
        ...(PRODUCT_TAGS[product] || []),
        'lozenge tiling',
    ];

    if (qBias !== 1.0) {
        tags.push('arctic circle', 'frozen region', 'phase transition art');
    }

    // Deduplicate
    const uniqueTags = [...new Set(tags)].slice(0, 15);

    // Description
    const desc = qBias !== 1.0
        ? `Unique mathematical art generated from random lozenge tilings of a ${regionName.toLowerCase()} region. This design features the striking "arctic circle" phenomenon where q-weighted random tilings create dramatic frozen boundaries. Each piece is a one-of-a-kind probabilistic artwork — no two are alike. Created using advanced Markov chain coupling algorithms.`
        : `Unique mathematical art generated from random lozenge tilings of a ${regionName.toLowerCase()} region. Each piece is a one-of-a-kind artwork created by exact probabilistic sampling — no two designs are identical. Based on research in combinatorics, probability theory, and statistical mechanics.`;

    // Filename
    const qStr = qBias !== 1.0 ? `-q${qBias}` : '';
    const filename = `${region}-${size}-${schemeName.toLowerCase().replace(/\s+/g, '-')}${qStr}-v${variation}`;

    return { title, tags: uniqueTags, description: desc, filename };
}
