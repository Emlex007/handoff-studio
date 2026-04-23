// --------------------------------------------------------
// AST Optimizer Middleware
// --------------------------------------------------------

function colorToHex(color: any) {
    if (!color) return '#000000';
    let r = Math.round((color.r !== undefined ? color.r : 0) * 255);
    let g = Math.round((color.g !== undefined ? color.g : 0) * 255);
    let b = Math.round((color.b !== undefined ? color.b : 0) * 255);
    let a = color.a !== undefined ? Math.round(color.a * 255) : 255;
    
    let hex = '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase();
    if (a < 255) hex += a.toString(16).padStart(2, '0').toUpperCase();
    return hex;
}

export function extractColorTokens(node: any) {
    let atoms: any[] = [];
    let map: Record<string, any> = {};
    
    function addToken(n: any, fieldName: string, typeStr: string) {
        if (!n[fieldName] || n[fieldName] === figma.mixed) return;
        let paints = Array.isArray(n[fieldName]) ? n[fieldName] : [n[fieldName]];
        paints.forEach(function(paint: any) {
            if (paint.type === 'SOLID' && paint.visible !== false) {
                let hex = colorToHex(paint.color);
                let tokenName = hex;
                if (paint.boundVariables?.color?.id) {
                     try {
                         let v = figma.variables.getVariableById(paint.boundVariables.color.id);
                         if (v) tokenName = '$' + v.name;
                     } catch(e){}
                }
                // Try from node bound variables if paint doesn't have it explicitly (for older styles)
                if (n.boundVariables?.[fieldName]) {
                    let boundVars = Array.isArray(n.boundVariables[fieldName]) ? n.boundVariables[fieldName] : [n.boundVariables[fieldName]];
                    if(boundVars[0]?.id) {
                        try {
                             let v2 = figma.variables.getVariableById(boundVars[0].id);
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

    function traverse(n: any) {
        if ('fills' in n) addToken(n, 'fills', n.type === 'TEXT' ? 'Text' : 'Background');
        if ('strokes' in n) addToken(n, 'strokes', 'Border');
        if ('children' in n && Array.isArray(n.children)) n.children.forEach(traverse);
    }
    
    traverse(node);
    return atoms;
}

export function cleanNode(node: any, depth: number = 0): any {
  if (depth > 12) return null;
  
  try {
    if (!node || node.removed) return null;
    if ('visible' in node && node.visible === false) return null;

    let ast: any = { type: node.type, name: node.name || 'Unnamed', id: node.id };
    ast.width = Math.round(node.width || 0);
    ast.height = Math.round(node.height || 0);

    ast.pt = 0; ast.pb = 0; ast.pl = 0; ast.pr = 0; ast.gap = 0; ast.border = 0; ast.radius = 0;
    ast.hSizing = 'Fixed'; ast.vSizing = 'Fixed';
    if (depth === 0) ast.atoms = extractColorTokens(node); // Keep atoms internally for UI, but export appropriately

    if (node.type === 'TEXT') {
      ast.text = (node.characters !== figma.mixed) ? node.characters : 'Mixed';
      ast.sampleText = (ast.text && ast.text.length > 0) ? ast.text.trim().substring(0, 2) : 'Aa';
      
      let font = node.fontName;
      if (font !== figma.mixed && font && font.family) {
        ast.fontFamily = font.family;
        ast.fontWeight = font.style;
      }
      ast.fontSize = (node.fontSize !== figma.mixed) ? Math.round(node.fontSize || 0) : 'Mixed';
      let lh = node.lineHeight;
      if (lh !== figma.mixed && lh && lh.unit !== 'AUTO') ast.lineHeight = Math.round(lh.value) + (lh.unit === 'PIXELS' ? 'px' : '%');
      else ast.lineHeight = 'Auto';
      return ast;
    }

    if (['FRAME', 'COMPONENT', 'INSTANCE', 'GROUP', 'COMPONENT_SET'].includes(node.type)) {
      if ('layoutMode' in node && node.layoutMode !== 'NONE') {
        ast.layout = node.layoutMode;
        ast.gap = (typeof node.itemSpacing === 'number') ? Math.round(node.itemSpacing) : 0;
        ast.pt = Math.round(node.paddingTop || 0);
        ast.pb = Math.round(node.paddingBottom || 0);
        ast.pl = Math.round(node.paddingLeft || 0);
        ast.pr = Math.round(node.paddingRight || 0);
        
        let isVertical = node.layoutMode === 'VERTICAL';
        let primarySizing = node.primaryAxisSizingMode;
        let counterSizing = node.counterAxisSizingMode;
        ast.vSizing = isVertical ? ((primarySizing === 'AUTO') ? 'Hug' : (node.layoutGrow === 1 ? 'Fill' : 'Fixed')) : ((counterSizing === 'AUTO') ? 'Hug' : (node.layoutAlign === 'STRETCH' ? 'Fill' : 'Fixed'));
        ast.hSizing = isVertical ? ((counterSizing === 'AUTO') ? 'Hug' : (node.layoutAlign === 'STRETCH' ? 'Fill' : 'Fixed')) : ((primarySizing === 'AUTO') ? 'Hug' : (node.layoutGrow === 1 ? 'Fill' : 'Fixed'));
      }

      if ('cornerRadius' in node) {
        if (node.cornerRadius === figma.mixed) ast.radius = [Math.round(node.topLeftRadius || 0), Math.round(node.topRightRadius || 0), Math.round(node.bottomRightRadius || 0), Math.round(node.bottomLeftRadius || 0)];
        else ast.radius = Math.round(node.cornerRadius || 0);
      }
      
      if ('strokes' in node && Array.isArray(node.strokes) && node.strokes.length > 0) {
        let hasVisibleStroke = node.strokes.some(function(s: any) { return s && s.visible !== false; });
        if (hasVisibleStroke) {
          if ('strokeWeight' in node && node.strokeWeight !== figma.mixed) ast.border = Math.round(node.strokeWeight || 0);
        }
      }

      if ('children' in node && Array.isArray(node.children)) {
         ast.children = node.children.map(function(c: any) { return cleanNode(c, depth + 1); }).filter(Boolean);
      }
      return ast;
    }

    return null;
  } catch (e) {
    return null;
  }
}

// --------------------------------------------------------
// Zero Div Soup Middleware
// --------------------------------------------------------
function isFigmaGenericName(name: string): boolean {
    const lname = name.toLowerCase();
    const generics = ['union', 'subtract', 'intersect', 'exclude', 'vector', 'group', 'frame', 'rectangle', 'ellipse'];
    return generics.some(g => lname.includes(g));
}

function replaceWithIcon(ast: any): boolean {
    if (!ast) return false;
    const lname = (ast.name || '').toLowerCase();
    
    // Explicit icons OR small non-text layoutless nodes act as icons
    if (lname.includes('icon')) return true;
    if (ast.width <= 24 && ast.height <= 24 && ast.type !== 'TEXT' && (!ast.children || ast.children.length === 0)) return true;
    
    return false;
}

export function flattenAST(ast: any, depth: number = 0): any {
    if (!ast) return null;
    
    // Replace complex icons with single self-closing structure
    if (replaceWithIcon(ast)) {
        return {
            type: 'ICON',
            name: ast.name,     
            width: ast.width,
            height: ast.height
        };
    }
    
    // Base case: Text node
    if (ast.type === 'TEXT') {
        return ast;
    }
    
    const lname = (ast.name || '').toLowerCase();
    if (lname.includes('avatar')) {
        return { type: 'AVATAR', name: ast.name };
    }
    if (lname.includes('badge')) {
        // Find text if possible, otherwise keep it as badge
        const textNode = (ast.children || []).find((c: any) => c.type === 'TEXT');
        return { type: 'BADGE', name: ast.name, text: textNode ? textNode.text : 'Badge' };
    }
    
    // Component flattening
    if (lname.includes('button') || lname === 'cta') {
        return flattenButton(ast);
    }
    
    // Process children recursively
    let newChildren = [];
    if (ast.children) {
        for (const child of ast.children) {
            const flatChild = flattenAST(child, depth + 1);
            if (flatChild) {
                // If a child returned an array (meaning it unwrapped itself), push all items
                if (Array.isArray(flatChild)) {
                    newChildren.push(...flatChild);
                } else {
                    newChildren.push(flatChild);
                }
            }
        }
    }
    
    ast.children = newChildren.length > 0 ? newChildren : undefined;
    
    // Unwrap meaningless wrappers (Div Soup standard)
    if (ast.type !== 'BUTTON' && ast.type !== 'ICON' && ast.type !== 'AVATAR') {
        // If it's a wrapper with NO styling properties and NO layout properties
        const hasPadding = (ast.pt > 0 || ast.pb > 0 || ast.pl > 0 || ast.pr > 0);
        const hasGap = ast.gap > 0;
        const hasBorder = ast.border > 0;
        const hasRadius = (Array.isArray(ast.radius) ? ast.radius.some((r:number) => r>0) : ast.radius > 0);
        const isLayout = !!ast.layout;
        const hasMeaningfulSize = (ast.width > 0 && ast.height > 0); // Not always enough to save a wrapper
        
        // If it holds exactly 1 child, and has no meaningful styling
        if (!hasPadding && !hasBorder && (!isLayout || ast.children?.length === 1)) {
            // Strip out generic names if no layout/padding justifies keeping it
            if (isFigmaGenericName(ast.name) && ast.children?.length === 1) {
                return ast.children[0]; // Return the inner child (unwrapping)
            }
            if (ast.children?.length === 1 && !hasMeaningfulSize) {
                return ast.children[0]; // Just unwrapping
            }
        }
        
        // Let's drop empty nodes except icons/dividers
        if ((!ast.children || ast.children.length === 0) && ast.type !== 'TEXT') {
            if (hasBorder || ast.height < 5 || ast.width < 5) {
                // Keep dividers/spacers
                return ast;
            }
            return null; // Drop empty divs
        }
    }

    return ast;
}

function extractKidsFlat(node: any): any[] {
    let res: any[] = [];
    if (node.type === 'TEXT') res.push(node);
    if (replaceWithIcon(node)) res.push({ type: 'ICON', name: node.name });
    
    if (node.children) {
        node.children.forEach(function(c: any) {
            res = res.concat(extractKidsFlat(c));
        });
    }
    // Remove duplicates
    return res.filter(function(v, i, a) {
        return a.findIndex(function(t) {
            if (t.type === 'TEXT' && v.type === 'TEXT') return t.text === v.text;
            if (t.type === 'ICON' && v.type === 'ICON') return t.name === v.name;
            return false;
        }) === i;
    });
}

function flattenButton(ast: any): any {
    const flatKids = extractKidsFlat(ast);
    return {
        ...ast,
        type: 'BUTTON',
        children: flatKids.length > 0 ? flatKids : [{ type: 'TEXT', text: 'Button' }]
    };
}

export function findVariants(node: any) {
  let results: any[] = [];
  let limit = 0;
  
  function walk(n: any) {
    if (limit > 500) return;
    limit++;

    if (n.type === 'INSTANCE' && n.mainComponent && n.mainComponent.parent && n.mainComponent.parent.type === 'COMPONENT_SET') {
      try {
        let set = n.mainComponent.parent;
        let menu: Record<string, any> = {};
        let props = set.variantGroupProperties;
        for (let p in props) {
          menu[p] = { values: props[p].values, current: n.variantProperties[p] };
        }
        if (Object.keys(menu).length > 0) {
          results.push({ name: n.name, id: n.id, variantMenu: menu });
        }
      } catch (e) {}
    } else if (n.variantProperties && Object.keys(n.variantProperties).length > 0) {
      if (n.parent && n.parent.type === 'COMPONENT_SET') {
        try {
          let set = n.parent;
          let menu: Record<string, any> = {};
          let props = set.variantGroupProperties;
          for (let p in props) {
            menu[p] = { values: props[p].values, current: n.variantProperties[p] };
          }
          results.push({ name: n.name, id: n.id, variantMenu: menu });
        } catch(e) {}
      }
    }
    
    if (n.children && n.children.length > 0) {
      n.children.forEach(function(c: any) { walk(c); });
    }
  }

  walk(node);
  return results;
}
