const fs = require('fs');
const path = require('path');
const axios = require('axios');

const currenciesPath = path.join(__dirname, '../src/types/currencies.ts');
const outputDir = path.join(__dirname, '../public/currencies');

// Ensure output dir
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Read currencies.ts
let content = fs.readFileSync(currenciesPath, 'utf8');

// Better regex for multiline object literals
const currencyMatches = content.match(/\[Currency\.([A-Z_]+)\]:\s*\{[\s\S]*?wikiImageUrl:\s*'([^']+)'\s*,[\s\S]*?\},?/g) || [];

const currencyMap = {};
for (const match of currencyMatches) {
  const enumKeyMatch = match.match(/\[Currency\.([A-Z_]+)\]/);
  const urlMatch = match.match(/wikiImageUrl:\s*'([^']+)'/);
  if (enumKeyMatch && urlMatch) {
    currencyMap[enumKeyMatch[1]] = urlMatch[1];
  }
}

(async () => {
  let success = 0;
  let fail = 0;

  for (const [enumKey, wikiUrl] of Object.entries(currencyMap)) {
    if (!wikiUrl.includes('/images/')) {
      console.log(`Skip non-icon: ${enumKey}`);
      continue;
    }

    const filename = enumKey.toLowerCase().replace(/_/g, '-');
    const filepath = path.join(outputDir, `${filename}.png`);

    try {
      const response = await axios.get(wikiUrl, {
        responseType: 'arraybuffer',
        timeout: 10000
      });
      if (response.status === 200) {
        fs.writeFileSync(filepath, Buffer.from(response.data));
        console.log(`Downloaded: ${filename}.png (${enumKey})`);
        success++;
      } else {
        console.log(`Fail ${response.status}: ${enumKey}`);
        fail++;
      }
    } catch (error) {
      console.log(`Error ${enumKey}: ${error.message}`);
      fail++;
    }
  }

  console.log(`\\nSummary: ${success} success, ${fail} fail. Total matched: ${Object.keys(currencyMap).length}`);
})();

