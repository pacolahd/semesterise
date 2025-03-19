import typography from "@tailwindcss/typography";
import { Config } from "tailwindcss";
import animate from "tailwindcss-animate";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Semantic color tokens (for shadcn compatibility)
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
          50: "#e6edf8",
          100: "#b0c8e8",
          200: "#8aaedd",
          300: "#5488cd",
          400: "#3371c3",
          500: "#004eb4",
          600: "#0047a4",
          700: "#003780",
          800: "#002b63",
          900: "#00214c",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",

        // Chart colors from shadcn
        chart: {
          "1": "hsl(var(--chart-1))",
          "2": "hsl(var(--chart-2))",
          "3": "hsl(var(--chart-3))",
          "4": "hsl(var(--chart-4))",
          "5": "hsl(var(--chart-5))",
        },

        // Semesterise color system - full scales
        surface: {
          50: "#ffffff",
          100: "#fdfdfd",
          200: "#fdfdfd",
          300: "#fcfcfc",
          400: "#fbfbfb",
          500: "#fafafa",
          600: "#e4e4e4",
          700: "#b2b2b2",
          800: "#8a8a8a",
          900: "#696969",
        },
        danger: {
          50: "#ffe6e6",
          100: "#ffb0b0",
          200: "#ff8a8a",
          300: "#ff5454",
          400: "#ff3333",
          500: "#ff0000",
          600: "#e80000",
          700: "#b50000",
          800: "#8c0000",
          900: "#6b0000",
        },
        green: {
          50: "#e7f2e6",
          100: "#b4d8b0",
          200: "#8fc58a",
          300: "#5caab4",
          400: "#619533",
          500: "#0c8000",
          600: "#0b7400",
          700: "#099500",
          800: "#074600",
          900: "#053600",
        },
        warning: {
          50: "#fffde6",
          100: "#fff9b0",
          200: "#fff78a",
          300: "#fff355",
          400: "#f9f134",
          500: "#f6e601",
          600: "#e7d601",
          700: "#b4a801",
          800: "#8c8201",
          900: "#6b6400",
        },
        text: {
          50: "#ebebebeb",
          100: "#c0c0c0",
          200: "#a1a1a1",
          300: "#767676",
          400: "#5c5c5c",
          500: "#333333",
          600: "#2e2e2e",
          700: "#242424",
          800: "#1c1c1c",
          900: "#151515",
        },
      },
      fontFamily: { satoshi: ["var(--font-satoshi)", "sans-serif"] },
      fontSize: {
        // Custom font sizes based on your typography
        h1: "36px",
        h2: "24px",
        h3: "20px",
        body1: "18px",
        body2: "16px",
        body3: "14px",
        caption: "12px",
      },
      letterSpacing: {
        tighter: "-0.03em", // Equivalent to -3%
        tight: "-0.02em", // Equivalent to -2%
        normal: "0", // Equivalent to 0%
      },
      lineHeight: {
        short: "100%",
        normal: "150%",
        shorter: "32px",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [typography, animate],
};

export default config;
