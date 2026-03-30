import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ridge: {
          50: "#f6faf7",
          100: "#e7f2eb",
          200: "#c8dfd1",
          300: "#9dc5ae",
          400: "#71a985",
          500: "#4d8967",
          600: "#3a6d52",
          700: "#2f5742",
          800: "#294738",
          900: "#233b30"
        },
        storm: {
          50: "#f6f8fb",
          100: "#e9eef5",
          200: "#cfd9e8",
          300: "#aabbd4",
          400: "#7d96bb",
          500: "#5f79a2",
          600: "#4c6187",
          700: "#3f506d",
          800: "#39455c",
          900: "#333b4c"
        },
        ember: {
          50: "#fff7ed",
          100: "#ffedd5",
          200: "#fed7aa",
          300: "#fdba74",
          400: "#fb923c",
          500: "#f97316",
          600: "#ea580c",
          700: "#c2410c",
          800: "#9a3412",
          900: "#7c2d12"
        }
      },
      boxShadow: {
        terrain: "0 18px 60px rgba(24, 36, 31, 0.16)",
      },
      backgroundImage: {
        topo: "radial-gradient(circle at 25% 20%, rgba(113, 169, 133, 0.18), transparent 28%), radial-gradient(circle at 85% 15%, rgba(95, 121, 162, 0.2), transparent 26%), linear-gradient(160deg, rgba(250, 248, 243, 1), rgba(235, 242, 236, 1))",
      },
    },
  },
  plugins: [],
};

export default config;
