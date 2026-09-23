import React from "react";
import { createRequire } from "node:module";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const require = createRequire(import.meta.url);
const NodeModule = require("node:module");
const moduleMocks = new Map();
let moduleLoaderInstalled = false;

function registerModuleMock(name, value) {
  moduleMocks.set(name, value);
}

function installModuleLoader() {
  if (moduleLoaderInstalled) return;
  const originalLoad = NodeModule._load;
  NodeModule._load = function load(request, parent, isMain) {
    if (moduleMocks.has(request)) return moduleMocks.get(request);
    if (/\.(png|jpe?g)$/i.test(request)) return { uri: request };
    if (request.startsWith("@/")) {
      if (request.endsWith("/UncertaintyNotice")) {
        return {
          highestUncertainty: () => null,
          UncertaintyNotice: () => null,
        };
      }
      return {};
    }
    return originalLoad.call(this, request, parent, isMain);
  };
  NodeModule._extensions[".png"] = function loadPng(module, filename) {
    module.exports = { uri: filename };
  };
  NodeModule._extensions[".jpg"] = NodeModule._extensions[".png"];
  moduleLoaderInstalled = true;
}

export const palette = {
  background: "#120D10",
  foreground: "#F8F1F3",
  primary: "#D64B5E",
  primaryForeground: "#FFFFFF",
  mutedForeground: "#B9A8AE",
  card: "#21171C",
  surface: "#21171C",
  surfaceRaised: "#2B1D24",
  surfaceSubtle: "#30232A",
  secondary: "#30232A",
  accent: "#8E6B76",
  accentForeground: "#FFFFFF",
  border: "#6B4C57",
  divider: "#49343D",
  burgundy: "#4A2630",
  rose: "#E56B7A",
  warning: "#E0A34D",
  destructive: "#D9555F",
  destructiveForeground: "#FFFFFF",
  success: "#65C48A",
  black: "#0C090B",
};

function host(name) {
  return function Host({ children, ...props }) {
    return React.createElement(name, props, children);
  };
}

export function installNativeMocks() {
  installModuleLoader();
  const View = host("View");
  const Text = host("Text");
  const Pressable = host("Pressable");
  const TextInput = ({ placeholder, children, ...props }) => React.createElement("TextInput", props, children ?? placeholder);
  const Image = host("Image");
  const ScrollView = host("ScrollView");
  const ActivityIndicator = host("ActivityIndicator");
  const RefreshControl = host("RefreshControl");

  registerModuleMock("react-native", {
    ActivityIndicator,
    Alert: { alert() {} },
    AppState: { addEventListener: () => ({ remove() {} }) },
    FlatList: ScrollView,
    Image,
    Keyboard: { dismiss() {} },
    KeyboardAvoidingView: ScrollView,
    Platform: { OS: "web", select: (values) => values.web ?? values.default },
    Pressable,
    RefreshControl,
    ScrollView,
    StyleSheet: {
      absoluteFillObject: {},
      create: (styles) => styles,
      flatten: (styles) => styles,
    },
    Text,
    TextInput,
    View,
    useColorScheme: () => "light",
    useWindowDimensions: () => ({ width: 400, height: 720, scale: 1, fontScale: 1 }),
  });
  registerModuleMock("react-native-safe-area-context", {
    useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
    SafeAreaProvider: ({ children }) => children,
  });
  registerModuleMock("react-native-keyboard-controller", {
    KeyboardAwareScrollView: ScrollView,
    KeyboardProvider: ({ children }) => children,
    KeyboardAvoidingView: ScrollView,
  });
  registerModuleMock("expo-secure-store", {
    getItemAsync: async () => null,
    setItemAsync: async () => undefined,
    deleteItemAsync: async () => undefined,
  });
  registerModuleMock("@expo/vector-icons", { Feather: host("Feather") });
  registerModuleMock("expo-image-picker", {
    requestMediaLibraryPermissionsAsync: async () => ({ granted: false }),
    launchImageLibraryAsync: async () => ({ canceled: true, assets: [] }),
  });
  registerModuleMock("expo-document-picker", {
    getDocumentAsync: async () => ({ canceled: true, assets: [] }),
  });
  registerModuleMock("expo-audio", {
    RecordingPresets: { HIGH_QUALITY: {} },
    requestRecordingPermissionsAsync: async () => ({ granted: false }),
    setAudioModeAsync: async () => undefined,
    useAudioRecorder: () => ({ isRecording: false, record() {}, stop: async () => undefined, uri: null }),
  });
  registerModuleMock("expo-file-system/legacy", {
    documentDirectory: "file:///tmp/",
    copyAsync: async () => undefined,
    getInfoAsync: async () => ({ exists: false }),
  });
  registerModuleMock("expo-blur", { BlurView: host("BlurView") });
  const routerCalls = [];
  const router = {
    push: (route) => routerCalls.push(route),
    replace: (route) => routerCalls.push(route),
    calls: routerCalls,
  };
  const Tabs = ({ children, tabBar }) => {
    const screens = React.Children.toArray(children);
    const routes = screens
      .map((screen) => screen?.props?.name)
      .filter(Boolean)
      .map((name) => ({ key: name, name }));
    const navigation = { emit() {}, navigate() {} };
    return React.createElement("View", null, tabBar?.({ state: { index: 0, routes }, navigation }), children);
  };
  Tabs.Screen = () => null;
  registerModuleMock("expo-router", { Tabs, router, useLocalSearchParams: () => ({}) });
  registerModuleMock("@workspace/mobile-foundation", createFoundationMock());
  return router;
}

export function installOwnerVisualMocks(_mock, context) {
  registerModuleMock("@/hooks/useColors", { useColors: () => palette });
  registerModuleMock("@/context/LeeContext", { useLee: () => context });
  registerModuleMock("@/components/Screen", {
    Card: ({ children }) => React.createElement("Card", null, children),
    Eyebrow: ({ children }) => React.createElement("Text", null, children),
    PageBrand: () => React.createElement("Text", null, "PROJECT LEE"),
    Screen: ({ children }) => React.createElement("Screen", null, children),
    SectionLabel: ({ children }) => React.createElement("Text", null, children),
    Title: ({ children, subtitle }) => React.createElement("Title", null, children, subtitle ? React.createElement("Text", null, subtitle) : null),
  });
}

export function installFamilyVisualMocks(_mock, context) {
  registerModuleMock("@/hooks/useColors", { useColors: () => palette });
  registerModuleMock("@/context/FamilyContext", { useFamily: () => context });
  registerModuleMock("@/components/KeyboardAwareScrollViewCompat", {
    KeyboardAwareScrollViewCompat: ({ children, ...props }) => React.createElement("ScrollView", props, children),
  });
}

function createFoundationMock() {
  const wrap = (name) => ({ children, ...props }) => React.createElement(name, props, children);
  const LeeSheet = ({ title, visible, onClose, children }) => visible
    ? React.createElement("LeeSheet", null,
        React.createElement("Text", null, title),
        React.createElement("Pressable", { onPress: onClose }, React.createElement("Text", null, "Close")),
        children)
    : null;
  const LeeRow = ({ title, detail, state, onPress }) => React.createElement(
    onPress ? "Pressable" : "View",
    onPress ? { onPress } : null,
    React.createElement("Text", null, title),
    React.createElement("Text", null, detail),
    state,
  );
  const MobileButton = ({ label, onPress, disabled = false }) => React.createElement(
    "Pressable",
    { onPress, disabled, accessibilityState: { disabled } },
    React.createElement("Text", null, label),
  );
  return {
    LeeBrandMark: ({ children }) => React.createElement("LeeBrandMark", null, children),
    LeeBody: wrap("Text"),
    LeeCard: wrap("LeeCard"),
    LeeBottomNav: ({ navigation, items }) => React.createElement("View", null, (items ?? [
      { route: "index", label: "Today" },
      { route: "ask", label: "Ask" },
      { route: "capture", label: "Capture" },
      { route: "approvals", label: "Approvals" },
      { route: "more", label: "More" },
    ]).map((item) => React.createElement(
      "Pressable",
      { key: item.route, onPress: () => navigation.navigate(item.route) },
      React.createElement("Text", null, item.label),
    ))),
    LeeMeta: wrap("Text"),
    LeeDisplayTitle: ({ children }) => React.createElement("LeeDisplayTitle", null, children),
    LeeRow,
    LeeSheet,
    LeeSegmentedControl: ({ options, value, onChange }) => React.createElement(
      "View",
      null,
      options?.map((option) => React.createElement("Pressable", { key: option.value, onPress: () => onChange(option.value) }, React.createElement("Text", null, option.label))),
      React.createElement("Text", null, value),
    ),
    LeeStatusPill: ({ label }) => React.createElement("Text", null, label),
    MobileStatePill: ({ label }) => React.createElement("Text", null, label),
    LeeLaunchScreen: ({ onContinue }) => React.createElement(
      "View",
      null,
      React.createElement("Text", null, "Keep Lee close."),
      React.createElement("Pressable", { onPress: onContinue }, React.createElement("Text", null, "Continue")),
    ),
    MobileButton,
    MobileStatusCard: ({ title, detail, freshness }) => React.createElement("View", null, React.createElement("Text", null, title), React.createElement("Text", null, detail), React.createElement("Text", null, freshness)),
    FreshnessPill: ({ freshness }) => React.createElement("Text", null, freshness),
    RoseBackdrop: wrap("View"),
    createClientManifest: () => ({ clientName: "Project LEE Android", clientVersion: "1.0.0", capabilities: ["read"], privacyScopes: ["owner-private"] }),
    getOrCreateDeviceMetadata: async () => ({ deviceId: "rendered-test-device", registeredAt: "2026-01-01T00:00:00.000Z", clientType: "owner" }),
    mobileTokens: { radius: { md: 12, sm: 8, pill: 999 }, touchTarget: 44, spacing: { lg: 16 } },
  };
}

export function containsText(node, expected) {
  if (!node) return false;
  if (node.type === "Text" && node.children?.some((child) => typeof child === "string" && child.includes(expected))) return true;
  return node.children?.some((child) => typeof child !== "string" && containsText(child, expected)) ?? false;
}

export function findPressable(tree, expected) {
  return tree.root.findAll((node) =>
    node.type === "Pressable" && typeof node.props.onPress === "function" && containsText(node, expected),
  )[0];
}

export function findText(tree, expected) {
  return tree.root.findAll((node) => {
    function hasText(value) {
      if (typeof value === "string") return value.includes(expected);
      return value?.children?.some(hasText) ?? false;
    }
    return hasText(node);
  })[0];
}

export async function press(tree, expected) {
  const target = findPressable(tree, expected);
  if (!target) throw new Error(`Rendered Pressable containing ${JSON.stringify(expected)} was not found.`);
  await target.props.onPress();
}

export function assertAccessibleDisabled(tree, expected) {
  const target = findPressable(tree, expected);
  if (!target) throw new Error(`Disabled Pressable containing ${JSON.stringify(expected)} was not found.`);
  if (target.props.accessibilityState?.disabled !== true) {
    throw new Error(`${JSON.stringify(expected)} should expose accessibilityState.disabled=true.`);
  }
}

export async function renderScreen(component, renderer) {
  let tree;
  await renderer.act(async () => {
    tree = renderer.create(React.createElement(component));
    await Promise.resolve();
  });
  return tree;
}