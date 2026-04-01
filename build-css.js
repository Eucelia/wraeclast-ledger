const fs = require('fs');
const path = require('path');
const tailwindcss = require('tailwindcss');
const postcss = require('postcss');
const autoprefixer = require('autoprefixer');

async function buildCSS() {
  const config = require('./tailwind.config.js');
  const inputCSS = fs.readFileSync('./src/dashboard/dashboard.css', 'utf8');

  const result = await postcss([tailwindcss(config), autoprefixer]).process(inputCSS, {
    from: './src/dashboard/dashboard.css',
    to: './dist/dashboard/dashboard.css',
  });

  const distDir = './dist/dashboard';
  if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true });
  }

  fs.writeFileSync('./dist/dashboard/dashboard.css', result.css);
  console.log('✓ CSS built successfully');
}

buildCSS().catch(err => {
  console.error('CSS build failed:', err);
  process.exit(1);
});
