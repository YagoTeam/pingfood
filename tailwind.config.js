/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        cream: "#fff8ec",
        blush: "#ffd7e4",
        roseTea: "#f58aaa",
        leaf: "#94d6a4",
        mint: "#dcf7df",
        yolk: "#ffe39a",
        ink: "#51433f"
      },
      boxShadow: {
        soft: "0 18px 45px rgba(162, 103, 90, 0.15)"
      },
      fontFamily: {
        sans: [
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "sans-serif"
        ]
      }
    },
  },
  plugins: [],
};
