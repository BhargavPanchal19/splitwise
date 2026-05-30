import React from "react";
import Svg, { Polygon, Circle, G } from "react-native-svg";

interface ElephantSvgProps {
  size?: number;
}

export default function ElephantSvg({ size = 180 }: ElephantSvgProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 200 200">
      {/* Background/Shadow Group */}
      <G>
        {/* Left Ear - Outer Dark Triangles */}
        <Polygon points="15,70 50,30 50,75" fill="#005A4A" />
        <Polygon points="15,70 50,75 15,115" fill="#007E68" />
        <Polygon points="15,115 50,75 50,140" fill="#00463A" />
        
        {/* Left Ear - Inner Teal Triangles */}
        <Polygon points="50,30 85,55 50,75" fill="#4CD5B6" />
        <Polygon points="50,75 85,55 85,95" fill="#1CC29F" />
        <Polygon points="50,75 85,95 50,115" fill="#009A7F" />
        <Polygon points="50,115 85,95 85,140" fill="#007E68" />
        
        {/* Right Ear - Outer Dark Triangles (Symmetric) */}
        <Polygon points="185,70 150,30 150,75" fill="#005A4A" />
        <Polygon points="185,70 150,75 185,115" fill="#007E68" />
        <Polygon points="185,115 150,75 150,140" fill="#00463A" />
        
        {/* Right Ear - Inner Teal Triangles (Symmetric) */}
        <Polygon points="150,30 115,55 150,75" fill="#4CD5B6" />
        <Polygon points="150,75 115,55 115,95" fill="#1CC29F" />
        <Polygon points="150,75 115,95 150,115" fill="#009A7F" />
        <Polygon points="150,115 115,95 115,140" fill="#007E68" />

        {/* Central Head Diamond */}
        <Polygon points="50,75 100,30 150,75" fill="#1CC29F" />
        <Polygon points="50,75 100,120 150,75" fill="#009A7F" />
        <Polygon points="50,75 100,120 50,115" fill="#007E68" />
        <Polygon points="150,75 100,120 150,115" fill="#007E68" />

        {/* Eyes Base */}
        <Circle cx="76" cy="90" r="14" fill="#FFFFFF" />
        <Circle cx="124" cy="90" r="14" fill="#FFFFFF" />
        
        {/* Pupils (Slightly cross-eyed/cute, looking straight/inwards) */}
        <Circle cx="79" cy="90" r="6" fill="#1A1A1A" />
        <Circle cx="121" cy="90" r="6" fill="#1A1A1A" />

        {/* Trunk Segment 1 */}
        <Polygon points="80,120 120,120 100,142" fill="#4CD5B6" />
        {/* Trunk Segment 2 */}
        <Polygon points="83,135 117,135 100,154" fill="#1CC29F" />
        {/* Trunk Segment 3 */}
        <Polygon points="86,148 114,148 100,165" fill="#009A7F" />
        {/* Trunk Segment 4 */}
        <Polygon points="89,158 111,158 100,174" fill="#007E68" />
        
        {/* Trunk Tip (Curved up/cute) */}
        <Polygon points="89,174 100,174 85,188" fill="#1CC29F" />
        <Polygon points="85,188 100,174 105,185" fill="#4CD5B6" />
      </G>
    </Svg>
  );
}
