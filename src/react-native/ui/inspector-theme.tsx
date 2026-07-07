import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode
} from 'react';

export type InspectorColors = {
  background: {
    default: string;
    subtle: string;
    muted: string;
    active: string;
    inactive: string;
  };
  content: {
    primary: string;
    secondary: string;
    tertiary: string;
    inverse: string;
    link: string;
    brand: string;
  };
  stroke: {
    subtle: string;
    default: string;
    brand: string;
  };
  brand: {
    600: string;
  };
};

const LIGHT_COLORS: InspectorColors = {
  background: {
    default: '#FFFFFF',
    subtle: '#F8F6F1',
    muted: '#F0EDE6',
    active: '#d3cfc8',
    inactive: '#F8F6F1'
  },
  content: {
    primary: '#1A1A1A',
    secondary: '#5C5C5C',
    tertiary: '#8A8A8A',
    inverse: '#FFFFFF',
    link: '#1565C0',
    brand: '#8B6914'
  },
  stroke: {
    subtle: '#E8E4DC',
    default: '#D4CFC4',
    brand: '#B8860B'
  },
  brand: {
    600: '#B8860B'
  }
};

const DARK_COLORS: InspectorColors = {
  background: {
    default: '#1E1E1E',
    subtle: '#2A2A2A',
    muted: '#333333',
    active: '#404040',
    inactive: '#2A2A2A'
  },
  content: {
    primary: '#F5F5F5',
    secondary: '#B0B0B0',
    tertiary: '#808080',
    inverse: '#1A1A1A',
    link: '#64B5F6',
    brand: '#D4AF37'
  },
  stroke: {
    subtle: '#404040',
    default: '#555555',
    brand: '#D4AF37'
  },
  brand: {
    600: '#D4AF37'
  }
};

type InspectorThemeContextValue = {
  colors: InspectorColors;
  isDark: boolean;
  toggleMode: () => void;
};

const InspectorThemeContext = createContext<InspectorThemeContextValue | null>(
  null
);

type InspectorThemeProviderProps = {
  children: ReactNode;
};

export const InspectorThemeProvider = ({
  children
}: InspectorThemeProviderProps) => {
  const [isDark, setIsDark] = useState(false);

  const toggleMode = useCallback(() => {
    setIsDark(current => !current);
  }, []);

  const value = useMemo<InspectorThemeContextValue>(
    () => ({
      isDark,
      colors: isDark ? DARK_COLORS : LIGHT_COLORS,
      toggleMode
    }),
    [isDark, toggleMode]
  );

  return (
    <InspectorThemeContext.Provider value={value}>
      {children}
    </InspectorThemeContext.Provider>
  );
};

export function useInspectorTheme(): InspectorThemeContextValue {
  const context = useContext(InspectorThemeContext);
  if (!context) {
    throw new Error(
      'useInspectorTheme must be used within InspectorThemeProvider'
    );
  }
  return context;
}
