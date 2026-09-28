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

import { mobileTokens } from '@workspace/mobile-foundation';

const colors = {
  light: {
    black: mobileTokens.colors.black,
    // Legacy aliases (kept for backward compatibility)
    text: mobileTokens.colors.foreground,
    tint: mobileTokens.colors.primary,

    // Core surfaces
    background: mobileTokens.colors.background,
    foreground: mobileTokens.colors.foreground,

    // Cards / elevated surfaces
    card: mobileTokens.colors.surface,
    cardForeground: mobileTokens.colors.foreground,

    // Primary action color (buttons, links, active states)
    primary: mobileTokens.colors.primary,
    primaryForeground: mobileTokens.colors.primaryForeground,

    // Secondary / less-emphasis interactive surfaces
    secondary: mobileTokens.colors.surfaceSubtle,
    secondaryForeground: '#e5d5d8',

    // Muted / subdued elements (dividers, timestamps, placeholders)
    muted: mobileTokens.colors.surfaceRaised,
    mutedForeground: mobileTokens.colors.mutedForeground,

    // Accent highlights (badges, selected items, focus rings)
    accent: mobileTokens.colors.accent,
    accentForeground: mobileTokens.colors.accentForeground,

    // Destructive actions (delete, error states)
    destructive: mobileTokens.colors.destructive,
    destructiveForeground: mobileTokens.colors.destructiveForeground,

    // Borders and input outlines
    border: mobileTokens.colors.border,
    input: mobileTokens.colors.input,
    surface: mobileTokens.colors.surface,
    surfaceRaised: mobileTokens.colors.surfaceRaised,
    surfaceSubtle: mobileTokens.colors.surfaceSubtle,
    burgundy: mobileTokens.colors.burgundy,
    crimsonDeep: mobileTokens.colors.crimsonDeep,
    rose: mobileTokens.colors.rose,
    divider: mobileTokens.colors.divider,
    success: mobileTokens.colors.success,
    warning: mobileTokens.colors.warning,
  },

  // Border radius (in px). Sync from the sibling web artifact's --radius
  // CSS variable. This value applies to cards, buttons, inputs, and modals.
  radius: mobileTokens.radius.lg,
};

export default colors;
