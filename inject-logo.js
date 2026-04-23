const fs = require('fs');

const b64 = 'data:image/png;base64,' + fs.readFileSync('C:/Users/EMLEX/.gemini/antigravity/brain/141bf6a4-2c6b-4a78-9d74-6eb4f39dcda5/media__1776794951048.png', 'base64');
const uiPath = 'ui.html';
const srcUiPath = 'src/ui.html';

const regex = /<svg width="120" height="120" viewBox="0 0 64 64" fill="none" xmlns="http:\/\/www.w3.org\/2000\/svg">[\s\S]*?<\/svg>/;
const replacement = '<img src="' + b64 + '" width="120" height="120" style="object-fit: contain; border-radius: 16px;" />';

let uiHtml = fs.readFileSync(uiPath, 'utf8');
if (regex.test(uiHtml)) {
  uiHtml = uiHtml.replace(regex, replacement);
  fs.writeFileSync(uiPath, uiHtml);
  console.log('Successfully replaced logo in ui.html');
} else {
  console.log('Regex did not match in ui.html');
}

if (fs.existsSync(srcUiPath)) {
  let srcUiHtml = fs.readFileSync(srcUiPath, 'utf8');
  if (regex.test(srcUiHtml)) {
    srcUiHtml = srcUiHtml.replace(regex, replacement);
    fs.writeFileSync(srcUiPath, srcUiHtml);
    console.log('Successfully replaced logo in src/ui.html');
  }
}
