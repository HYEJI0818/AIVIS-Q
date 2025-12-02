import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        // 서울대학교병원 브랜드 컬러
        snuh: {
          primary: "#0066CC",   // 메인 블루
          dark: "#004A99",      // 진한 블루 (hover)
          light: "#3399FF",     // 밝은 블루
        },
      },
    },
  },
  plugins: [],
};
export default config;

