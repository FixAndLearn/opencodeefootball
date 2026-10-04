import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef4ff",
          100: "#d9e6ff",
          200: "#bcceff",
          300: "#8eaaff",
          400: "#5985ff",
          500: "#3558f8",
          600: "#223bec",
          700: "#1a2fd0",
          800: "#1a2aa6",
          900: "#1c2883",
          950: "#151a51",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
