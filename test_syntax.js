const fs = require('fs');

// Read the file and check for basic syntax issues
const content = fs.readFileSync('frontend/app/admin/(tabs)/index.tsx', 'utf8');

// Check for basic syntax issues
const issues = [];

// Check for unmatched braces
const openBraces = (content.match(/{/g) || []).length;
const closeBraces = (content.match(/}/g) || []).length;
if (openBraces !== closeBraces) {
  issues.push(`Unmatched braces: ${openBraces} open, ${closeBraces} close`);
}

// Check for unmatched parentheses
const openParens = (content.match(/\(/g) || []).length;
const closeParens = (content.match(/\)/g) || []).length;
if (openParens !== closeParens) {
  issues.push(`Unmatched parentheses: ${openParens} open, ${closeParens} close`);
}

// Check for unmatched brackets
const openBrackets = (content.match(/\[/g) || []).length;
const closeBrackets = (content.match(/\]/g) || []).length;
if (openBrackets !== closeBrackets) {
  issues.push(`Unmatched brackets: ${openBrackets} open, ${closeBrackets} close`);
}

if (issues.length === 0) {
  console.log('✅ Basic syntax check passed!');
  console.log(`File has ${content.split('\n').length} lines`);
} else {
  console.log('❌ Syntax issues found:');
  issues.forEach(issue => console.log(`  - ${issue}`));
}
