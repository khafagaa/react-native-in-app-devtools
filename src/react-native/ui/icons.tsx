import { Text, type TextStyle } from 'react-native';

import { GlobeIcon } from './globe-icon';

type IconProps = {
  size?: number;
  color?: string;
};

const textIconStyle = (size: number, color: string): TextStyle => ({
  fontSize: size,
  color
});

export { GlobeIcon };

export const SearchIcon = ({ size = 18, color = '#5C5C5C' }: IconProps) => (
  <Text style={textIconStyle(size, color)}>⌕</Text>
);

export const SunIcon = ({ size = 20, color = '#5C5C5C' }: IconProps) => (
  <Text style={textIconStyle(size, color)}>🌝</Text>
);

export const MoonIcon = ({ size = 20, color = '#5C5C5C' }: IconProps) => (
  <Text style={textIconStyle(size, color)}>🌚</Text>
);
