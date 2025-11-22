/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
    './hooks/**/*.{js,jsx,ts,tsx}',
    './screens/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Primary
        primary: {
          50: '#E0F7F4',
          100: '#B3EDE6',
          200: '#80E2D7',
          300: '#4DD7C8',
          400: '#26CEBC',
          500: '#00C2A8',
          600: '#00B599',
          700: '#00A385',
          800: '#009272',
          900: '#007550',
        },
        accent: '#00C2A8',

        // Macro colors
        protein: {
          light: '#FF6B9D',
          DEFAULT: '#FF3B7F',
          dark: '#E6005C',
        },
        carbs: {
          light: '#FFB84D',
          DEFAULT: '#FFA500',
          dark: '#E68A00',
        },
        fat: {
          light: '#9B59FF',
          DEFAULT: '#8B3FFF',
          dark: '#7028E6',
        },

        // Semantic colors
        success: '#34C759',
        warning: '#FFCC00',
        error: '#FF3B30',
        info: '#007AFF',

        // Ink scale
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

        // Background
        background: {
          light: '#FFFFFF',
          subtle: '#F9FAFB',
          card: '#FFFFFF',
          elevated: '#FFFFFF',
        },
      },

      // Border radius
      borderRadius: {
        sm: '8px',
        DEFAULT: '12px',
        md: '12px',
        lg: '16px',
        xl: '20px',
        '2xl': '24px',
        '3xl': '32px',
      },

      // Spacing scale
      spacing: {
        0.5: '2px',
        1: '4px',
        1.5: '6px',
        2: '8px',
        2.5: '10px',
        3: '12px',
        3.5: '14px',
        4: '16px',
        4.5: '18px',
        5: '20px',
        6: '24px',
        7: '28px',
        8: '32px',
        9: '36px',
        10: '40px',
        11: '44px',
        12: '48px',
        14: '56px',
        16: '64px',
        20: '80px',
        24: '96px',
      },

      // Font sizes (RN doesn't support rem, use px)
      fontSize: {
        '2xs': '10px',
        xs: '12px',
        sm: '14px',
        base: '16px',
        lg: '18px',
        xl: '20px',
        '2xl': '24px',
        '3xl': '32px',
        '4xl': '40px',
        '5xl': '48px',
      },

      // Font weights
      fontWeight: {
        normal: '400',
        medium: '500',
        semibold: '600',
        bold: '700',
      },

      // Line height
      lineHeight: {
        tight: '1.15',
        base: '1.5',
        relaxed: '1.75',
      },
    },
  },
  plugins: [],
};
