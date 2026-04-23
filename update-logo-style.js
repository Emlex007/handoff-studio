const fs = require('fs');

const uiPath = 'c:/Users/EMLEX/Desktop/Plugins/HandOff Studio/ui.html';
let uiHtml = fs.readFileSync(uiPath, 'utf8');

// 1. Update the wrapper div
// currently:
// <div style="background: rgba(255, 255, 255, 0.02); width: 80px; height: 80px; border-radius: 20px; display: flex; align-items: center; justify-content: center; border: 1px solid rgba(255, 255, 255, 0.06); margin-bottom: 28px; box-shadow: inset 0 2px 12px rgba(255,255,255,0.02), 0 8px 32px rgba(0,0,0,0.2);">

// Replace with a clean container with 24px bottom margin
const newDivStyle = "display: flex; align-items: center; justify-content: center; margin-bottom: 24px;";
uiHtml = uiHtml.replace(
    /<div style="background: rgba\(255, 255, 255, 0\.02\); width: 80px; height: 80px; border-radius: 20px; display: flex; align-items: center; justify-content: center; border: 1px solid rgba\(255, 255, 255, 0\.06\); margin-bottom: 28px; box-shadow: inset 0 2px 12px rgba\(255,255,255,0\.02\), 0 8px 32px rgba\(0,0,0,0\.2\);">/,
    `<div style="${newDivStyle}">`
);

// Fallback in case of tiny spaces changes
if (!uiHtml.includes(newDivStyle)) {
    uiHtml = uiHtml.replace(
        /<div style="[^"]*margin-bottom: 28px[^"]*">/,
        `<div style="${newDivStyle}">`
    );
}

// 2. Update the img dimensions
// currently: width="36" height="36"
uiHtml = uiHtml.replace(
    /width="36" height="36" style="object-fit: contain; opacity: 1;" alt="Handoff Logo"/,
    'width="120" height="120" style="object-fit: contain; opacity: 1;" alt="Handoff Logo"'
);

fs.writeFileSync(uiPath, uiHtml, 'utf8');
console.log("Successfully updated empty state styles!");
