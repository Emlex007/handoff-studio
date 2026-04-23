const fs = require('fs');

const imgPath = 'C:/Users/EMLEX/.gemini/antigravity/brain/96447729-a308-4794-ad13-a0ec81eb8b49/media__1776519509681.png';
const uiPath = 'c:/Users/EMLEX/Desktop/Plugins/HandOff Studio/ui.html';

const imgBuffer = fs.readFileSync(imgPath);
const base64Image = imgBuffer.toString('base64');
const dataUri = `data:image/png;base64,${base64Image}`;

const replacement = `<img src="${dataUri}" width="36" height="36" style="object-fit: contain; opacity: 1;" alt="Handoff Logo" />`;

let uiHtml = fs.readFileSync(uiPath, 'utf8');

// We use regex to carefully grab the old SVG inside the 80x80 container up until the closing div
const pattern = /<svg width="36".*?<\/svg>/s;

if(uiHtml.match(pattern)) {
    uiHtml = uiHtml.replace(pattern, replacement);
    fs.writeFileSync(uiPath, uiHtml, 'utf8');
    console.log("Successfully replaced SVG with base64 image!");
} else {
    console.log("Could not find the SVG pattern in ui.html");
}
