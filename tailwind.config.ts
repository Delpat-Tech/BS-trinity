import type { Config } from "tailwindcss";

type TailwindConfig = Config & {
    safelist?: string[];
};

export const colors = {
    primary: {
        DEFAULT: "rgb(var(--color-primary) / <alpha-value>)",
        foreground: "rgb(var(--color-primary-fg) / <alpha-value>)",
        50: "#f0f4f8",
        100: "#d6e0ec",
        200: "#b0c4db",
        300: "#8aa8c9",
    },
    secondary: {
        DEFAULT: "rgb(var(--color-secondary) / <alpha-value>)",
        foreground: "rgb(var(--color-secondary-fg) / <alpha-value>)",
    },
    accent: {
        DEFAULT: "rgb(var(--color-accent) / <alpha-value>)",
        foreground: "rgb(var(--color-accent-fg) / <alpha-value>)",
        50: "#f0f5fa",
        100: "#d4e4f0",
    },
    background: "rgb(var(--color-background) / <alpha-value>)",
    surface: "rgb(var(--color-surface) / <alpha-value>)",
    foreground: "rgb(var(--color-foreground) / <alpha-value>)",
    muted: "rgb(var(--color-muted) / <alpha-value>)",
    success: "#2FA37A",
    warning: {
        DEFAULT: "#E6B65C",
        dark: "#E89E3A",
    },
    error: {
        DEFAULT: "#D16A6A",
        dark: "#B84D4D",
    },
    info: "#6B9BD1",
    divider: "rgb(var(--color-divider) / <alpha-value>)",
    gray: {
        50: "#F9FAFB",
        100: "#F3F4F6",
        200: "#E5E7EB",
        300: "#D1D5DB",
        400: "#9CA3AF",
        500: "#6B7280",
        600: "#4B5563",
        700: "#374151",
        800: "#1F2937",
        900: "#111827",
    },
} as const;

const config: TailwindConfig = {
    content: [
        "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/lib/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            screens: {
                sm: "640px",
                md: "700px",
                lg: "1024px",
                xl: "1280px",
                "2xl": "1536px",
            },
            colors,
        },
    },
    plugins: [],
};
export default config;
