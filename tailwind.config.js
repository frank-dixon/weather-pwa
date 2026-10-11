/** weather-pwa: 9/28 portfolio house style (Michroma + IBM Plex, turquoise #0B8A8F on cream). */
module.exports = {
  content: ["./index.html", "./src/js/**/*.js"],
  corePlugins: { preflight: false },
  // Plain words in the JS (el.hidden, filter(), etc.) must not become utilities.
  blocklist: ["hidden", "visible", "filter", "static", "block", "fixed", "table"],
  theme: {
    extend: {
      colors: {
        "ink": {
                "DEFAULT": "#243836",
                "soft": "#4A5654"
        },
        "muted": "#665F57",
        "teal": {
                "DEFAULT": "#0B8A8F",
                "deep": "#087075"
        },
        "sky": "#2F5D8A",
        "paper": {
                "DEFAULT": "#F7F3EA",
                "2": "#FFFDF7"
        },
        "rule": "#D8D0C4"
      },
      fontFamily: {
        sans: ['"IBM Plex Sans"', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'monospace'],
        display: ['Michroma', '"IBM Plex Sans"', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
