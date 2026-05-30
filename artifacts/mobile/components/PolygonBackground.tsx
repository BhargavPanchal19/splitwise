import React from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { useColors } from "@/hooks/useColors";

export default function PolygonBackground() {
  const colors = useColors();

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
        {/* Draw subtle low-opacity geometric polygon grid mesh */}
        <Path
          d="
            M0,0 L20,10 L0,30 Z
            M20,10 L50,0 L50,20 Z
            M50,0 L80,10 L100,0 Z
            M80,10 L100,30 L100,0 Z
            M0,30 L20,10 L50,20 Z
            M50,20 L80,10 L100,30 Z
            M0,30 L50,20 L30,50 Z
            M100,30 L50,20 L70,50 Z
            M30,50 L50,20 L70,50 Z
            M0,30 L0,70 L30,50 Z
            M100,30 L100,70 L70,50 Z
            M30,50 L50,80 L70,50 Z
            M0,70 L30,50 L50,80 Z
            M100,70 L70,50 L50,80 Z
            M0,70 L50,80 L20,100 Z
            M20,100 L50,80 L50,100 Z
            M100,70 L50,80 L80,100 Z
            M80,100 L50,80 L50,100 Z
            M0,70 L0,100 L20,100 Z
            M100,70 L100,100 L80,100 Z
          "
          fill="none"
          stroke={colors.border}
          strokeWidth="0.12"
          opacity="0.45"
        />
      </Svg>
    </View>
  );
}
