import React from 'react';
import Svg, { Circle, Path } from 'react-native-svg';
import { Home, Tag, ShoppingBag, User } from 'lucide-react-native';

export function GoogleIcon({ size = 20 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Path
        fill="#FFC107"
        d="M43.6 20.5H42V20.4H24v7.2h11.3C33.7 32 29.3 35 24 35c-6.1 0-11-4.9-11-11s4.9-11 11-11c2.8 0 5.3 1 7.3 2.7l5.1-5.1C33.1 7.9 28.8 6 24 6 14.6 6 7 13.6 7 23s7.6 17 17 17c8.5 0 16.2-6.2 16.2-17 0-1.1-.1-1.9-.3-2.5Z"
      />
      <Path
        fill="#FF3D00"
        d="m9.3 14.6 5.9 4.3C16.9 15.6 20.2 13.2 24 13.2c2.8 0 5.3 1 7.3 2.7l5.1-5.1C33.1 7.9 28.8 6 24 6c-6.5 0-12.1 3.6-14.7 8.6Z"
      />
      <Path
        fill="#4CAF50"
        d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.6 26.7 36.5 24 36.5c-5.3 0-9.7-3.4-11.3-8.1l-6.1 4.7C9.5 39.6 16.2 44 24 44Z"
      />
      <Path
        fill="#1976D2"
        d="M43.6 20.5H42V20.4H24v7.2h11.3c-.8 2.3-2.3 4.2-4.2 5.6l6.2 5.2C40.9 35.9 44 30.6 44 24c0-1.2-.1-2.4-.4-3.5Z"
      />
    </Svg>
  );
}

export function FacebookIcon({ size = 20 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Circle cx="12" cy="12" r="12" fill="#1877F2" />
      <Path
        fill="#FFFFFF"
        d="M15.5 12.3h-2v7h-2.9v-7H9v-2.5h1.6V8.1c0-1.6.9-3 3.4-3h2.1v2.4h-1.5c-.4 0-.8.3-.8.9v1.4h2.3l-.3 2.5Z"
      />
    </Svg>
  );
}

export function AppleIcon({ size = 18 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        fill="#000000"
        d="M16.4 12.6c0-2 1.6-3 1.7-3.1-1-1.4-2.4-1.6-2.9-1.6-1.3-.1-2.5.7-3.1.7-.6 0-1.6-.7-2.7-.7-1.4 0-2.6.8-3.4 2-1.4 2.5-.4 6.2 1 8.2.7 1 1.5 2.1 2.6 2 1-.1 1.4-.7 2.7-.7s1.6.7 2.7.6c1.1 0 1.8-1 2.5-2 .8-1.2 1.1-2.3 1.1-2.4-.1 0-2.2-.8-2.2-3Z"
      />
      <Path
        fill="#000000"
        d="M14.3 6.5c.6-.7 1-1.7.9-2.7-.9.1-1.9.6-2.5 1.3-.5.6-1 1.6-.9 2.6 1 .1 1.9-.5 2.5-1.2Z"
      />
    </Svg>
  );
}

export function EyeIcon({ size = 20, color = '#6D7277' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7Z"
        stroke={color}
        strokeWidth={1.6}
        strokeLinejoin="round"
      />
      <Circle cx="12" cy="12" r="3" stroke={color} strokeWidth={1.6} />
    </Svg>
  );
}

export function EyeOffIcon({ size = 20, color = '#6D7277' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3 3l18 18M10.6 10.7a3 3 0 0 0 4.2 4.2M6.3 6.5C3.9 8.1 2 12 2 12s4 7 11 7c1.8 0 3.4-.4 4.7-1.1M9.5 5.2A11.4 11.4 0 0 1 12 5c7 0 11 7 11 7s-.9 1.6-2.5 3.1"
        stroke={color}
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function HomeTabIcon({ size = 24, color }) {
  return <Home size={size} color={color} strokeWidth={2} />;
}

export function BrandTabIcon({ size = 24, color }) {
  return <Tag size={size} color={color} strokeWidth={2} />;
}

export function BagTabIcon({ size = 24, color }) {
  return <ShoppingBag size={size} color={color} strokeWidth={2} />;
}

export function ProfileTabIcon({ size = 24, color }) {
  return <User size={size} color={color} strokeWidth={2} />;
}

// ── Category icons (cosmetic product line-art) ────────────────────────────────

export function SkinCareIcon({ size = 28, color = '#64748B' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M8 3h8a1 1 0 0 1 1 1v2H7V4a1 1 0 0 1 1-1Z" stroke={color} strokeWidth={1.5} strokeLinejoin="round" />
      <Path d="M6 6h12l-1 13a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1L6 6Z" stroke={color} strokeWidth={1.5} strokeLinejoin="round" />
      <Path d="M9.5 11c.5-1 2.5-1 3 0s2.5 1 3 0" stroke={color} strokeWidth={1.3} strokeLinecap="round" />
    </Svg>
  );
}

export function MakeupIcon({ size = 28, color = '#64748B' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 2v4M10 2h4" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
      <Path d="M9 6h6l1 11a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1L9 6Z" stroke={color} strokeWidth={1.5} strokeLinejoin="round" />
      <Path d="M9 18v2a1 1 0 0 0 1 1h4a1 1 0 0 0 1-1v-2" stroke={color} strokeWidth={1.5} />
      <Path d="M10 10h4" stroke={color} strokeWidth={1.3} strokeLinecap="round" />
    </Svg>
  );
}

export function HairCareIcon({ size = 28, color = '#64748B' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M4 6h16v2H4z" stroke={color} strokeWidth={1.5} strokeLinejoin="round" />
      <Path d="M6 8v10M9 8v10M12 8v10M15 8v10M18 8v10" stroke={color} strokeWidth={1.3} strokeLinecap="round" />
      <Path d="M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2" stroke={color} strokeWidth={1.5} />
    </Svg>
  );
}

export function TopDealsIcon({ size = 28, color = '#64748B' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M20 7H4a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1V8a1 1 0 0 0-1-1Z" stroke={color} strokeWidth={1.5} />
      <Path d="M8 7V5a2 2 0 0 1 4 0v2" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
      <Path d="M9 13l1.5 1.5L15 11" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function BathBodyIcon({ size = 28, color = '#64748B' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M7 3h6a1 1 0 0 1 1 1v2H6V4a1 1 0 0 1 1-1Z" stroke={color} strokeWidth={1.5} strokeLinejoin="round" />
      <Path d="M5 6h10l-.8 13a1 1 0 0 1-1 .9H6.8a1 1 0 0 1-1-.9L5 6Z" stroke={color} strokeWidth={1.5} strokeLinejoin="round" />
      <Path d="M15 8c1.5 0 4 .8 4 3.5S17 15 15 15" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
      <Path d="M17 10.5c.6.3 1 1 1 1.8" stroke={color} strokeWidth={1.3} strokeLinecap="round" />
    </Svg>
  );
}

export function AllCategoryIcon({ size = 28, color = '#64748B' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M4 5h6v6H4zM14 5h6v6h-6zM4 13h6v6H4zM14 13h6v6h-6z" stroke={color} strokeWidth={1.5} strokeLinejoin="round" />
    </Svg>
  );
}
