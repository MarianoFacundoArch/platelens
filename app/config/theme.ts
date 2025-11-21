/**
 * PlateLens Design System
 * Apple Health / Fitness+ Inspired Theme
 */

export const theme = {
  /**
   * Color System
   * Vibrant accents with subtle backgrounds
   */
  colors: {
    // Primary accent - Vibrant Teal
    primary: {
      50: '#E0F7F4',
      100: '#B3EDE6',
      200: '#80E2D7',
      300: '#4DD7C8',
      400: '#26CEBC',
      500: '#00C2A8', // Main
      600: '#00B599',
      700: '#00A385',
      800: '#009272',
      900: '#007550',
    },

    // Secondary accents for macros
    protein: {
      light: '#FF6B9D',
      main: '#FF3B7F',
      dark: '#E6005C',
    },
    carbs: {
      light: '#FFB84D',
      main: '#FFA500',
      dark: '#E68A00',
    },
    fat: {
      light: '#9B59FF',
      main: '#8B3FFF',
      dark: '#7028E6',
    },

    // Success, Warning, Error
    success: '#34C759',
    warning: '#FFCC00',
    error: '#FF3B30',
    info: '#007AFF',

    // Neutral ink scale (for text and UI elements)
    ink: {
      50: '#F9FAFB',
      100: '#E6ECF0',
      200: '#D1DBE3',
      300: '#95A3AD',
      400: '#6B7A87',
      500: '#405060',
      600: '#2D3E4D',
      700: '#1B2B32',
      800: '#131B20',
      900: '#0B1215',
    },

    // Background gradients
    background: {
      light: '#FFFFFF',
      subtle: '#F9FAFB',
      card: '#FFFFFF',
      elevated: '#FFFFFF',
    },

    // Overlay and shadows
    overlay: 'rgba(11, 18, 21, 0.6)',
    shadowLight: 'rgba(0, 0, 0, 0.08)',
    shadowMedium: 'rgba(0, 0, 0, 0.12)',
    shadowStrong: 'rgba(0, 0, 0, 0.16)',
  },

  /**
   * Typography Scale
   * SF Pro inspired with Inter font family
   */
  typography: {
    // Font families
    fontFamily: {
      regular: 'Inter_400Regular',
      medium: 'Inter_500Medium',
      semibold: 'Inter_600SemiBold',
      bold: 'Inter_700Bold',
    },

    // Type scale (mobile-optimized)
    fontSize: {
      // Display
      '5xl': 48, // Hero numbers
      '4xl': 40, // Large titles
      '3xl': 32, // Titles
      '2xl': 24, // Subtitles
      xl: 20, // Section headers
      lg: 18, // Body large
      base: 16, // Body
      sm: 14, // Caption
      xs: 12, // Fine print
      '2xs': 10, // Tiny labels
    },

    // Line heights
    lineHeight: {
      tight: 1.15,
      base: 1.5,
      relaxed: 1.75,
    },

    // Letter spacing
    letterSpacing: {
      tight: -0.5,
      normal: 0,
      wide: 0.5,
    },
  },

  /**
   * Spacing Scale
   * Based on 4px grid with golden ratio influences
   */
  spacing: {
    0: 0,
    1: 4,
    2: 8,
    3: 12,
    4: 16,
    5: 20,
    6: 24,
    7: 28,
    8: 32,
    10: 40,
    12: 48,
    16: 64,
    20: 80,
    24: 96,
  },

  /**
   * Border Radius
   * Consistent curves throughout
   */
  radius: {
    none: 0,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    '2xl': 24,
    '3xl': 32,
    full: 9999,
  },

  /**
   * Shadows
   * Subtle depth with multiple layers
   */
  shadows: {
    none: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0,
      shadowRadius: 0,
      elevation: 0,
    },
    sm: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 4,
      elevation: 2,
    },
    md: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.12,
      shadowRadius: 8,
      elevation: 4,
    },
    lg: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.16,
      shadowRadius: 16,
      elevation: 8,
    },
    xl: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.20,
      shadowRadius: 24,
      elevation: 12,
    },
  },

  /**
   * Animation Curves
   * iOS-inspired spring physics
   */
  animations: {
    // Duration (ms)
    duration: {
      instant: 100,
      fast: 200,
      normal: 300,
      slow: 500,
      verySlow: 800,
    },

    // Easing curves
    easing: {
      // Standard iOS spring
      spring: {
        damping: 15,
        mass: 1,
        stiffness: 150,
      },
      // Bouncy for celebrations
      bouncy: {
        damping: 10,
        mass: 1,
        stiffness: 200,
      },
      // Smooth for subtle transitions
      smooth: {
        damping: 20,
        mass: 1,
        stiffness: 100,
      },
      // Linear for progress
      linear: {
        damping: 500,
        mass: 1,
        stiffness: 100,
      },
    },
  },

  /**
   * Component Specific Tokens
   */
  components: {
    // Buttons
    button: {
      height: {
        sm: 36,
        md: 48,
        lg: 56,
      },
      paddingHorizontal: {
        sm: 16,
        md: 24,
        lg: 32,
      },
    },

    // Input fields
    input: {
      height: 56,
      borderWidth: 2,
      borderRadius: 12,
    },

    // Cards
    card: {
      borderRadius: 16,
      padding: 20,
    },

    // Rings (CalorieRing, MacroRing)
    ring: {
      strokeWidth: {
        sm: 8,
        md: 12,
        lg: 16,
      },
      size: {
        sm: 120,
        md: 180,
        lg: 240,
      },
    },
  },
} as const;

export type Theme = typeof theme;

/**
 * Gradient Definitions
 * For rings, backgrounds, and highlights
 */
export const gradients = {
  calorie: {
    colors: ['#00C2A8', '#00E5C9'],
    locations: [0, 1],
  },
  protein: {
    colors: ['#FF6B9D', '#FF3B7F'],
    locations: [0, 1],
  },
  carbs: {
    colors: ['#FFB84D', '#FFA500'],
    locations: [0, 1],
  },
  fat: {
    colors: ['#9B59FF', '#8B3FFF'],
    locations: [0, 1],
  },
  success: {
    colors: ['#34C759', '#30D158'],
    locations: [0, 1],
  },
  background: {
    colors: ['#F9FAFB', '#FFFFFF'],
    locations: [0, 1],
  },
  // Overage warning gradients (for when exceeding targets)
  warning: {
    colors: ['#FFCC00', '#FFB84D'], // Yellow gradient (90-100%)
    locations: [0, 1],
  },
  warningOrange: {
    colors: ['#FFA500', '#FF8C00'], // Orange gradient (100-110%)
    locations: [0, 1],
  },
  error: {
    colors: ['#FF6B6B', '#FF3B30'], // Red gradient (110%+)
    locations: [0, 1],
  },
  // Text gradient for calorie number (vibrant, Apple-style)
  calorieText: {
    colors: ['#00C2A8', '#FF6B9D'], // Teal to pink
    locations: [0, 1],
  },
} as const;
