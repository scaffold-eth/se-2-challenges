/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./pages/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}", "./utils/**/*.{js,ts,jsx,tsx}"],
  plugins: [require("daisyui")],
  darkTheme: "scaffoldEthDark",
  // DaisyUI theme colors
  daisyui: {
    themes: [
      {
        scaffoldEth: {
          primary: "#C8F5FF",
          "primary-content": "#026262",
          secondary: "#89d7e9",
          "secondary-content": "#088484",
          accent: "#026262",
          "accent-content": "#E9FBFF",
          neutral: "#088484",
          "neutral-content": "#F0FCFF",
          "base-100": "#F0FCFF",
          "base-200": "#E9FBFF",
          "base-300": "#C8F5FF",
          "base-content": "#088484",
          info: "#026262",
          success: "#34EEB6",
          warning: "#FFCF72",
          error: "#FF8863",

          "--rounded-btn": "9999rem",

          ".tooltip": {
            "--tooltip-tail": "6px",
          },
        },
      },
      {
        scaffoldEthDark: {
          primary: "#026262",
          "primary-content": "#C8F5FF",
          secondary: "#107575",
          "secondary-content": "#E9FBFF",
          accent: "#C8F5FF",
          "accent-content": "#088484",
          neutral: "#E9FBFF",
          "neutral-content": "#11ACAC",
          "base-100": "#11ACAC",
          "base-200": "#088484",
          "base-300": "#026262",
          "base-content": "#E9FBFF",
          info: "#C8F5FF",
          success: "#34EEB6",
          warning: "#FFCF72",
          error: "#FF8863",

          "--rounded-btn": "9999rem",

          ".tooltip": {
            "--tooltip-tail": "6px",
            "--tooltip-color": "hsl(var(--s))",
          },
        },
      },
      {
        exampleUi: {
          primary: "#000000",
          "primary-content": "#ffffff",
          secondary: "#FF6644",
          "secondary-content": "#212638",
          accent: "#93BBFB",
          "accent-content": "#212638",
          neutral: "#f3f3f3",
          "neutral-content": "#212638",
          "base-100": "#ffffff",
          "base-200": "#f1f1f1",
          "base-300": "#d0d0d0",
          "base-content": "#212638",
          info: "#93BBFB",
          success: "#34EEB6",
          warning: "#FFCF72",
          error: "#FF8863",

          "--rounded-btn": "9999rem",

          ".tooltip": {
            "--tooltip-tail": "6px",
          },
        },
      },
    ],
  },
  theme: {
    // Extend Tailwind classes (e.g. font-space-grotesk, animate-grow)
    extend: {
      fontFamily: {
        "space-grotesk": ["Space Grotesk", "sans-serif"],
      },
      keyframes: {
        grow: {
          "0%": {
            width: "0%",
          },
          "100%": {
            width: "100%",
          },
        },
        zoom: {
          "0%, 100%": { transform: "scale(1, 1)" },
          "50%": { transform: "scale(1.1, 1.1)" },
        },
      },
      animation: {
        grow: "grow 5s linear infinite",
        "pulse-fast": "pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        zoom: "zoom 1s ease infinite",
      },
    },
  },
};
