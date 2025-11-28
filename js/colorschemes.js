/**
 * Color Schemes for Simulations
 *
 * This file contains various color palettes used across different simulations.
 * Each color scheme contains a name and an array of colors.
 *
 * Currently used by:
 * - _simulations/lozenge_tilings/2025-06-02-q-vol-Gorin.md
 * - _simulations/lozenge_tilings/2025-06-08-q-vol-3d.md
 * - _simulations/lozenge_tilings/2025-11-26-cutout-region-glauber.md
 * - _simulations/lozenge_tilings/2025-11-26-cutout-region-q-racah.md
 * - _simulations/lozenge_tilings/2025-11-27-lozenge-glauber.md
 * - _simulations/lozenge_tilings/2025-11-28-c2-Glauber.md
 * - _simulations/lozenge_tilings/2025-11-28-c2-CFTP.md
 * - s/domino.md
 */

const ColorSchemes = [
    { name: 'UVA', colors: ['#E57200', '#232D4B', '#F9DCBF', '#002D62'] }, // Added UVA Blue as fourth color
    { name: 'Albina', colors: ['#47a290', '#ee5a4e', '#f7b948', '#333333'] }, // Kept neutral dark gray
    { name: 'No Colors', colors: ['#FFFFFF', '#FFFFFF', '#FFFFFF', '#808080'] }, // Added light gray for subtle contrast
    { name: 'Ocean Breeze', colors: ['#2E86AB', '#A23B72', '#F18F01', '#D4F1F4'] }, // Added a light, airy blue
    { name: 'Forest Calm', colors: ['#355E3B', '#8FBC8F', '#F5F5DC', '#A0C49D'] }, // Added a lighter green variant
    { name: 'Sunset Glow', colors: ['#FF6B35', '#F7931E', '#FFE66D', '#A0522D'] }, // Added a brown evocative of earth at sunset
    { name: 'Royal Purple', colors: ['#6A0572', '#AB83A1', '#F4C2C2', '#483D8B'] }, // Added a darker shade of purple
    { name: 'Arctic Frost', colors: ['#4F8A8B', '#2F4858', '#E8F4F8', '#B0E0E6'] }, // Added a lighter, ice-like blue
    { name: 'Cherry Blossom', colors: ['#D1477A', '#8B6F47', '#F7E7CE', '#FFC0CB'] }, // Added a lighter pink
    { name: 'Tropical', colors: ['#FF6B9D', '#C44569', '#F8B500', '#00CED1'] }, // Added a turquoise for the ocean
    { name: 'Emerald Dream', colors: ['#50C878', '#2E8B57', '#F0FFF0', '#90EE90'] }, // Added a lighter emerald green
    { name: 'Cosmic Blue', colors: ['#1B263B', '#415A77', '#E0E1DD', '#64B5F6'] }, // Added a brighter blue for a cosmic feel
    { name: 'Autumn Leaves', colors: ['#D2691E', '#8B4513', '#FFF8DC', '#A0522D'] }, // Reinforce brown tones
    { name: 'Lavender Fields', colors: ['#8A2BE2', '#DDA0DD', '#F8F8FF', '#E6E6FA'] }, // Added a lighter lavender
    { name: 'Desert Sand', colors: ['#CD853F', '#A0522D', '#FDF5E6', '#DEB887'] }, // Added a lighter sandy brown
    { name: 'Coral Reef', colors: ['#FF7F50', '#FA8072', '#FFF5EE', '#4682B4'] }, // Added a blue for the ocean around the reef
    { name: 'Midnight Sky', colors: ['#191970', '#4169E1', '#F0F8FF', '#87CEEB'] }, // Added a lighter sky blue
    { name: 'Rose Garden', colors: ['#C21807', '#FF69B4', '#FFE4E1', '#008000'] }, // Added a classic green for leaves
    { name: 'Sage Green', colors: ['#9CAF88', '#87A96B', '#F5F5F5', '#D3D3D3'] }, // Added a light gray for a muted feel
    { name: 'Amber Glow', colors: ['#FFBF00', '#FF8C00', '#FFFACD', '#D4A373'] }, // Added a muted tan
    { name: 'Steel Blue', colors: ['#4682B4', '#6495ED', '#F0F8FF', '#778899'] }, // Added a gray that complements steel blue

    // Flag-Inspired Palettes (keeping fourth color consistent with previous)
    { name: 'Italy', colors: ['#009246', '#FFFFFF', '#CE2B37', '#D3D3D3'] },
    { name: 'France', colors: ['#0055A4', '#FFFFFF', '#EF4135', '#D3D3D3'] },
    { name: 'United Kingdom', colors: ['#012169', '#FFFFFF', '#C8102E', '#D3D3D3'] },
    { name: 'Jamaica', colors: ['#009B3A', '#FED100', '#000000', '#222222'] },
    { name: 'Belgium', colors: ['#000000', '#FED100', '#ED2939', '#FFFFFF'] },
    { name: 'Germany', colors: ['#000000', '#DD0000', '#FFCC00', '#D3D3D3'] },
    { name: 'Colombia', colors: ['#FFCD00', '#003087', '#C8102E', '#FFFFFF'] },
    { name: 'South Korea', colors: ['#CD2E3A', '#0047A0', '#FFFFFF', '#000000'] },
    { name: 'Brazil', colors: ['#009739', '#FEDD00', '#012169', '#FFFFFF'] },
    { name: 'Argentina', colors: ['#74ACDF', '#FFFFFF', '#F6B40E', '#0057A8'] },
    { name: 'Ukraine', colors: ['#0057B7', '#FFD700', '#004494', '#D4A017'] },

    // Popular Coding Themes (keeping fourth color consistent with original themes)
    { name: 'Dracula', colors: ['#282a36', '#8be9fd', '#50fa7b', '#bd93f9'] },
    { name: 'Monokai', colors: ['#272822', '#f92672', '#a6e22e', '#fd971f'] },
    { name: 'Solarized Dark', colors: ['#002b36', '#268bd2', '#2aa198', '#b58900'] },
    { name: 'One Dark', colors: ['#282c34', '#61afef', '#98c379', '#c678dd'] },
    { name: 'Material', colors: ['#263238', '#82aaff', '#c3e88d', '#ff5370'] },
    { name: 'Nord', colors: ['#2e3440', '#5e81ac', '#a3be8c', '#88c0d0'] },
    { name: 'Gruvbox Dark', colors: ['#282828', '#fe8019', '#b8bb26', '#83a598'] },
    { name: 'Atom One Light', colors: ['#fafafa', '#e45649', '#50a14f', '#4078f1'] },

    // University Color Palettes (adding a complementary or neutral accent)
    { name: 'Harvard', colors: ['#a51c30', '#ffffff', '#8c8b8b', '#000000'] }, // Added black
    { name: 'MIT', colors: ['#8a8b8c', '#a31f34', '#000000', '#d7d7d7'] }, // Added a lighter gray
    { name: 'Stanford', colors: ['#8c1515', '#2e2d29', '#ffffff', '#b0b3b6'] }, // Added a lighter gray
    { name: 'Yale', colors: ['#00356b', '#286dc0', '#63aaff', '#add8e6'] }, // Added a very light blue
    { name: 'Princeton', colors: ['#e77500', '#000000', '#ffffff', '#a9a9a9'] }, // Added dark gray
    { name: 'Columbia', colors: ['#c4d8e2', '#b9d3ee', '#1e3a8a', '#002147'] }, // Added a darker blue
    { name: 'Berkeley', colors: ['#002676', '#fdb515', '#ffffff', '#696969'] }, // Added a dark gray
    { name: 'Michigan', colors: ['#00274c', '#ffcb05', '#ffffff', '#a7a7a7'] }, // Added a medium gray
    { name: 'Cornell', colors: ['#b31b1b', '#ffffff', '#222222', '#a9a9a9'] }, // Added dark gray
    { name: 'Northwestern', colors: ['#4e2a84', '#ffffff', '#342f2e', '#808080'] }, // Added gray
    { name: 'Northeastern', colors: ['#cc0000', '#000000', '#ffffff', '#a9a9a9'] }, // Added dark gray
    { name: 'Duke', colors: ['#012169', '#00539B', '#E2E6ED', '#87CEFA'] }, // Added a lighter blue
    { name: 'Notre Dame', colors: ['#0c2340', '#ae9142', '#d39f10', '#b8860b'] },  // Added a darker gold
    { name: 'The Ohio State', colors: ['#ba0c2f', '#a7b1b7', '#ffffff', '#212325'] }  // Scarlet, gray, white, and gray dark
];

// Export for module systems (if needed)
if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
    module.exports = ColorSchemes;
}

// Make available globally
window.ColorSchemes = ColorSchemes;
