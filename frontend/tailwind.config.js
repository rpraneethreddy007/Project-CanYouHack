/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      // Portal-wide palette. Named for what each color MEANS in this app
      // (status/role), not just a hue - "ink"/"paper" are the base
      // surfaces, everything else maps to a real app state so color never
      // shows up purely as decoration:
      //   cobalt  -> primary actions, links, "published"
      //   amber   -> draft / needs-attention (never decorative)
      //   brick   -> errors, destructive actions, high-severity flags
      //   teal    -> success, low-severity/clear signals
      colors: {
        ink: "#131B2E",
        "ink-soft": "#4B5468",
        "ink-faint": "#8891A3",
        paper: "#F2F4F7",
        "paper-line": "#DCE1E9",
        cobalt: {
          DEFAULT: "#2952E3",
          dark: "#1E3EB8",
          soft: "#E8ECFC",
        },
        amber: {
          DEFAULT: "#C98A1B",
          dark: "#9C6B12",
          soft: "#FBF0DC",
        },
        brick: {
          DEFAULT: "#B23A45",
          dark: "#8E2C35",
          soft: "#FBEAEC",
        },
        teal: {
          DEFAULT: "#276657",
          dark: "#1C4C41",
          soft: "#E4F1EC",
        },
      },
      fontFamily: {
        // Headings: Manrope - a geometric-humanist grotesk with real
        // personality at heavy weights, used instead of the more
        // common Inter-everywhere or serif-display choice.
        display: ["Manrope", "sans-serif"],
        // Body/UI text: Inter, for dense forms and tables at small sizes.
        sans: ["Inter", "sans-serif"],
        // Reserved for literal code artifacts (filenames, submission
        // ids) - not used for generic labels.
        mono: ["\"IBM Plex Mono\"", "monospace"],
      },
    },
  },
  plugins: [],
};
