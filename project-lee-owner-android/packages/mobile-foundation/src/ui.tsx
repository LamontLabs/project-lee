import React from 'react';
import { Image, Pressable, StyleSheet, Text, View, type ImageSourcePropType } from 'react-native';
import type { MobileFreshness } from './index';
import { leeColors, leeRadius, leeSpace, leeTouch, leeType, mobileTokens, type MobilePalette } from './design-tokens';

const palette = mobileTokens.colors;
const freshnessColors: Record<MobileFreshness, string> = {
  live: palette.primary,
  stale: palette.warning,
  unavailable: palette.destructive,
  unverified: palette.mutedForeground,
};

export function FreshnessPill({ freshness }: { freshness: MobileFreshness }) {
  const color = freshnessColors[freshness];
  return (
    <View accessibilityLabel={`Connection ${freshness}`} style={[styles.pill, { borderColor: color, backgroundColor: `${color}16` }]}>
      <View style={[styles.statusIcon, { borderColor: color }]} />
      <Text style={[styles.pillText, { color }]}>{freshness.toUpperCase()}</Text>
    </View>
  );
}

export function MobileStatePill({ label, tone = 'neutral', colors = palette }: {
  label: string;
  tone?: 'neutral' | 'positive' | 'warning' | 'danger';
  colors?: MobilePalette;
}) {
  const toneColor = tone === 'positive' ? colors.success : tone === 'warning' ? colors.warning : tone === 'danger' ? colors.destructive : colors.mutedForeground;
  return <View accessibilityLabel={label} style={[styles.pill, { borderColor: toneColor, backgroundColor: `${toneColor}16` }]}><Text style={[styles.pillText, { color: toneColor }]}>{label}</Text></View>;
}

export function MobileCard({ children, colors = palette, style }: { children: React.ReactNode; colors?: MobilePalette; style?: object }) {
  return <LeeCard colors={colors} style={style}>{children}</LeeCard>;
}

export function MobileButton({ label, onPress, colors = palette, variant = 'primary', disabled = false, testID }: {
  label: string;
  onPress: () => void;
  colors?: MobilePalette;
  variant?: 'primary' | 'secondary' | 'destructive';
  disabled?: boolean;
  testID?: string;
}) {
  const backgroundColor = variant === 'primary' ? colors.primary : variant === 'destructive' ? colors.destructive : colors.surfaceSubtle;
  const foregroundColor = variant === 'secondary' ? colors.foreground : colors.primaryForeground;
  return <LeeButton label={label} onPress={onPress} colors={colors} variant={variant === 'secondary' ? 'subdued' : variant} disabled={disabled} testID={testID} />;
}

export function MobileStatusCard({
  title,
  detail,
  freshness,
  colors = palette,
}: {
  title: string;
  detail: string;
  freshness: MobileFreshness;
  colors?: MobilePalette;
}) {
  return (
    <MobileCard colors={colors}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.foreground }]}>{title}</Text>
        <FreshnessPill freshness={freshness} />
      </View>
      <Text style={[styles.detail, { color: colors.mutedForeground }]}>{detail}</Text>
    </MobileCard>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: leeRadius.card, borderWidth: 1, gap: leeSpace.md, padding: leeSpace.md },
  button: {
    alignItems: 'center',
    borderRadius: leeRadius.control,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: leeTouch.minimum,
    paddingHorizontal: leeSpace.lg,
  },
  buttonText: { fontFamily: 'Inter_700Bold', fontSize: 14 },
  header: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', gap: leeSpace.md },
  title: { flex: 1, fontFamily: 'Inter_700Bold', fontSize: 15 },
  detail: { fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 19 },
  pill: { alignItems: 'center', borderRadius: leeRadius.pill, borderWidth: 1, flexDirection: 'row', gap: 6, minHeight: 30, paddingHorizontal: 10, paddingVertical: 5 },
  statusIcon: { borderRadius: 5, borderWidth: 1.5, height: 9, width: 9 },
  pillText: { fontFamily: 'Inter_700Bold', fontSize: 10, letterSpacing: 0.8 },
});

export function LeeBrandMark({ compact = false, colors = palette, source }: { compact?: boolean; colors?: MobilePalette; source?: ImageSourcePropType }) {
  return (
    <View accessibilityLabel="Project LEE" style={[brandStyles.row, compact && brandStyles.compact]}>
      <View style={[brandStyles.mark, source ? brandStyles.imageMark : null, { borderColor: colors.primary }]}>
        {source ? <Image source={source} resizeMode="contain" style={brandStyles.image} /> : <><View style={[brandStyles.rose, { backgroundColor: colors.primary }]} /><Text style={[brandStyles.markLetter, { color: colors.foreground }]}>L</Text></>}
      </View>
      {!compact ? <Text style={[brandStyles.label, { color: colors.foreground }]}>PROJECT LEE</Text> : null}
    </View>
  );
}

export function LeeDisplayTitle({ children, subtitle, colors = palette }: { children: React.ReactNode; subtitle?: string; colors?: MobilePalette }) {
  return (
    <View style={titleStyles.block}>
      <Text style={[titleStyles.title, { color: colors.foreground }]}>{children}</Text>
      {subtitle ? <Text style={[titleStyles.subtitle, { color: colors.mutedForeground }]}>{subtitle}</Text> : null}
    </View>
  );
}

export function LeeBody({ children, colors = palette, style }: { children: React.ReactNode; colors?: MobilePalette; style?: object }) {
  return <Text style={[titleStyles.body, { color: colors.foreground }, style]}>{children}</Text>;
}

export function LeeMeta({ children, colors = palette, style }: { children: React.ReactNode; colors?: MobilePalette; style?: object }) {
  return <Text style={[titleStyles.meta, { color: colors.mutedForeground }, style]}>{children}</Text>;
}

export function LeeMicroLabel({ children, colors = palette, style }: { children: React.ReactNode; colors?: MobilePalette; style?: object }) {
  return <Text style={[titleStyles.micro, { color: colors.primary }, style]}>{children}</Text>;
}

function RoseCluster({ size, color, opacity, style }: { size: number; color: string; opacity: number; style?: object }) {
  const petal = size * 0.34;
  return (
    <View pointerEvents="none" style={[roseStyles.cluster, { width: size, height: size, opacity }, style]}>
      <View style={[roseStyles.petal, { width: petal, height: petal, borderColor: color, left: size * 0.08, top: size * 0.18, transform: [{ rotate: '-34deg' }] }]} />
      <View style={[roseStyles.petal, { width: petal, height: petal, borderColor: color, right: size * 0.08, top: size * 0.18, transform: [{ rotate: '34deg' }] }]} />
      <View style={[roseStyles.petal, { width: petal, height: petal, borderColor: color, left: size * 0.18, bottom: size * 0.06, transform: [{ rotate: '-12deg' }] }]} />
      <View style={[roseStyles.petal, { width: petal, height: petal, borderColor: color, right: size * 0.18, bottom: size * 0.06, transform: [{ rotate: '12deg' }] }]} />
      <View style={[roseStyles.center, { width: size * 0.27, height: size * 0.27, borderColor: color, backgroundColor: `${color}22`, left: size * 0.365, top: size * 0.365 }]} />
    </View>
  );
}

export function RoseBackdrop({ quiet = false, colors = palette, topSource, bottomSource, backgroundSource }: { quiet?: boolean; colors?: MobilePalette; topSource?: ImageSourcePropType; bottomSource?: ImageSourcePropType; backgroundSource?: ImageSourcePropType }) {
  const opacity = quiet ? 0.18 : 0.34;
  return (
    <View pointerEvents="none" accessibilityElementsHidden style={roseStyles.backdrop}>
      {backgroundSource ? <Image source={backgroundSource} resizeMode="cover" style={[roseStyles.fullImage, { opacity: quiet ? 0.42 : 0.3 }]} /> : null}
      {!backgroundSource && topSource ? <Image source={topSource} resizeMode="cover" style={[roseStyles.topImage, { opacity: quiet ? 0.72 : 1 }]} /> : !backgroundSource ? <RoseCluster size={180} color={colors.primary} opacity={opacity} style={roseStyles.topRight} /> : null}
      {!backgroundSource && bottomSource ? <Image source={bottomSource} resizeMode="cover" style={[roseStyles.bottomImage, { opacity: quiet ? 0.65 : 1 }]} /> : !backgroundSource ? <RoseCluster size={140} color={colors.primary} opacity={opacity * 0.72} style={roseStyles.bottomLeft} /> : null}
      {!backgroundSource && !topSource && !bottomSource ? <RoseCluster size={110} color={colors.primary} opacity={opacity * 0.62} style={roseStyles.bottomRight} /> : null}
    </View>
  );
}

export function LeeLaunchScreen({
  colors = palette,
  backgroundSource,
  brandSource,
  onContinue,
}: {
  colors?: MobilePalette;
  backgroundSource: ImageSourcePropType;
  brandSource: ImageSourcePropType;
  onContinue: () => void;
}) {
  return (
    <View style={[launchStyles.root, { backgroundColor: colors.black ?? colors.background }]}>
      <Image source={backgroundSource} resizeMode="cover" style={launchStyles.background} />
      <View style={launchStyles.content}>
        <Image source={brandSource} resizeMode="contain" style={launchStyles.brand} accessibilityLabel="Project LEE" />
        <Text style={[launchStyles.wordmark, { color: colors.foreground }]}>PROJECT LEE</Text>
        <Text style={[launchStyles.title, { color: colors.foreground }]}>One LEE.{'\n'}One history.</Text>
        <Text style={[launchStyles.subtitle, { color: colors.foreground }]}>Learning and Evolving Environment.{'\n'}A persistent environment for what matters to you.</Text>
        <Pressable accessibilityRole="button" onPress={onContinue} style={({ pressed }) => [launchStyles.button, { backgroundColor: colors.crimsonDeep ?? colors.primary, borderColor: colors.rose ?? colors.primary, opacity: pressed ? 0.82 : 1 }]}>
          <Text style={[launchStyles.buttonText, { color: colors.primaryForeground }]}>Continue</Text>
        </Pressable>
      </View>
      <Text style={[launchStyles.footer, { color: colors.foreground }]}>A brighter life together.</Text>
    </View>
  );
}

export function LeeCard({ children, colors = palette, style }: { children: React.ReactNode; colors?: MobilePalette; style?: object }) {
  return <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.divider ?? colors.border }, style]}>{children}</View>;
}

export function LeeRow({ icon, title, detail, state, chevron = false, colors = palette, onPress, titleNumberOfLines = 1, detailNumberOfLines }: {
  icon?: React.ReactNode;
  title: string;
  detail?: string;
  state?: React.ReactNode;
  chevron?: boolean;
  colors?: MobilePalette;
  onPress?: () => void;
  titleNumberOfLines?: number;
  detailNumberOfLines?: number;
}) {
  const content = (
    <View style={rowStyles.row}>
      {icon ? <View style={[rowStyles.icon, { backgroundColor: colors.burgundy ?? colors.surfaceSubtle }]}>{icon}</View> : null}
      <View style={rowStyles.copy}>
        <Text numberOfLines={titleNumberOfLines} style={[rowStyles.title, { color: colors.foreground }]}>{title}</Text>
        {detail ? <Text numberOfLines={detailNumberOfLines} style={[rowStyles.detail, { color: colors.mutedForeground }]}>{detail}</Text> : null}
      </View>
      {state}
      {chevron ? <Text style={[rowStyles.chevron, { color: colors.foreground }]}>›</Text> : null}
    </View>
  );
  return onPress ? <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.78 : 1 })}>{content}</Pressable> : content;
}

export function LeeButton({ label, onPress, colors = palette, variant = 'primary', disabled = false, testID }: {
  label: string;
  onPress: () => void;
  colors?: MobilePalette;
  variant?: 'primary' | 'outline' | 'subdued' | 'destructive';
  disabled?: boolean;
  testID?: string;
}) {
  const isPrimary = variant === 'primary' || variant === 'destructive';
  const backgroundColor = variant === 'primary' ? colors.primary : variant === 'destructive' ? colors.destructive : variant === 'subdued' ? colors.surfaceSubtle : 'transparent';
  const borderColor = isPrimary ? backgroundColor : colors.primary;
  const foregroundColor = isPrimary ? colors.primaryForeground : colors.foreground;
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled} onPress={onPress} testID={testID} style={({ pressed }) => [styles.button, { backgroundColor, borderColor, opacity: disabled ? 0.42 : pressed ? 0.82 : 1 }]}>
      <Text style={[styles.buttonText, { color: foregroundColor }]}>{label}</Text>
    </Pressable>
  );
}

export function LeeSegmentedControl<T extends string>({ options, value, onChange, colors = palette }: {
  options: Array<{ label: string; value: T }>;
  value: T;
  onChange: (value: T) => void;
  colors?: MobilePalette;
}) {
  return (
    <View accessibilityRole="tablist" style={segmentStyles.container}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable key={option.value} accessibilityRole="tab" accessibilityState={{ selected }} onPress={() => onChange(option.value)} style={({ pressed }) => [segmentStyles.item, { backgroundColor: selected ? colors.primary : 'transparent', borderColor: selected ? colors.rose ?? colors.primary : colors.divider, opacity: pressed ? 0.8 : 1 }]}>
            <Text style={[segmentStyles.label, { color: selected ? colors.primaryForeground : colors.foreground }]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function LeeStatusPill({ label, tone = 'neutral', colors = palette }: { label: string; tone?: 'neutral' | 'positive' | 'warning' | 'danger'; colors?: MobilePalette }) {
  return <MobileStatePill label={label} tone={tone} colors={colors} />;
}

export function LeeSheet({ visible, title, children, onClose, colors = palette }: {
  visible: boolean;
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  colors?: MobilePalette;
}) {
  if (!visible) return null;
  return (
    <View style={sheetStyles.overlay}>
      <Pressable accessibilityRole="button" accessibilityLabel="Close sheet" onPress={onClose} style={sheetStyles.scrim} />
      <View style={[sheetStyles.sheet, { backgroundColor: colors.surfaceRaised, borderColor: colors.divider }]}>
        <View style={[sheetStyles.handle, { backgroundColor: colors.mutedForeground }]} />
        <View style={sheetStyles.header}><Text style={[sheetStyles.title, { color: colors.foreground }]}>{title}</Text><Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={onClose}><Text style={[sheetStyles.close, { color: colors.foreground }]}>×</Text></Pressable></View>
        {children}
      </View>
    </View>
  );
}

export type LeeBottomNavState = { index: number; routes: Array<{ key: string; name: string }> };
export type LeeBottomNavProps = {
  state: LeeBottomNavState;
  navigation: { navigate: (name: string) => void };
  colors?: MobilePalette;
  bottomInset?: number;
  renderIcon?: (name: string, color: string, size: number) => React.ReactNode;
  items?: Array<{ route: string; label: string; icon: string }>;
};

const defaultNavItems = [
  { route: 'ask', label: 'Ask', icon: 'message-circle' },
  { route: 'capture', label: 'Capture', icon: 'camera' },
  { route: 'index', label: 'Today', icon: 'sun' },
  { route: 'approvals', label: 'Approvals', icon: 'check-square' },
  { route: 'more', label: 'More', icon: 'more-horizontal' },
];

export function LeeBottomNav({ state, navigation, colors = palette, bottomInset = 0, renderIcon, items = defaultNavItems }: LeeBottomNavProps) {
  const activeRoute = state.routes[state.index]?.name;
  return (
    <View style={[navStyles.bar, { backgroundColor: colors.black ?? colors.background, paddingBottom: Math.max(bottomInset, 8) }]}>
      <View style={[navStyles.pill, { borderColor: colors.divider, backgroundColor: colors.black ?? colors.background }]}>
        {items.map((item) => {
          const active = item.route === activeRoute;
          return (
            <Pressable key={item.route} accessibilityRole="tab" accessibilityState={{ selected: active }} onPress={() => navigation.navigate(item.route)} style={navStyles.item}>
              <View style={[navStyles.iconWrap, item.route === 'index' && navStyles.today, { backgroundColor: item.route === 'index' ? colors.primary : active ? colors.burgundy ?? colors.surfaceSubtle : 'transparent', borderColor: item.route === 'index' ? colors.rose ?? colors.primary : 'transparent' }]}>
                {renderIcon ? renderIcon(item.icon, item.route === 'index' ? colors.primaryForeground : active ? colors.primary : colors.foreground, item.route === 'index' ? 24 : 20) : <Text style={{ color: item.route === 'index' ? colors.primaryForeground : colors.foreground }}>•</Text>}
              </View>
              <Text style={[navStyles.label, { color: active || item.route === 'index' ? colors.foreground : colors.mutedForeground }]}>{item.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const brandStyles = StyleSheet.create({
  row: { alignItems: 'flex-start', flexDirection: 'column', gap: 4 },
  compact: { gap: 0 },
  mark: { alignItems: 'center', borderRadius: 26, borderWidth: 1, height: 52, justifyContent: 'center', overflow: 'hidden', width: 52 },
  imageMark: { borderRadius: 0, borderWidth: 0, height: 60, width: 76 },
  image: { height: 60, width: 76 },
  markLetter: { fontFamily: 'CormorantGaramond_600SemiBold', fontSize: 41, lineHeight: 46, marginTop: 2 },
  rose: { borderRadius: 8, height: 9, position: 'absolute', right: 9, top: 8, transform: [{ rotate: '45deg' }], width: 9 },
  label: { fontFamily: 'Inter_600SemiBold', fontSize: 10, letterSpacing: 3.2 },
});

const titleStyles = StyleSheet.create({
  block: { gap: leeSpace.sm },
  title: { fontFamily: 'CormorantGaramond_600SemiBold', fontSize: leeType.titleSize, letterSpacing: -0.25, lineHeight: 44 },
  subtitle: { fontFamily: 'Inter_400Regular', fontSize: leeType.bodySize, lineHeight: 22 },
  body: { fontFamily: 'Inter_400Regular', fontSize: leeType.bodySize, lineHeight: 23 },
  meta: { fontFamily: 'Inter_500Medium', fontSize: leeType.metaSize, lineHeight: 20 },
  micro: { fontFamily: 'Inter_700Bold', fontSize: leeType.microSize, letterSpacing: 1.4, textTransform: 'uppercase' },
});

const roseStyles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, overflow: 'hidden' },
  fullImage: { ...StyleSheet.absoluteFillObject, height: '100%', width: '100%' },
  cluster: { position: 'absolute' },
  topImage: { height: 110, position: 'absolute', right: -35, top: 52, width: 120 },
  bottomImage: { bottom: 4, height: 86, left: -8, position: 'absolute', width: 190 },
  petal: { borderRadius: 999, borderWidth: 2, position: 'absolute' },
  center: { borderRadius: 999, borderWidth: 2, position: 'absolute' },
  topRight: { right: -18, top: 32, transform: [{ rotate: '18deg' }] },
  bottomLeft: { bottom: 78, left: -32, transform: [{ rotate: '-12deg' }] },
  bottomRight: { bottom: 58, right: -8, transform: [{ rotate: '20deg' }] },
  scrim: { ...StyleSheet.absoluteFillObject },
});

const launchStyles = StyleSheet.create({
  root: { flex: 1, overflow: 'hidden' },
  background: { ...StyleSheet.absoluteFillObject, height: '100%', width: '100%' },
  content: { alignItems: 'center', flex: 1, justifyContent: 'center', paddingHorizontal: 28, paddingTop: 10 },
  brand: { height: 130, marginBottom: 4, width: 165 },
  wordmark: { fontFamily: 'Inter_600SemiBold', fontSize: 12, letterSpacing: 5.2, marginBottom: 38 },
  title: { fontFamily: 'CormorantGaramond_600SemiBold', fontSize: 49, lineHeight: 48, textAlign: 'center' },
  subtitle: { fontFamily: 'Inter_400Regular', fontSize: 16, lineHeight: 24, marginTop: 22, textAlign: 'center' },
  button: { alignItems: 'center', borderRadius: 999, borderWidth: 1, marginTop: 42, minHeight: 60, paddingHorizontal: 58, justifyContent: 'center', width: '82%' },
  buttonText: { fontFamily: 'Inter_500Medium', fontSize: 19 },
  footer: { bottom: 32, fontFamily: 'CormorantGaramond_400Regular', fontSize: 15, letterSpacing: 0.5, position: 'absolute', textAlign: 'center', width: '100%' },
});

const rowStyles = StyleSheet.create({
  row: { alignItems: 'center', flexDirection: 'row', gap: 12, minHeight: leeTouch.minimum },
  icon: { alignItems: 'center', borderRadius: 24, height: 46, justifyContent: 'center', width: 46 },
  copy: { flex: 1, gap: 2 },
  title: { fontFamily: 'CormorantGaramond_600SemiBold', fontSize: 21, lineHeight: 24 },
  detail: { fontFamily: 'Inter_400Regular', fontSize: 14, lineHeight: 20 },
  chevron: { fontFamily: 'Inter_400Regular', fontSize: 30, lineHeight: 30 },
});

const segmentStyles = StyleSheet.create({
  container: { flexDirection: 'row', gap: 8 },
  item: { alignItems: 'center', borderRadius: leeRadius.pill, borderWidth: 1, flex: 1, justifyContent: 'center', minHeight: 42, paddingHorizontal: 12 },
  label: { fontFamily: 'Inter_500Medium', fontSize: 15 },
});

const sheetStyles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'flex-end', zIndex: 10 },
  scrim: { ...StyleSheet.absoluteFillObject, backgroundColor: '#000000AA' },
  sheet: { borderRadius: leeRadius.sheet, borderBottomLeftRadius: 0, borderBottomRightRadius: 0, borderWidth: 1, gap: 16, padding: leeSpace.lg, paddingBottom: leeSpace.xxl },
  handle: { alignSelf: 'center', borderRadius: 3, height: 4, opacity: 0.6, width: 44 },
  header: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  title: { fontFamily: 'CormorantGaramond_600SemiBold', fontSize: 28 },
  close: { fontFamily: 'Inter_400Regular', fontSize: 30, lineHeight: 30 },
});

const navStyles = StyleSheet.create({
  bar: { alignItems: 'center', flexDirection: 'row', height: leeTouch.nav + 6, justifyContent: 'center', paddingHorizontal: 14, paddingTop: 8 },
  pill: { alignItems: 'flex-end', borderRadius: 24, borderWidth: 1, flex: 1, flexDirection: 'row', height: 68, justifyContent: 'space-around', paddingHorizontal: 4 },
  item: { alignItems: 'center', flex: 1, gap: 4, minHeight: 60, justifyContent: 'flex-end' },
  iconWrap: { alignItems: 'center', borderRadius: 20, borderWidth: 1, height: 36, justifyContent: 'center', width: 44 },
  today: { borderRadius: leeTouch.todayDiameter / 2, height: 58, marginBottom: 5, width: 58 },
  label: { fontFamily: 'Inter_500Medium', fontSize: 10.5 },
});