import { cleanNode, findVariants, flattenAST } from './astOptimizer';
import { generateTailwind } from './generators/tailwind';
import { generateSwiftUI } from './generators/swiftui';
import { generateFlutter } from './generators/flutter';

figma.showUI(__html__, { width: 450, height: 600 });

// Initialize UI

console.log("Handoff Studio V1.0.0 Active");

let selectionVersion = 0;

async function handleSelection() {
  if (!figma.currentPage.selection.length) return;
  const currentVersion = ++selectionVersion;
  try {
    const selection = figma.currentPage.selection;
    if (selection.length > 0 && selection[0]) {
      const first = selection[0];
      
      const rawAST = cleanNode(first, 0);
      await new Promise(resolve => setTimeout(resolve, 5));
      if (currentVersion !== selectionVersion) return;
      
      const refinedAST = flattenAST(rawAST, 0);
      await new Promise(resolve => setTimeout(resolve, 5));
      if (currentVersion !== selectionVersion) return;
      
      console.log("AST Result:", refinedAST);
      if (refinedAST) {
          refinedAST.foundVariants = findVariants(first);
      }

      await new Promise(resolve => setTimeout(resolve, 5));
      if (currentVersion !== selectionVersion) return;

      if (!refinedAST) {
        figma.ui.postMessage({ type: 'selection-update', ast: null, count: 0 });
        return;
      }
      
      const firstAST = refinedAST;
      
      // We pass the refined (flattened) AST into the generators
      firstAST.reactTailwind = generateTailwind(firstAST, 0);
      firstAST.swiftui = generateSwiftUI(firstAST, 0);
      firstAST.flutter = generateFlutter(firstAST, 0);

      if (selection.length > 1) {
          firstAST.name = "Multiple Selection (" + selection.length + " items - Inspecting Top Item)";
      }

      figma.ui.postMessage({ 
        type: 'selection-update', 
        ast: firstAST, 
        pt: firstAST.pt,
        pb: firstAST.pb,
        pl: firstAST.pl,
        pr: firstAST.pr,
        radius: firstAST.radius,
        border: firstAST.border,
        tokens: rawAST.atoms, // FIX: Use the rawAST.atoms which extracts color tokens
        swiftui: firstAST.swiftui,
        flutter: firstAST.flutter,
        count: selection.length 
      });
    } else {
      figma.ui.postMessage({ type: 'selection-update', ast: null, count: 0 });
    }
  } catch (e: any) {
    console.error("Handoff Studio fatal error:", e);
    figma.ui.postMessage({ type: 'FATAL_ERROR', message: e ? e.message : "Unknown Error" });
    figma.closePlugin("Handoff Studio encountered a critical error: " + (e ? e.message : "Unknown"));
  }
}

try {
  figma.on("selectionchange", handleSelection);
} catch (e) {
  console.warn("Could not bind selectionchange event:", e);
}

// Initial call
// Initial call removed to wait for UI ready
// handleSelection();

figma.ui.onmessage = function(msg: any) {
  if (!msg) return;
  if (msg.type === 'resize') {
    figma.ui.resize(msg.width, msg.height);
  } else if (msg.type === 'init-tracking') {
    console.log("Tracking initialized from UI");
  } else if (msg.type === 'ready') {
    handleSelection();
  }
};

console.log("Plugin Started Successfully");
