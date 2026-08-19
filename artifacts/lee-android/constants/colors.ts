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
    text: '#f3f7f4',
    tint: '#b5f36a',

    // Core surfaces
    background: '#0d1110',
    foreground: '#f3f7f4',

    // Cards / elevated surfaces
    card: '#151c19',
    cardForeground: '#f3f7f4',

    // Primary action color (buttons, links, active states)
    primary: '#b5f36a',
    primaryForeground: '#0d1110',

    // Secondary / less-emphasis interactive surfaces
    secondary: '#202a25',
    secondaryForeground: '#d7e3da',

    // Muted / subdued elements (dividers, timestamps, placeholders)
    muted: '#1b2420',
    mutedForeground: '#8fa197',

    // Accent highlights (badges, selected items, focus rings)
    accent: '#27361f',
    accentForeground: '#d9ffa9',

    // Destructive actions (delete, error states)
    destructive: '#ef6a62',
    destructiveForeground: '#ffffff',

    // Borders and input outlines
    border: '#29352f',
    input: '#233029',
  },

  // Border radius (in px). Sync from the sibling web artifact's --radius
  // CSS variable. This value applies to cards, buttons, inputs, and modals.
  radius: 8,
};

export default colors;
