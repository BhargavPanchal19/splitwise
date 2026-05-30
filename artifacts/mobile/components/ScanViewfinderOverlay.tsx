import React, { useState } from "react";
import { LayoutChangeEvent, StyleSheet, View } from "react-native";
import Svg, { Path } from "react-native-svg";

const BOX_SIZE = 260;
const CORNER_LEN = 28;
const CORNER_W = 3;

type Layout = { width: number; height: number };

function Corner({ style }: { style: object }) {
  return <View style={[styles.corner, style]} />;
}

/** Darkened mask with a clear square in the center + corner brackets. */
export default function ScanViewfinderOverlay() {
  const [layout, setLayout] = useState<Layout>({ width: 0, height: 0 });

  function onLayout(e: LayoutChangeEvent) {
    const { width, height } = e.nativeEvent.layout;
    if (width !== layout.width || height !== layout.height) {
      setLayout({ width, height });
    }
  }

  const { width, height } = layout;
  const left = Math.max(0, (width - BOX_SIZE) / 2);
  const top = Math.max(0, (height - BOX_SIZE) / 2);
  const cutout =
    width > 0 && height > 0
      ? `M0,0 H${width} V${height} H0 Z M${left},${top} h${BOX_SIZE} v${BOX_SIZE} h-${BOX_SIZE} Z`
      : "";

  return (
    <View style={StyleSheet.absoluteFill} onLayout={onLayout} pointerEvents="none">
      {cutout ? (
        <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
          <Path d={cutout} fill="rgba(0,0,0,0.55)" fillRule="evenodd" />
        </Svg>
      ) : null}

      <View style={[styles.box, { width: BOX_SIZE, height: BOX_SIZE }]}>
        <Corner style={styles.tl} />
        <Corner style={styles.tr} />
        <Corner style={styles.bl} />
        <Corner style={styles.br} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    position: "absolute",
    alignSelf: "center",
    top: "50%",
    marginTop: -BOX_SIZE / 2,
  },
  corner: {
    position: "absolute",
    width: CORNER_LEN,
    height: CORNER_LEN,
    borderColor: "#fff",
  },
  tl: {
    top: 0,
    left: 0,
    borderTopWidth: CORNER_W,
    borderLeftWidth: CORNER_W,
  },
  tr: {
    top: 0,
    right: 0,
    borderTopWidth: CORNER_W,
    borderRightWidth: CORNER_W,
  },
  bl: {
    bottom: 0,
    left: 0,
    borderBottomWidth: CORNER_W,
    borderLeftWidth: CORNER_W,
  },
  br: {
    bottom: 0,
    right: 0,
    borderBottomWidth: CORNER_W,
    borderRightWidth: CORNER_W,
  },
});
