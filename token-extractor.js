const fs = require('fs');
let code = fs.readFileSync('code.js', 'utf8');

const injection = `
function rgbaToHex(color) {
    if (!color) return '#000000';
    var r = Math.round(color.r * 255);
    var g = Math.round(color.g * 255);
    var b = Math.round(color.b * 255);
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase();
}

function extractColorTokens(node) {
    var atoms = [];
    var map = {};
    
    function addToken(n, fieldName, typeStr) {
        if (!n[fieldName] || n[fieldName] === figma.mixed) return;
        var paints = Array.isArray(n[fieldName]) ? n[fieldName] : [n[fieldName]];
        paints.forEach(function(paint) {
            if (paint.type === 'SOLID' && paint.visible !== false) {
                var hex = rgbaToHex(paint.color);
                var tokenName = hex;
                if (paint.boundVariables && paint.boundVariables.color) {
                     try {
                         var v = figma.variables.getVariableById(paint.boundVariables.color.id);
                         if (v) tokenName = '$' + v.name;
                     } catch(e){}
                }
                // Try from node bound variables if paint doesn't have it explicitly (for older styles)
                if (n.boundVariables && n.boundVariables[fieldName]) {
                    var boundVars = Array.isArray(n.boundVariables[fieldName]) ? n.boundVariables[fieldName] : [n.boundVariables[fieldName]];
                    if(boundVars[0]) {
                        try {
                             var v2 = figma.variables.getVariableById(boundVars[0].id);
                             if (v2) tokenName = '$' + v2.name;
                        } catch(e){}
                    }
                }

                if (!map[hex]) {
                    map[hex] = { name: tokenName, value: hex, usages: [] };
                    atoms.push(map[hex]);
                }
                if (map[hex].usages.indexOf(typeStr) === -1) map[hex].usages.push(typeStr);
            }
        });
    }

    function traverse(n) {
        if ('fills' in n) addToken(n, 'fills', n.type === 'TEXT' ? 'Text' : 'Background');
        if ('strokes' in n) addToken(n, 'strokes', 'Border');
        if ('children' in n && Array.isArray(n.children)) n.children.forEach(traverse);
    }
    
    traverse(node);
    return atoms;
}
`;

// Now let's inject this before cleanNode
const cleanNodeStart = code.indexOf('function cleanNode(node, depth) {');
code = code.substring(0, cleanNodeStart) + injection + '\n' + code.substring(cleanNodeStart);

// Now inside cleanNode, we attach ast.atoms = extractColorTokens(node) ONLY when depth === 0
const attachPoint = code.indexOf("ast.hSizing = 'Fixed'; ast.vSizing = 'Fixed';");
code = code.substring(0, attachPoint + 45) + "\n    if (d === 0) ast.atoms = extractColorTokens(node);" + code.substring(attachPoint + 45);

fs.writeFileSync('code.js', code, 'utf8');
