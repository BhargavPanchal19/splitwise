import React from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Path } from "react-native-svg";

/** Low-opacity geometric mesh on the profile QR card (Splitwise-style). */
export default function MyCodeCardPattern() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
        <Path
          d="
            M0,0 L25,8 L0,22 Z
            M25,8 L55,0 L55,18 Z
            M55,0 L88,12 L100,0 Z
            M88,12 L100,28 L100,0 Z
            M0,22 L25,8 L55,18 Z
            M55,18 L88,12 L100,28 Z
            M0,22 L55,18 L32,48 Z
            M100,28 L55,18 L68,48 Z
            M32,48 L55,18 L68,48 Z
            M0,22 L0,58 L32,48 Z
            M100,28 L100,58 L68,48 Z
            M32,48 L55,78 L68,48 Z
            M0,58 L32,48 L55,78 Z
            M100,58 L68,48 L55,78 Z
            M0,58 L55,78 L18,100 Z
            M18,100 L55,78 L55,100 Z
            M100,58 L55,78 L82,100 Z
            M82,100 L55,78 L55,100 Z
          "
          fill="rgba(255,255,255,0.06)"
          stroke="rgba(255,255,255,0.12)"
          strokeWidth="0.35"
        />
      </Svg>
    </View>
  );
}
