/**
 * Yell Design System — Default Token Values
 * 
 * These are the default values shipped with Yell.
 * Users can override via design_config.yml or loadDesignSystem({ overrideYAML })
 */

export const defaultTokens = {
  brand: {
    primary: '#FF8A3D',
    primaryHover: '#E6752D',
    secondary: '#3B82F6',
    success: '#34D399',
    warning: '#FBBF24',
    danger: '#EF4444',
    info: '#60A5FA',
  },
  surface: {
    bg: '#0A0A0F',
    surface: '#12121A',
    surface2: '#18182A',
    surface3: '#1E1E2E',
    border: '#1E1E2E',
    borderHover: '#2E2E3E',
  },
  text: {
    primary: '#E4E4EF',
    muted: '#6B6B8A',
    placeholder: '#4B4B6A',
    inverse: '#0A0A0F',
  },
  typography: {
    fontSans: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    fontMono: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
  },
  spacing: {
    0: '0',
    1: '4px',
    2: '8px',
    3: '12px',
    4: '16px',
    5: '20px',
    6: '24px',
    8: '32px',
    10: '40px',
    12: '48px',
    16: '64px',
  },
  radius: {
    none: '0',
    sm: '4px',
    md: '8px',
    lg: '12px',
    xl: '16px',
    full: '9999px',
  },
  shadow: {
    sm: '0 1px 2px rgba(0,0,0,0.4)',
    md: '0 4px 6px rgba(0,0,0,0.4)',
    lg: '0 10px 15px rgba(0,0,0,0.5)',
    xl: '0 20px 25px rgba(0,0,0,0.5)',
    inner: 'inset 0 2px 4px rgba(0,0,0,0.3)',
  },
  animation: {
    duration: {
      fast: '150ms',
      normal: '250ms',
      slow: '400ms',
    },
    easing: {
      default: 'ease-in-out',
      in: 'ease-out',
      out: 'ease-in',
      bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
    },
  },
  zIndex: {
    dropdown: '100',
    sticky: '200',
    modal: '300',
    toast: '400',
    tooltip: '500',
  },
};
