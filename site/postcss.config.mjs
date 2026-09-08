// Stops Vite walking up to the parent app's Tailwind v3 postcss config.
// Tailwind v4 runs through @tailwindcss/vite, not PostCSS.
export default { plugins: {} };
