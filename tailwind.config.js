/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      // AssetMX brand (Sep 2026): Caprasimo display, Figtree body
      fontFamily: {
        display: ['Caprasimo', 'Georgia', 'serif'],
        sans: ['Figtree', 'system-ui', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      colors: {
        // AssetMX brand: cream / forest / sage / ink.
        // The legacy `purple` scale is remapped to forest greens so existing
        // class names keep working; `pink` -> rust accents; `teal` -> sage.
        purple: {
          50: '#F0FAE1',
          100: '#E1EECC',
          200: '#CCDBB2',
          300: '#AEBF92',
          400: '#7F9466',
          500: '#56633F',
          600: '#3D472B',
          700: '#333C24',
          800: '#272E1B',
          900: '#1B2012',
        },
        pink: {
          400: '#C9862B',
          500: '#8A4A1F',
          600: '#643312',
        },
        teal: {
          400: '#CCDBB2',
          500: '#AEBF92',
          600: '#7F9466',
        },
        forest: { DEFAULT: '#3D472B', 700: '#333C24', 800: '#272E1B' },
        sage: { DEFAULT: '#CCDBB2', 100: '#F0FAE1', 200: '#E1EECC', 300: '#AEBF92' },
        sand: '#EBDDC5',
        ink: {
          DEFAULT: '#201E1D',
          800: '#2E2B25',
          700: '#474238',
          600: '#645C50',
          500: '#7D7365',
          400: '#A39A8C',
          300: '#C9C0B1',
          200: '#DCD3C4',
          100: '#EEE7DB',
          50: '#F9F4ED',
        },
        ivory: '#F9F4ED',
        cream: '#F5EAD8',
        // shadcn/ui CSS variable colors
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      boxShadow: {
        'soft': '0 2px 15px -3px rgba(32,30,29,0.06), 0 10px 20px -2px rgba(32,30,29,0.04)',
        'card': '0 4px 25px -5px rgba(32,30,29,0.10), 0 10px 10px -5px rgba(32,30,29,0.04)',
        'glow': '0 0 40px -10px rgba(61, 71, 43, 0.3)',
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [
    require("tailwindcss-animate"),
    require("@tailwindcss/typography"),
  ],
}
