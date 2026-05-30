import { CameraView, useCameraPermissions } from "expo-camera";
import React, { useEffect } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

type Props = {
  bottomInset: number;
  onScanned: (data: string) => void;
  pasteSlot?: React.ReactNode;
};

export default function FriendScanCamera({ bottomInset, onScanned, pasteSlot }: Props) {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanEnabled, setScanEnabled] = React.useState(true);

  const handleBarcode = React.useCallback(
    ({ data }: { data: string }) => {
      if (!scanEnabled) return;
      setScanEnabled(false);
      onScanned(data);
      setTimeout(() => setScanEnabled(true), 2500);
    },
    [onScanned, scanEnabled]
  );

  useEffect(() => {
    if (permission && !permission.granted && permission.canAskAgain) {
      requestPermission();
    }
  }, [permission, requestPermission]);

  if (!permission) {
    return (
      <View style={styles.center}>
        <Text style={styles.hint}>Loading camera…</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Text style={styles.hint}>Camera access is needed to scan a friend&apos;s QR code.</Text>
        <TouchableOpacity style={styles.btn} onPress={() => requestPermission()} activeOpacity={0.85}>
          <Text style={styles.btnText}>Allow camera</Text>
        </TouchableOpacity>
        {pasteSlot}
      </View>
    );
  }

  return (
    <View style={styles.flex}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
        onBarcodeScanned={scanEnabled ? handleBarcode : undefined}
      />

      <View style={styles.overlay} pointerEvents="box-none">
        <View style={styles.scanMiddle} pointerEvents="none">
          <View style={styles.viewfinder} />
        </View>
        <View style={[styles.footer, { paddingBottom: bottomInset + 16 }]}>
          <Text style={styles.footerText}>
            Position the box over your friend&apos;s code to add them.
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: "#000" },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
    gap: 16,
    backgroundColor: "#0d0d0d",
  },
  hint: {
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    color: "#ccc",
    textAlign: "center",
    lineHeight: 22,
  },
  btn: {
    backgroundColor: "#1cc29f",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  btnText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
    color: "#fff",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: "column",
  },
  scanMiddle: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  viewfinder: {
    width: 260,
    height: 260,
    borderWidth: 2,
    borderColor: "#fff",
    borderStyle: "dashed",
    borderRadius: 4,
    backgroundColor: "transparent",
  },
  footer: {
    backgroundColor: "#1c1c1e",
    paddingTop: 20,
    paddingHorizontal: 24,
  },
  footerText: {
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    color: "#fff",
    textAlign: "center",
    lineHeight: 22,
  },
});
