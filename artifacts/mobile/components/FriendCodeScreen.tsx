import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import QRCode from "react-native-qrcode-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Avatar from "@/components/Avatar";
import MyCodeCardPattern from "@/components/MyCodeCardPattern";
import { useAuth } from "@/context/AuthContext";
import { useData } from "@/context/DataContext";
import {
  ensureFriendCode,
  regenerateFriendCode,
} from "@/services/firestoreStore";
import {
  buildFriendInviteDisplayUrl,
  buildFriendInvitePayload,
  parseFriendCodeFromScan,
} from "@/utils/friendCode";

type TabMode = "scan" | "mycode";

type ScanCameraComponent = React.ComponentType<{
  bottomInset: number;
  onScanned: (data: string) => void;
  pasteSlot?: React.ReactNode;
}>;

const DARK_BG = "#0d0d0d";
const CARD_GRADIENT = ["#0f5c4f", "#168f7a", "#1cc29f", "#24c9a0"] as const;
const ROW_BG = "#1c1c1e";
const LINK_COLOR = "#1cc29f";
const CHANGE_CODE_COLOR = "#e07a5f";

export default function FriendCodeScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { sendFriendReqByCode } = useData();

  const [tab, setTab] = useState<TabMode>("mycode");
  const [friendCode, setFriendCode] = useState<string | null>(user?.friendCode ?? null);
  const [loadingCode, setLoadingCode] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [pasteCode, setPasteCode] = useState("");
  const [ScanCamera, setScanCamera] = useState<ScanCameraComponent | null>(null);
  const [cameraLoadError, setCameraLoadError] = useState(false);
  const scanLock = useRef(false);

  const invitePayload = friendCode ? buildFriendInvitePayload(friendCode) : "";
  const displayUrl = friendCode ? buildFriendInviteDisplayUrl(friendCode) : "";

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      setLoadingCode(true);
      try {
        const code = await ensureFriendCode(user.id);
        if (!cancelled) setFriendCode(code);
      } catch (err) {
        console.error(err);
      } finally {
        if (!cancelled) setLoadingCode(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  useEffect(() => {
    if (tab !== "scan" || Platform.OS === "web") return;
    let cancelled = false;
    import("@/components/FriendScanCamera")
      .then((mod) => {
        if (!cancelled) {
          setScanCamera(() => mod.default);
          setCameraLoadError(false);
        }
      })
      .catch((err) => {
        console.error("Failed to load camera module:", err);
        if (!cancelled) setCameraLoadError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [tab]);

  const processScannedCode = useCallback(
    async (raw: string) => {
      if (scanLock.current || !user) return;
      const code = parseFriendCodeFromScan(raw);
      if (!code) return;

      scanLock.current = true;
      try {
        const res = await sendFriendReqByCode(code);
        if (res.success) {
          Alert.alert("Success", res.message, [
            { text: "OK", onPress: () => router.back() },
          ]);
        } else {
          Alert.alert("Could not add friend", res.message);
          setTimeout(() => {
            scanLock.current = false;
          }, 2000);
        }
      } catch (err) {
        console.error(err);
        Alert.alert("Error", "Something went wrong. Please try again.");
        scanLock.current = false;
      }
    },
    [sendFriendReqByCode, user]
  );

  async function handlePasteSubmit() {
    await processScannedCode(pasteCode.trim());
  }

  async function handleShare() {
    if (!invitePayload) return;
    const message = `Add me on Expense Splitter: ${displayUrl}`;
    try {
      await Share.share({ message, url: invitePayload });
    } catch {
      await Clipboard.setStringAsync(displayUrl);
      Alert.alert("Copied", "Invite link copied to clipboard.");
    }
  }

  async function handleCopy() {
    if (!displayUrl) return;
    await Clipboard.setStringAsync(displayUrl);
    Alert.alert("Copied", "Friend link copied to clipboard.");
  }

  function handleChangeCode() {
    Alert.alert(
      "Change code?",
      "Your old QR code and link will stop working. Anyone who saved your old code will need the new one.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Change code",
          style: "destructive",
          onPress: async () => {
            if (!user) return;
            setRegenerating(true);
            try {
              const code = await regenerateFriendCode(user.id);
              setFriendCode(code);
              Alert.alert("Done", "Your friend code has been updated.");
            } catch (err) {
              console.error(err);
              Alert.alert("Error", "Could not update your code. Try again.");
            } finally {
              setRegenerating(false);
            }
          },
        },
      ]
    );
  }

  function renderPasteFallback() {
    return (
      <View style={styles.pasteBlock}>
        <Text style={styles.pasteLabel}>Or paste invite link / code</Text>
        <TextInput
          style={styles.pasteInput}
          placeholder="Paste link or code"
          placeholderTextColor="#888"
          value={pasteCode}
          onChangeText={setPasteCode}
          autoCapitalize="none"
        />
        <TouchableOpacity style={styles.permissionBtn} onPress={handlePasteSubmit}>
          <Text style={styles.permissionBtnText}>Add friend</Text>
        </TouchableOpacity>
      </View>
    );
  }

  function renderSegmented() {
    return (
      <View style={styles.segmentWrap}>
        <TouchableOpacity
          style={[styles.segmentBtn, tab === "scan" && styles.segmentBtnActive]}
          onPress={() => setTab("scan")}
          activeOpacity={0.85}
        >
          <Text
            style={[styles.segmentText, tab === "scan" && styles.segmentTextActive]}
            numberOfLines={1}
          >
            Scan
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.segmentBtn, tab === "mycode" && styles.segmentBtnActive]}
          onPress={() => setTab("mycode")}
          activeOpacity={0.85}
        >
          <Text
            style={[styles.segmentText, tab === "mycode" && styles.segmentTextActive]}
            numberOfLines={1}
          >
            My code
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  function renderScanTab() {
    if (Platform.OS === "web") {
      return (
        <View style={styles.scanCenter}>
          <Ionicons name="qr-code-outline" size={64} color="#666" />
          <Text style={styles.permissionText}>
            Camera scanning works on the Expo Go app. Paste a friend&apos;s invite link or code below.
          </Text>
          {renderPasteFallback()}
        </View>
      );
    }

    if (cameraLoadError) {
      return (
        <View style={styles.scanCenter}>
          <Text style={styles.permissionText}>
            Camera could not start. Paste your friend&apos;s invite link or code instead.
          </Text>
          {renderPasteFallback()}
        </View>
      );
    }

    if (!ScanCamera) {
      return (
        <View style={styles.scanCenter}>
          <ActivityIndicator size="large" color="#1cc29f" />
          <Text style={styles.permissionText}>Opening camera…</Text>
        </View>
      );
    }

    return (
      <ScanCamera
        bottomInset={insets.bottom}
        onScanned={processScannedCode}
        pasteSlot={renderPasteFallback()}
      />
    );
  }

  function renderMyCodeTab() {
    const displayName = user?.name ?? "User";

    return (
      <ScrollView
        style={styles.myCodeFlex}
        contentContainerStyle={[
          styles.myCodeScroll,
          { paddingBottom: insets.bottom + 32 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.profileStack}>
          <View style={styles.avatarFloat}>
            <View style={styles.avatarRing}>
              <Avatar name={displayName} size={76} />
            </View>
          </View>

          <LinearGradient
            colors={[...CARD_GRADIENT]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.profileCard}
          >
            <MyCodeCardPattern />
            <Text style={styles.profileName} numberOfLines={2}>
              {displayName}
            </Text>

            <View style={styles.qrShell}>
              {loadingCode ? (
                <ActivityIndicator color="#fff" size="large" />
              ) : friendCode ? (
                <View style={styles.qrWhiteBox}>
                  <QRCode
                    value={invitePayload}
                    size={196}
                    backgroundColor="#fff"
                    color="#111"
                    ecl="H"
                  />
                  <View style={styles.qrLogoCenter} pointerEvents="none">
                    <View style={styles.qrLogo}>
                      <Text style={styles.qrLogoText}>ES</Text>
                    </View>
                  </View>
                </View>
              ) : (
                <Text style={styles.profileName}>Could not load your code</Text>
              )}
            </View>
          </LinearGradient>
        </View>

        {displayUrl ? (
          <TouchableOpacity onPress={handleCopy} activeOpacity={0.7}>
            <Text style={styles.displayLink} selectable numberOfLines={2}>
              {displayUrl}
            </Text>
          </TouchableOpacity>
        ) : null}

        <View style={styles.actionList}>
          <TouchableOpacity style={styles.actionRow} onPress={handleShare} activeOpacity={0.7}>
            <Ionicons name="share-outline" size={22} color="#e8e8e8" />
            <Text style={styles.actionText}>Share code</Text>
          </TouchableOpacity>
          <View style={styles.actionDivider} />
          <TouchableOpacity style={styles.actionRow} onPress={handleCopy} activeOpacity={0.7}>
            <Ionicons name="copy-outline" size={22} color="#e8e8e8" />
            <Text style={styles.actionText}>Copy code</Text>
          </TouchableOpacity>
          <View style={styles.actionDivider} />
          <TouchableOpacity
            style={styles.actionRow}
            onPress={handleChangeCode}
            activeOpacity={0.7}
            disabled={regenerating}
          >
            <Ionicons name="unlink-outline" size={22} color={CHANGE_CODE_COLOR} />
            <Text style={[styles.actionText, styles.changeCodeText]}>
              {regenerating ? "Updating..." : "Change code"}
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.disclaimer}>
          Anyone can use your code to add you on Expense Splitter. Only share it with people
          you trust.
        </Text>
      </ScrollView>
    );
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top, backgroundColor: DARK_BG }]}>
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.closeBtn}
          onPress={() => router.back()}
          hitSlop={12}
          activeOpacity={0.7}
        >
          <Ionicons name="close" size={28} color="#fff" />
        </TouchableOpacity>
        {renderSegmented()}
        <View style={styles.topBarSpacer} />
      </View>

      <View style={styles.body}>
        {tab === "scan" ? renderScanTab() : renderMyCodeTab()}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  body: { flex: 1 },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
    zIndex: 10,
  },
  closeBtn: { width: 44 },
  topBarSpacer: { width: 44 },
  segmentWrap: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 3,
    minWidth: 228,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 108,
  },
  segmentBtnActive: {
    backgroundColor: "#2a2a2c",
  },
  segmentText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: "#333",
    flexShrink: 0,
  },
  segmentTextActive: {
    color: "#fff",
  },
  scanCenter: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
    gap: 16,
    backgroundColor: DARK_BG,
  },
  permissionText: {
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    color: "#ccc",
    textAlign: "center",
    lineHeight: 22,
  },
  permissionBtn: {
    backgroundColor: "#1cc29f",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 8,
    alignSelf: "center",
  },
  permissionBtnText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
    color: "#fff",
  },
  pasteBlock: { width: "100%", marginTop: 8, gap: 10 },
  pasteLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    color: "#999",
    textAlign: "center",
  },
  pasteInput: {
    backgroundColor: "#2a2a2c",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: "#fff",
    fontFamily: "Inter_400Regular",
    fontSize: 15,
  },
  myCodeFlex: { flex: 1 },
  myCodeScroll: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 28,
    alignItems: "center",
    width: "100%",
  },
  profileStack: {
    width: "100%",
    maxWidth: 360,
    alignItems: "center",
    marginBottom: 18,
  },
  avatarFloat: {
    zIndex: 3,
    marginBottom: -38,
  },
  avatarRing: {
    borderWidth: 4,
    borderColor: "#fff",
    borderRadius: 44,
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  profileCard: {
    width: "100%",
    borderRadius: 14,
    overflow: "hidden",
    paddingTop: 52,
    paddingBottom: 28,
    paddingHorizontal: 22,
    alignItems: "center",
    minHeight: 360,
  },
  profileName: {
    fontFamily: "Inter_700Bold",
    fontSize: 22,
    color: "#fff",
    textAlign: "center",
    marginBottom: 22,
    paddingHorizontal: 8,
    letterSpacing: 0.2,
  },
  qrShell: {
    minHeight: 228,
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
  },
  qrWhiteBox: {
    position: "relative",
    backgroundColor: "#fff",
    padding: 14,
    borderRadius: 6,
    overflow: "hidden",
  },
  qrLogoCenter: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  qrLogo: {
    width: 46,
    height: 46,
    borderRadius: 10,
    backgroundColor: "#1cc29f",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "#fff",
  },
  qrLogoText: {
    fontFamily: "Inter_700Bold",
    fontSize: 15,
    color: "#fff",
  },
  displayLink: {
    fontFamily: "Inter_500Medium",
    fontSize: 15,
    color: LINK_COLOR,
    textAlign: "center",
    marginBottom: 22,
    paddingHorizontal: 4,
    textDecorationLine: "underline",
    width: "100%",
    maxWidth: 360,
  },
  actionList: {
    backgroundColor: ROW_BG,
    borderRadius: 12,
    overflow: "hidden",
    width: "100%",
    maxWidth: 360,
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 17,
    paddingHorizontal: 18,
    gap: 16,
  },
  actionText: {
    fontFamily: "Inter_500Medium",
    fontSize: 17,
    color: "#f2f2f2",
    flex: 1,
  },
  changeCodeText: {
    color: CHANGE_CODE_COLOR,
  },
  actionDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "#3a3a3c",
    marginLeft: 56,
  },
  disclaimer: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: "#a8a8a8",
    textAlign: "center",
    marginTop: 28,
    lineHeight: 21,
    paddingHorizontal: 16,
    maxWidth: 340,
  },
});
