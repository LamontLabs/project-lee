/**
 * Semantic design tokens for the mobile app.
 *
 * These tokens mirror the naming conventions used in web artifacts (index.css)
 * so that multi-artifact projects share a cohesive visual identity.
 *
 * Replace the placeholder values below with values that match the project's
 * brand. If a sibling web artifact exists, read its index.css and convert the
 * HSL values to hex so both artifacts use the same palette.
 *
 * To add dark mode, add a `dark` key with the same token names.
 * The useColors() hook will automatically pick it up.
 */

const colors = {
  light: {
    // Legacy aliases (kept for backward compatibility)
    text: '#f5f1f2',
    tint: '#ff3157',

    // Core surfaces
    background: '#0a0809',
    foreground: '#f5f1f2',

    // Cards / elevated surfaces
    card: '#151012',
    cardForeground: '#f5f1f2',

    // Primary action color (buttons, links, active states)
    primary: '#ff3157',
    primaryForeground: '#ffffff',

    // Secondary / less-emphasis interactive surfaces
    secondary: '#241416',
    secondaryForeground: '#e5d5d8',

    // Muted / subdued elements (dividers, timestamps, placeholders)
    muted: '#1d1214',
    mutedForeground: '#a98d93',

    // Accent highlights (badges, selected items, focus rings)
    accent: '#4a1822',
    accentForeground: '#ffd9df',

    // Destructive actions (delete, error states)
    destructive: '#ff6b78',
    destructiveForeground: '#ffffff',

    // Borders and input outlines
    border: '#402027',
    input: '#4d252e',
  },

  // Border radius (in px). Sync from the sibling web artifact's --radius
  // CSS variable. This value applies to cards, buttons, inputs, and modals.
  radius: 8,
};

export default colors;
