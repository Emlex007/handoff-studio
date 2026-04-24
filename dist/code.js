(() => {
  var __defProp = Object.defineProperty;
  var __defProps = Object.defineProperties;
  var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
  var __getOwnPropSymbols = Object.getOwnPropertySymbols;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __propIsEnum = Object.prototype.propertyIsEnumerable;
  var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __spreadValues = (a, b) => {
    for (var prop in b || (b = {}))
      if (__hasOwnProp.call(b, prop))
        __defNormalProp(a, prop, b[prop]);
    if (__getOwnPropSymbols)
      for (var prop of __getOwnPropSymbols(b)) {
        if (__propIsEnum.call(b, prop))
          __defNormalProp(a, prop, b[prop]);
      }
    return a;
  };
  var __spreadProps = (a, b) => __defProps(a, __getOwnPropDescs(b));
  var __async = (__this, __arguments, generator) => {
    return new Promise((resolve, reject) => {
      var fulfilled = (value) => {
        try {
          step(generator.next(value));
        } catch (e) {
          reject(e);
        }
      };
      var rejected = (value) => {
        try {
          step(generator.throw(value));
        } catch (e) {
          reject(e);
        }
      };
      var step = (x) => x.done ? resolve(x.value) : Promise.resolve(x.value).then(fulfilled, rejected);
      step((generator = generator.apply(__this, __arguments)).next());
    });
  };

  // src/astOptimizer.ts
  function colorToHex(color) {
    if (!color) return "#000000";
    let r = Math.round((color.r !== void 0 ? color.r : 0) * 255);
    let g = Math.round((color.g !== void 0 ? color.g : 0) * 255);
    let b = Math.round((color.b !== void 0 ? color.b : 0) * 255);
    let a = color.a !== void 0 ? Math.round(color.a * 255) : 255;
    let hex = "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase();
    if (a < 255) hex += a.toString(16).padStart(2, "0").toUpperCase();
    return hex;
  }
  function extractColorTokens(node) {
    let atoms = [];
    let map = {};
    function addToken(n, fieldName, typeStr) {
      if (!n[fieldName] || n[fieldName] === figma.mixed) return;
      let paints = Array.isArray(n[fieldName]) ? n[fieldName] : [n[fieldName]];
      paints.forEach(function(paint) {
        var _a, _b, _c, _d;
        if (paint.type === "SOLID" && paint.visible !== false) {
          let hex = colorToHex(paint.color);
          let tokenName = hex;
          if ((_b = (_a = paint.boundVariables) == null ? void 0 : _a.color) == null ? void 0 : _b.id) {
            try {
              let v = figma.variables.getVariableById(paint.boundVariables.color.id);
              if (v) tokenName = "$" + v.name;
            } catch (e) {
            }
          }
          if ((_c = n.boundVariables) == null ? void 0 : _c[fieldName]) {
            let boundVars = Array.isArray(n.boundVariables[fieldName]) ? n.boundVariables[fieldName] : [n.boundVariables[fieldName]];
            if ((_d = boundVars[0]) == null ? void 0 : _d.id) {
              try {
                let v2 = figma.variables.getVariableById(boundVars[0].id);
                if (v2) tokenName = "$" + v2.name;
              } catch (e) {
              }
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
      if ("fills" in n) addToken(n, "fills", n.type === "TEXT" ? "Text" : "Background");
      if ("strokes" in n) addToken(n, "strokes", "Border");
      if ("children" in n && Array.isArray(n.children)) n.children.forEach(traverse);
    }
    traverse(node);
    return atoms;
  }
  function cleanNode(node, depth = 0) {
    if (depth > 12) return null;
    try {
      if (!node || node.removed) return null;
      if ("visible" in node && node.visible === false) return null;
      let ast = { type: node.type, name: node.name || "Unnamed", id: node.id };
      ast.width = Math.round(node.width || 0);
      ast.height = Math.round(node.height || 0);
      ast.pt = 0;
      ast.pb = 0;
      ast.pl = 0;
      ast.pr = 0;
      ast.gap = 0;
      ast.border = 0;
      ast.radius = 0;
      ast.hSizing = "Fixed";
      ast.vSizing = "Fixed";
      if (depth === 0) ast.atoms = extractColorTokens(node);
      if (node.type === "TEXT") {
        ast.text = node.characters !== figma.mixed ? node.characters : "Mixed";
        ast.sampleText = ast.text && ast.text.length > 0 ? ast.text.trim().substring(0, 2) : "Aa";
        let font = node.fontName;
        if (font !== figma.mixed && font && font.family) {
          ast.fontFamily = font.family;
          ast.fontWeight = font.style;
        }
        ast.fontSize = node.fontSize !== figma.mixed ? Math.round(node.fontSize || 0) : "Mixed";
        let lh = node.lineHeight;
        if (lh !== figma.mixed && lh && lh.unit !== "AUTO") ast.lineHeight = Math.round(lh.value) + (lh.unit === "PIXELS" ? "px" : "%");
        else ast.lineHeight = "Auto";
        return ast;
      }
      if (["FRAME", "COMPONENT", "INSTANCE", "GROUP", "COMPONENT_SET"].includes(node.type)) {
        if ("layoutMode" in node && node.layoutMode !== "NONE") {
          ast.layout = node.layoutMode;
          ast.gap = typeof node.itemSpacing === "number" ? Math.round(node.itemSpacing) : 0;
          ast.pt = Math.round(node.paddingTop || 0);
          ast.pb = Math.round(node.paddingBottom || 0);
          ast.pl = Math.round(node.paddingLeft || 0);
          ast.pr = Math.round(node.paddingRight || 0);
          let isVertical = node.layoutMode === "VERTICAL";
          let primarySizing = node.primaryAxisSizingMode;
          let counterSizing = node.counterAxisSizingMode;
          ast.vSizing = isVertical ? primarySizing === "AUTO" ? "Hug" : node.layoutGrow === 1 ? "Fill" : "Fixed" : counterSizing === "AUTO" ? "Hug" : node.layoutAlign === "STRETCH" ? "Fill" : "Fixed";
          ast.hSizing = isVertical ? counterSizing === "AUTO" ? "Hug" : node.layoutAlign === "STRETCH" ? "Fill" : "Fixed" : primarySizing === "AUTO" ? "Hug" : node.layoutGrow === 1 ? "Fill" : "Fixed";
        }
        if ("cornerRadius" in node) {
          if (node.cornerRadius === figma.mixed) ast.radius = [Math.round(node.topLeftRadius || 0), Math.round(node.topRightRadius || 0), Math.round(node.bottomRightRadius || 0), Math.round(node.bottomLeftRadius || 0)];
          else ast.radius = Math.round(node.cornerRadius || 0);
        }
        if ("strokes" in node && Array.isArray(node.strokes) && node.strokes.length > 0) {
          let hasVisibleStroke = node.strokes.some(function(s) {
            return s && s.visible !== false;
          });
          if (hasVisibleStroke) {
            if ("strokeWeight" in node && node.strokeWeight !== figma.mixed) ast.border = Math.round(node.strokeWeight || 0);
          }
        }
        if ("children" in node && Array.isArray(node.children)) {
          ast.children = node.children.map(function(c) {
            return cleanNode(c, depth + 1);
          }).filter(Boolean);
        }
        return ast;
      }
      return null;
    } catch (e) {
      return null;
    }
  }
  function isFigmaGenericName(name) {
    const lname = name.toLowerCase();
    const generics = ["union", "subtract", "intersect", "exclude", "vector", "group", "frame", "rectangle", "ellipse"];
    return generics.some((g) => lname.includes(g));
  }
  function replaceWithIcon(ast) {
    if (!ast) return false;
    const lname = (ast.name || "").toLowerCase();
    if (lname.includes("icon")) return true;
    if (ast.width <= 24 && ast.height <= 24 && ast.type !== "TEXT" && (!ast.children || ast.children.length === 0)) return true;
    return false;
  }
  function flattenAST(ast, depth = 0) {
    var _a, _b, _c;
    if (!ast) return null;
    if (replaceWithIcon(ast)) {
      return {
        type: "ICON",
        name: ast.name,
        width: ast.width,
        height: ast.height
      };
    }
    if (ast.type === "TEXT") {
      return ast;
    }
    const lname = (ast.name || "").toLowerCase();
    if (lname.includes("avatar")) {
      return { type: "AVATAR", name: ast.name };
    }
    if (lname.includes("badge")) {
      const textNode = (ast.children || []).find((c) => c.type === "TEXT");
      return { type: "BADGE", name: ast.name, text: textNode ? textNode.text : "Badge" };
    }
    if (lname.includes("button") || lname === "cta") {
      return flattenButton(ast);
    }
    let newChildren = [];
    if (ast.children) {
      for (const child of ast.children) {
        const flatChild = flattenAST(child, depth + 1);
        if (flatChild) {
          if (Array.isArray(flatChild)) {
            newChildren.push(...flatChild);
          } else {
            newChildren.push(flatChild);
          }
        }
      }
    }
    ast.children = newChildren.length > 0 ? newChildren : void 0;
    if (ast.type !== "BUTTON" && ast.type !== "ICON" && ast.type !== "AVATAR") {
      const hasPadding = ast.pt > 0 || ast.pb > 0 || ast.pl > 0 || ast.pr > 0;
      const hasGap = ast.gap > 0;
      const hasBorder = ast.border > 0;
      const hasRadius = Array.isArray(ast.radius) ? ast.radius.some((r) => r > 0) : ast.radius > 0;
      const isLayout = !!ast.layout;
      const hasMeaningfulSize = ast.width > 0 && ast.height > 0;
      if (!hasPadding && !hasBorder && (!isLayout || ((_a = ast.children) == null ? void 0 : _a.length) === 1)) {
        if (isFigmaGenericName(ast.name) && ((_b = ast.children) == null ? void 0 : _b.length) === 1) {
          return ast.children[0];
        }
        if (((_c = ast.children) == null ? void 0 : _c.length) === 1 && !hasMeaningfulSize) {
          return ast.children[0];
        }
      }
      if ((!ast.children || ast.children.length === 0) && ast.type !== "TEXT") {
        if (hasBorder || ast.height < 5 || ast.width < 5) {
          return ast;
        }
        return null;
      }
    }
    return ast;
  }
  function extractKidsFlat(node) {
    let res = [];
    if (node.type === "TEXT") res.push(node);
    if (replaceWithIcon(node)) res.push({ type: "ICON", name: node.name });
    if (node.children) {
      node.children.forEach(function(c) {
        res = res.concat(extractKidsFlat(c));
      });
    }
    return res.filter(function(v, i, a) {
      return a.findIndex(function(t) {
        if (t.type === "TEXT" && v.type === "TEXT") return t.text === v.text;
        if (t.type === "ICON" && v.type === "ICON") return t.name === v.name;
        return false;
      }) === i;
    });
  }
  function flattenButton(ast) {
    const flatKids = extractKidsFlat(ast);
    return __spreadProps(__spreadValues({}, ast), {
      type: "BUTTON",
      children: flatKids.length > 0 ? flatKids : [{ type: "TEXT", text: "Button" }]
    });
  }
  function findVariants(node) {
    let results = [];
    let limit = 0;
    function walk(n) {
      if (limit > 500) return;
      limit++;
      if (n.type === "INSTANCE" && n.mainComponent && n.mainComponent.parent && n.mainComponent.parent.type === "COMPONENT_SET") {
        try {
          let set = n.mainComponent.parent;
          let menu = {};
          let props = set.variantGroupProperties;
          for (let p in props) {
            menu[p] = { values: props[p].values, current: n.variantProperties[p] };
          }
          if (Object.keys(menu).length > 0) {
            results.push({ name: n.name, id: n.id, variantMenu: menu });
          }
        } catch (e) {
        }
      } else if (n.variantProperties && Object.keys(n.variantProperties).length > 0) {
        if (n.parent && n.parent.type === "COMPONENT_SET") {
          try {
            let set = n.parent;
            let menu = {};
            let props = set.variantGroupProperties;
            for (let p in props) {
              menu[p] = { values: props[p].values, current: n.variantProperties[p] };
            }
            results.push({ name: n.name, id: n.id, variantMenu: menu });
          } catch (e) {
          }
        }
      }
      if (n.children && n.children.length > 0) {
        n.children.forEach(function(c) {
          walk(c);
        });
      }
    }
    walk(node);
    return results;
  }

  // src/utils/dom.ts
  function escapeHtml(str) {
    if (!str) return "";
    return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
  }
  function getTailwindClasses(node) {
    let tw = [];
    if (node.layout === "HORIZONTAL") tw.push("flex flex-row items-center");
    if (node.layout === "VERTICAL") tw.push("flex flex-col");
    if (node.gap > 0) tw.push("gap-" + Math.min(Math.round(node.gap / 4), 16));
    let pt = Math.min(Math.round(node.pt / 4), 16);
    let pb = Math.min(Math.round(node.pb / 4), 16);
    let pl = Math.min(Math.round(node.pl / 4), 16);
    let pr = Math.min(Math.round(node.pr / 4), 16);
    if (pt === pb && pl === pr && pt === pl && pt > 0) tw.push("p-" + pt);
    else {
      if (pt === pb && pt > 0) tw.push("py-" + pt);
      else if (pt > 0 || pb > 0) {
        if (pt > 0) tw.push("pt-" + pt);
        if (pb > 0) tw.push("pb-" + pb);
      }
      if (pl === pr && pl > 0) tw.push("px-" + pl);
      else if (pl > 0 || pr > 0) {
        if (pl > 0) tw.push("pl-" + pl);
        if (pr > 0) tw.push("pr-" + pr);
      }
    }
    if (node.hSizing === "Fill") tw.push("w-full");
    if (node.vSizing === "Fill") tw.push("h-full");
    return tw.join(" ");
  }
  function renderButtonChildren(ast, textRenderer, iconRenderer) {
    return (ast.children || []).map(function(k) {
      if (k.type === "TEXT") return textRenderer(k.text || "Button");
      if (k.type === "ICON") return iconRenderer(k.name);
      return "";
    }).filter(Boolean);
  }

  // src/generators/tailwind.ts
  function generateTailwind(ast, depth = 0) {
    if (!ast) return "";
    const lname = (ast.name || "").toLowerCase();
    if (ast.type === "AVATAR") return "<Avatar />\n";
    if (ast.type === "BADGE") return "<Badge>" + escapeHtml(ast.text || "Badge") + "</Badge>";
    if (ast.type === "BUTTON") {
      const kidsOutput = renderButtonChildren(
        ast,
        function(text) {
          return escapeHtml(text);
        },
        function(name) {
          return '<Icon name="' + name.replace(/[^a-zA-Z0-9-]/g, "") + '" className="w-4 h-4 mr-2" />';
        }
      ).join(" ");
      return "<Button>" + (kidsOutput || "Button") + "</Button>";
    }
    if (ast.type === "TEXT") {
      const txt = escapeHtml(ast.text || "Text");
      return depth === 0 ? '<span className="text-sm">' + txt + "</span>" : txt;
    }
    if (ast.type === "ICON") {
      return '<Icon name="' + ast.name.replace(/[^a-zA-Z0-9-]/g, "") + '" className="w-4 h-4" />';
    }
    const kids = (ast.children || []).map(function(c) {
      return generateTailwind(c, depth + 1);
    }).filter(Boolean).join("\n");
    const tw = getTailwindClasses(ast);
    let tag = "div";
    if (lname.includes("header")) tag = "header";
    else if (lname.includes("nav")) tag = "nav";
    else if (lname.includes("section")) tag = "section";
    else if (lname === "list" || lname === "ul") tag = "ul";
    else if (lname === "item" || lname === "li") tag = "li";
    const clsStr = tw ? ' className="' + tw + '"' : "";
    if (!kids.trim()) return "<" + tag + clsStr + " />";
    const indentedKids = kids.split("\n").map(function(line) {
      return "  " + line;
    }).join("\n");
    return "<" + tag + clsStr + ">\n" + indentedKids + "\n</" + tag + ">";
  }

  // src/generators/swiftui.ts
  function generateSwiftUI(ast, depth = 0) {
    if (!ast) return "";
    if (ast.type === "AVATAR") return "AvatarView()";
    if (ast.type === "BADGE") return 'Badge("' + (ast.text || "Badge") + '")';
    if (ast.type === "BUTTON") {
      const kidsOutput = renderButtonChildren(
        ast,
        function(text) {
          return 'Text("' + text.replace(/"/g, '\\"') + '")';
        },
        function(name) {
          return 'Image(systemName: "' + name.replace(/[^a-zA-Z0-9-]/g, "") + '")';
        }
      ).join("\n");
      if ((ast.children || []).length > 1) {
        return "Button(action: {}) {\n  HStack {\n" + kidsOutput.split("\n").map(function(l) {
          return "    " + l;
        }).join("\n") + "\n  }\n}";
      }
      return "Button(action: {}) {\n  " + (kidsOutput || 'Text("Button")') + "\n}";
    }
    if (ast.type === "TEXT") return 'Text("' + (ast.text || "Text").replace(/"/g, '\\"') + '")';
    if (ast.type === "ICON") {
      return 'Image(systemName: "' + ast.name.replace(/[^a-zA-Z0-9-]/g, "") + '")';
    }
    const kids = (ast.children || []).map(function(c) {
      return generateSwiftUI(c, depth + 1);
    }).filter(Boolean).join("\n");
    const mods = [];
    if (ast.pt > 0 || ast.pl > 0) mods.push(".padding(" + Math.max(ast.pt, ast.pl) + ")");
    const modStr = mods.length > 0 ? "\n" + mods.map(function(m) {
      return "  ".repeat(depth) + m;
    }).join("\n") : "";
    if (!ast.layout) return kids;
    const container = ast.layout === "HORIZONTAL" ? "HStack" : ast.layout === "VERTICAL" ? "VStack" : "ZStack";
    const props = [];
    if (ast.gap > 0) props.push("spacing: " + ast.gap);
    const propStr = props.length > 0 ? "(" + props.join(", ") + ")" : "";
    if (!kids.trim()) return mods.length === 0 ? "" : container + propStr + " {}" + modStr;
    const indentedKids = kids.split("\n").map(function(line) {
      return "  " + line;
    }).join("\n");
    return container + propStr + " {\n" + indentedKids + "\n}" + modStr;
  }

  // src/generators/flutter.ts
  function generateFlutter(ast, depth = 0) {
    if (!ast) return "";
    if (ast.type === "AVATAR") return "CircleAvatar()";
    if (ast.type === "BADGE") return 'Chip(label: Text("' + (ast.text || "Badge") + '"))';
    if (ast.type === "BUTTON") {
      const kidsOutput = renderButtonChildren(
        ast,
        function(text) {
          return 'Text("' + text.replace(/"/g, '\\"') + '")';
        },
        function(name) {
          return "Icon(Icons." + name.replace(/[^a-zA-Z0-9_]/g, "_") + ")";
        }
      ).join(", ");
      if ((ast.children || []).length > 1) {
        return "ElevatedButton(\n  onPressed: () {},\n  child: Row(mainAxisSize: MainAxisSize.min, children: [" + kidsOutput + "]),\n)";
      }
      return "ElevatedButton(\n  onPressed: () {},\n  child: " + (kidsOutput || 'Text("Button")') + ",\n)";
    }
    if (ast.type === "TEXT") return 'Text("' + (ast.text || "Text").replace(/"/g, '\\"') + '")';
    if (ast.type === "ICON") {
      return "Icon(Icons." + ast.name.replace(/[^a-zA-Z0-9_]/g, "_") + ")";
    }
    const kids = (ast.children || []).map(function(c) {
      return generateFlutter(c, depth + 1);
    }).filter(Boolean).join(",\n");
    if (!ast.layout) return kids;
    const container = ast.layout === "HORIZONTAL" ? "Row" : ast.layout === "VERTICAL" ? "Column" : "Stack";
    if (!kids.trim()) return ast.pt === 0 && ast.pl === 0 ? "" : container + "(children: [])";
    const indentedKids = kids.split("\n").map(function(line) {
      return "  " + line;
    }).join("\n");
    let res = container + "(\n  children: [\n" + indentedKids + "\n  ],\n)";
    if (ast.pt > 0 || ast.pl > 0) res = "Padding(\n  padding: const EdgeInsets.all(" + Math.max(ast.pt, ast.pl) + "),\n  child: " + res + ",\n)";
    return res;
  }

  // src/plugin.ts
  try {
    figma.showUI(__html__, { themeColors: true, width: 450, height: 600 });
    console.log("Handoff Studio V1.0.0 Active");
    let selectionVersion = 0;
    function handleSelection() {
      return __async(this, null, function* () {
        try {
          if (!figma.currentPage || !figma.currentPage.selection || !figma.currentPage.selection.length) {
            figma.ui.postMessage({ type: "selection-update", ast: null });
            return;
          }
          const currentVersion = ++selectionVersion;
          const selection = figma.currentPage.selection;
          if (selection.length > 0 && selection[0]) {
            const first = selection[0];
            const rawAST = cleanNode(first, 0);
            yield new Promise((resolve) => setTimeout(resolve, 5));
            if (currentVersion !== selectionVersion) return;
            const refinedAST = flattenAST(rawAST, 0);
            yield new Promise((resolve) => setTimeout(resolve, 5));
            if (currentVersion !== selectionVersion) return;
            console.log("AST Result:", refinedAST);
            if (refinedAST) {
              refinedAST.foundVariants = findVariants(first);
            }
            yield new Promise((resolve) => setTimeout(resolve, 5));
            if (currentVersion !== selectionVersion) return;
            if (!refinedAST) {
              figma.ui.postMessage({ type: "selection-update", ast: null, count: 0 });
              return;
            }
            const firstAST = refinedAST;
            firstAST.reactTailwind = generateTailwind(firstAST, 0);
            firstAST.swiftui = generateSwiftUI(firstAST, 0);
            firstAST.flutter = generateFlutter(firstAST, 0);
            if (selection.length > 1) {
              firstAST.name = "Multiple Selection (" + selection.length + " items - Inspecting Top Item)";
            }
            figma.ui.postMessage({
              type: "selection-update",
              ast: firstAST,
              pt: firstAST.pt,
              pb: firstAST.pb,
              pl: firstAST.pl,
              pr: firstAST.pr,
              radius: firstAST.radius,
              border: firstAST.border,
              tokens: rawAST.atoms,
              // FIX: Use the rawAST.atoms which extracts color tokens
              swiftui: firstAST.swiftui,
              flutter: firstAST.flutter,
              count: selection.length
            });
          } else {
            figma.ui.postMessage({ type: "selection-update", ast: null, count: 0 });
          }
        } catch (e) {
          console.error("Handoff Studio fatal error:", e);
          figma.ui.postMessage({ type: "FATAL_ERROR", message: e ? e.message : "Unknown Error" });
          figma.closePlugin("Handoff Studio encountered a critical error: " + (e ? e.message : "Unknown"));
        }
      });
    }
    try {
      figma.on("selectionchange", handleSelection);
    } catch (e) {
      console.warn("Could not bind selectionchange event:", e);
    }
    figma.ui.onmessage = function(msg) {
      try {
        if (!msg) return;
        if (msg.type === "resize") {
          figma.ui.resize(msg.width, msg.height);
        } else if (msg.type === "init-tracking") {
          console.log("Tracking initialized from UI");
        } else if (msg.type === "ready") {
          handleSelection();
        }
      } catch (e) {
        console.error("onmessage error", e);
      }
    };
    console.log("Plugin Started Successfully");
  } catch (globalCrash) {
    console.error("GLOBAL CRASH:", globalCrash);
    figma.notify("GLOBAL CRASH: " + globalCrash.message, { timeout: 1e4 });
    figma.ui.postMessage({
      type: "selection-update",
      ast: null,
      error: "Global Code Init Error: " + globalCrash.message,
      stack: globalCrash.stack
    });
  }
})();
