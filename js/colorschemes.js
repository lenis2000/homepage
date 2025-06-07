/**
 * Color Schemes for Simulations
 * 
 * This file contains various color palettes used across different simulations.
 * Each color scheme contains a name and an array of colors.
 * 
 * Currently used by:
 * - _simulations/lozenge_tilings/2025-06-02-q-vol-Gorin.md
 */

const ColorSchemes = [
    { name: 'UVA', colors: ['#E57200', '#232D4B', '#F9DCBF'] },
    { name: 'No Colors', colors: ['#FFFFFF', '#FFFFFF', '#FFFFFF'] },
    { name: 'Ocean Breeze', colors: ['#2E86AB', '#A23B72', '#F18F01'] },
    { name: 'Forest Calm', colors: ['#355E3B', '#8FBC8F', '#F5F5DC'] },
    { name: 'Sunset Glow', colors: ['#FF6B35', '#F7931E', '#FFE66D'] },
    { name: 'Royal Purple', colors: ['#6A0572', '#AB83A1', '#F4C2C2'] },
    { name: 'Arctic Frost', colors: ['#4F8A8B', '#2F4858', '#E8F4F8'] },
    { name: 'Cherry Blossom', colors: ['#D1477A', '#8B6F47', '#F7E7CE'] },
    { name: 'Tropical', colors: ['#FF6B9D', '#C44569', '#F8B500'] },
    { name: 'Emerald Dream', colors: ['#50C878', '#2E8B57', '#F0FFF0'] },
    { name: 'Cosmic Blue', colors: ['#1B263B', '#415A77', '#E0E1DD'] },
    { name: 'Autumn Leaves', colors: ['#D2691E', '#8B4513', '#FFF8DC'] },
    { name: 'Lavender Fields', colors: ['#8A2BE2', '#DDA0DD', '#F8F8FF'] },
    { name: 'Desert Sand', colors: ['#CD853F', '#A0522D', '#FDF5E6'] },
    { name: 'Coral Reef', colors: ['#FF7F50', '#FA8072', '#FFF5EE'] },
    { name: 'Midnight Sky', colors: ['#191970', '#4169E1', '#F0F8FF'] },
    { name: 'Rose Garden', colors: ['#C21807', '#FF69B4', '#FFE4E1'] },
    { name: 'Sage Green', colors: ['#9CAF88', '#87A96B', '#F5F5F5'] },
    { name: 'Amber Glow', colors: ['#FFBF00', '#FF8C00', '#FFFACD'] },
    { name: 'Steel Blue', colors: ['#4682B4', '#6495ED', '#F0F8FF'] },
    
    // Flag-Inspired Palettes
    { name: 'Italy', colors: ['#009246', '#FFFFFF', '#CE2B37'] },
    { name: 'France', colors: ['#0055A4', '#FFFFFF', '#EF4135'] },
    { name: 'United Kingdom', colors: ['#012169', '#FFFFFF', '#C8102E'] },
    { name: 'Jamaica', colors: ['#009B3A', '#FED100', '#000000'] },
    { name: 'Belgium', colors: ['#000000', '#FED100', '#ED2939'] },
    { name: 'Colombia', colors: ['#FFCD00', '#003087', '#C8102E'] },
    { name: 'South Korea', colors: ['#CD2E3A', '#0047A0', '#FFFFFF', '#000000'] },
    { name: 'Brazil', colors: ['#009739', '#FEDD00', '#012169'] },
    { name: 'Argentina', colors: ['#74ACDF', '#FFFFFF', '#F6B40E'] },
    
    // Popular Coding Themes
    { name: 'Dracula', colors: ['#282a36', '#8be9fd', '#50fa7b'] },
    { name: 'Monokai', colors: ['#272822', '#f92672', '#a6e22e'] },
    { name: 'Solarized Dark', colors: ['#002b36', '#268bd2', '#2aa198'] },
    { name: 'One Dark', colors: ['#282c34', '#61afef', '#98c379'] },
    { name: 'Material', colors: ['#263238', '#82aaff', '#c3e88d'] },
    { name: 'Nord', colors: ['#2e3440', '#5e81ac', '#a3be8c'] },
    { name: 'Gruvbox Dark', colors: ['#282828', '#fe8019', '#b8bb26'] },
    { name: 'Atom One Light', colors: ['#fafafa', '#e45649', '#50a14f'] },
    
    // University Color Palettes
    { name: 'Harvard', colors: ['#a51c30', '#ffffff', '#8c8b8b'] },
    { name: 'MIT', colors: ['#8a8b8c', '#a31f34', '#000000'] },
    { name: 'Stanford', colors: ['#8c1515', '#2e2d29', '#ffffff'] },
    { name: 'Yale', colors: ['#00356b', '#286dc0', '#63aaff'] },
    { name: 'Princeton', colors: ['#e77500', '#000000', '#ffffff'] },
    { name: 'Columbia', colors: ['#c4d8e2', '#b9d3ee', '#1e3a8a'] },
    { name: 'Berkeley', colors: ['#002676', '#fdb515', '#ffffff'] },
    { name: 'Michigan', colors: ['#00274c', '#ffcb05', '#ffffff'] },
    { name: 'Cornell', colors: ['#b31b1b', '#ffffff', '#222222'] },
    { name: 'Northwestern', colors: ['#4e2a84', '#ffffff', '#342f2e'] },
    { name: 'Northeastern', colors: ['#cc0000', '#000000', '#ffffff'] },
    { name: 'Duke', colors: ['#012169', '#00539B', '#E2E6ED'] }
];

// Export for module systems (if needed)
if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
    module.exports = ColorSchemes;
}

// Make available globally
window.ColorSchemes = ColorSchemes;