function showToast(msg) {
      let t = document.getElementById('toast');
      if (!t) return;
      t.innerText = msg || 'Copied to clipboard!';
      t.style.bottom = '40px';
      t.style.opacity = '1';
      setTimeout(function() {
         t.style.opacity = '0';
         t.style.bottom = '-50px';
      }, 2000);
    }

    function escapeHtml(unsafe) {
      if (unsafe === null || unsafe === undefined) return '';
      return String(unsafe)
           .replace(/&/g, "&amp;")
           .replace(/</g, "&lt;")
           .replace(/>/g, "&gt;")
           .replace(/"/g, "&quot;")
           .replace(/'/g, "&#039;");
    }

    (function() {
      let container = document.getElementById('panel-container');
      let emptyState = document.getElementById('empty-state');
      let currentAST = null;
      let activePanelIndex = 0;
      let isMinimized = false;

      window.currentSnippetFormat = 'css';
      window.currentSnippets = { 
        layout: { css: '', tailwind: '', react: '', swiftui: '', flutter: '' },
        typography: { css: '', tailwind: '', react: '', swiftui: '', flutter: '' },
        color: { css: '', tailwind: '', react: '', swiftui: '', flutter: '' },
        variants: { css: '', tailwind: '', react: '', swiftui: '', flutter: '' }
      };
      
      window.setSnippetTab = function(fmt) {
        window.currentSnippetFormat = fmt;
        document.querySelectorAll('.snip-select').forEach(function(s) {
          if (s.value !== fmt) {
            s.value = fmt;
          }
        });
        if (window.refreshSnippetPreview) window.refreshSnippetPreview();
      };

      window.refreshSnippetPreview = function() {
        let langClassMap = {
           'css': 'language-css',
           'tailwind': 'language-javascript',
           'react': 'language-tsx',
           'swiftui': 'language-javascript',
           'flutter': 'language-javascript'
        };
        let currentLang = langClassMap[window.currentSnippetFormat] || 'language-css';

        document.querySelectorAll('.snippet-preview-box').forEach(function(el) {
          let dom = el.getAttribute('data-domain');
          let snip = window.currentSnippets[dom];
          if (snip && snip[window.currentSnippetFormat]) {
            let rawText = snip[window.currentSnippetFormat];
            let encodedText = escapeHtml(rawText);
            el.innerHTML = '<pre class="line-numbers"><code class="' + currentLang + '">' + encodedText + '</code></pre>';
            if (window.Prism) Prism.highlightElement(el.querySelector('code'));
          } else {
            el.innerHTML = '';
          }
        });
        document.querySelectorAll('.snippet-card').forEach(function(card) {
          let dom = card.getAttribute('data-domain');
          let snip = window.currentSnippets[dom];
          if (!snip || !snip[window.currentSnippetFormat]) card.style.display = 'none';
          else card.style.display = 'flex';
        });
      };

      window.toggleMinimize = function() {
        isMinimized = !isMinimized;
        let container = document.getElementById('panel-container');
        let stickyHeader = document.getElementById('sticky-header');
        let emptyState = document.getElementById('empty-state');
        let minView = document.getElementById('minimized-view');
        let appFooter = document.getElementById('app-footer');
        
        // Setup transition for seamless resize
        document.body.style.transition = 'opacity 0.15s cubic-bezier(0.4, 0, 0.2, 1)';
        document.body.style.opacity = '0';

        setTimeout(function() {
          if (isMinimized) {
            if (container) container.style.display = 'none';
            if (stickyHeader) stickyHeader.style.display = 'none';
            if (emptyState) emptyState.style.display = 'none';
            if (appFooter) appFooter.style.display = 'none';
            if (minView) minView.style.display = 'flex';
            // Minimized view sizing
            parent.postMessage({ pluginMessage: { type: 'resize', width: 90, height: 90 } }, '*');
          } else {
            if (minView) minView.style.display = 'none';
            if (appFooter) appFooter.style.display = 'flex';
            if (currentAST) {
              container.style.display = 'flex';
              stickyHeader.style.display = 'flex';
              emptyState.style.display = 'none';
            } else {
              container.style.display = 'none';
              stickyHeader.style.display = 'none';
              emptyState.style.display = 'flex';
            }
            // Expanded view sizing
            parent.postMessage({ pluginMessage: { type: 'resize', width: 400, height: 660 } }, '*');
          }

          // Allow Figma to complete its resize command, then fade the UI back in
          setTimeout(function() {
             document.body.style.opacity = '1';
          }, 80);
        }, 150);
      };

      window.onmessage = function(event) {
        let msg = event.data.pluginMessage;
        if (!msg) return;
        if (msg.type === 'selection-update') {
          let ast = msg.ast;
          let stickyHeader = document.getElementById('sticky-header');
          currentAST = ast;
          
          if (!ast) {
            if (!isMinimized) {
              container.style.display = 'none';
              stickyHeader.style.display = 'none';
              let errBox = document.getElementById('ext-error');
              if (msg.error) {
                 if (!errBox) {
                    errBox = document.createElement('div');
                    errBox.id = 'ext-error';
                    errBox.style = "padding:20px; color:rgba(255,100,100,0.9); font-family:monospace; font-size:11px; text-align:left; max-width:100%; word-break:break-all;";
                    emptyState.insertBefore(errBox, emptyState.firstChild);
                 }
                 errBox.innerHTML = "<b>CRASH:</b> " + msg.error + "<br/><br/><pre style='white-space:pre-wrap'>" + (msg.stack || "No stack trace") + "</pre>";
              } else if (errBox) {
                 errBox.innerHTML = "";
              }
              emptyState.style.display = 'flex';
            }
            return;
          }
          
          if (!isMinimized) {
            container.style.display = 'flex';
            stickyHeader.style.display = 'flex';
            emptyState.style.display = 'none';
          }
          document.getElementById('layer-instruction').innerHTML = 'Inspecting: <span style="background:#18181B; border:1px solid #3F3F46; color:rgba(255,255,255,0.85); font-weight:500; padding:2px 6px; border-radius:4px; margin-left:4px; font-family: \'JetBrains Mono\', monospace; font-size:11px;">' + escapeHtml(ast.name) + '</span>';
          
          try {
            renderSpecs(ast);
          } catch (e) {
            console.error("UI Render Exception:", e);
            document.getElementById('layer-instruction').innerHTML = '<span style="color:#EF4444;">Selection not supported—try selecting a frame or text layer.</span>';
            if (container) container.style.display = 'none';
          }
        }
      };

      function renderSpecs(ast) {
        let pFormat = function(v) { return (v || 0) + 'px'; };
        document.getElementById('p-t').textContent = pFormat(ast.pt);
        document.getElementById('p-l').textContent = pFormat(ast.pl);
        document.getElementById('p-r').textContent = pFormat(ast.pr);
        document.getElementById('p-b').textContent = pFormat(ast.pb);

        document.getElementById('spec-w').textContent = pFormat(ast.width);
        document.getElementById('spec-h').textContent = pFormat(ast.height);

        let getSizingIcon = function(val) {
          if (val === 'Hug') return '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:4px; display:inline-block; vertical-align:-1px;"><polyline points="4 14 10 14 10 20"/><polyline points="20 10 14 10 14 4"/><line x1="14" y1="10" x2="21" y2="3"/><line x1="3" y1="21" x2="10" y2="14"/></svg>';
          if (val === 'Fill') return '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:4px; display:inline-block; vertical-align:-1px;"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>';
          return '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:4px; display:inline-block; vertical-align:-1px;"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/></svg>';
        };
        let getSizingTooltip = function(val) {
          if (val === 'Hug') return "Adapts size tightly around content";
          if (val === 'Fill') return "Expands to completely fill available parent space";
          return "Fixed absolute dimension independent of content";
        };

        let hSiz = ast.hSizing || 'Fixed';
        let vSiz = ast.vSizing || 'Fixed';
        document.getElementById('spec-hSizing').innerHTML = getSizingIcon(hSiz) + hSiz;
        document.getElementById('spec-vSizing').innerHTML = getSizingIcon(vSiz) + vSiz;
        document.getElementById('pill-w').title = getSizingTooltip(hSiz);
        document.getElementById('pill-h').title = getSizingTooltip(vSiz);
        
        document.getElementById('spec-gap').textContent = (ast.gap || 0) + 'px';

        function formatMixedBadges(valArray, labels) {
          return '<div style="display:flex; gap:6px;">' + valArray.map(function(v, i) {
            return '<span style="background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.05); padding:4px 6px; border-radius:6px; font-size:10px; color:#FFF; display:flex; align-items:center; gap:4px;"><span style="color:let(--text-muted); font-family: Inter;">' + labels[i] + '</span>' + v + 'px</span>';
          }).join('') + '</div>';
        }

        let radiusVal = (ast.radius === undefined || ast.radius === null) ? 0 : ast.radius;
        if (Array.isArray(radiusVal)) {
          document.getElementById('spec-radius').innerHTML = formatMixedBadges(radiusVal, ['TL', 'TR', 'BR', 'BL']);
        } else {
          document.getElementById('spec-radius').textContent = radiusVal + 'px';
        }

        let borderVal = (ast.border === undefined || ast.border === null) ? 0 : ast.border;
        if (Array.isArray(borderVal)) {
          document.getElementById('spec-border').innerHTML = formatMixedBadges(borderVal, ['T', 'R', 'B', 'L']);
        } else {
          document.getElementById('spec-border').textContent = borderVal + 'px';
        }

        let insights = { layout: [], typography: [], color: [], variants: [] };

        renderLimits(ast);
        renderTypography(ast, insights.typography);
        renderTokens(ast);
        renderVariants(ast);

        // Feature 4: Output Snippets Preview
        let genCSS = "";
        let genTW = [];
        if (ast.layout && ast.layout !== 'NONE') {
          genCSS += "display: flex;\n";
          genTW.push("flex");
          if (ast.layout === 'HORIZONTAL') { genCSS += "flex-direction: row;\n"; genTW.push("flex-row"); }
          if (ast.layout === 'VERTICAL') { genCSS += "flex-direction: column;\n"; genTW.push("flex-col"); }
          if (ast.gap > 0) { genCSS += "gap: " + ast.gap + "px;\n"; genTW.push("gap-[" + ast.gap + "px]"); }
        }
        let psum = (ast.pt||0) + (ast.pr||0) + (ast.pb||0) + (ast.pl||0);
        if (psum > 0) {
           genCSS += "padding: " + (ast.pt||0) + "px " + (ast.pr||0) + "px " + (ast.pb||0) + "px " + (ast.pl||0) + "px;\n";
           if (ast.pt === ast.pb && ast.pl === ast.pr && ast.pt === ast.pl) genTW.push("p-[" + ast.pt + "px]");
           else {
               if (ast.pt === ast.pb && ast.pt > 0) genTW.push("py-[" + ast.pt + "px]");
               else if (ast.pt > 0 || ast.pb > 0) { if(ast.pt>0) genTW.push("pt-[" + ast.pt + "px]"); if(ast.pb>0) genTW.push("pb-[" + ast.pb + "px]"); }
               if (ast.pl === ast.pr && ast.pl > 0) genTW.push("px-[" + ast.pl + "px]");
               else if (ast.pl > 0 || ast.pr > 0) { if(ast.pl>0) genTW.push("pl-[" + ast.pl + "px]"); if(ast.pr>0) genTW.push("pr-[" + ast.pr + "px]"); }
           }
        }
        if (ast.hSizing === 'Fill') { genCSS += "width: 100%;\n"; genTW.push("w-full"); }
        else if (ast.hSizing === 'Hug') { genCSS += "width: fit-content;\n"; genTW.push("w-fit"); }
        else if (ast.width) { genCSS += "width: " + ast.width + "px;\n"; genTW.push("w-[" + ast.width + "px]"); }
        
        if (ast.vSizing === 'Fill') { genCSS += "height: 100%;\n"; genTW.push("h-full"); }
        else if (ast.vSizing === 'Hug') { genCSS += "height: fit-content;\n"; genTW.push("h-fit"); }
        else if (ast.height) { genCSS += "height: " + ast.height + "px;\n"; genTW.push("h-[" + ast.height + "px]"); }
        
        if (!Array.isArray(ast.radius) && ast.radius > 0) { genCSS += "border-radius: " + ast.radius + "px;\n"; genTW.push("rounded-[" + ast.radius + "px]"); }
        else if (Array.isArray(ast.radius) && ast.radius.some(function(r) { return r > 0; })) { 
           genCSS += "border-radius: " + ast.radius.join('px ') + "px;\n"; 
           if(ast.radius[0]>0) genTW.push("rounded-tl-[" + ast.radius[0] + "px]");
           if(ast.radius[1]>0) genTW.push("rounded-tr-[" + ast.radius[1] + "px]");
           if(ast.radius[2]>0) genTW.push("rounded-br-[" + ast.radius[2] + "px]");
           if(ast.radius[3]>0) genTW.push("rounded-bl-[" + ast.radius[3] + "px]");
        }

        window.currentSnippets.layout.css = genCSS.trim() || '/* No layout variables exposed */';
        let cName = (ast.name || "Component").replace(/[^a-zA-Z0-9_]/g, '');
        if (!cName || /^\d/.test(cName)) cName = "Component" + cName;
        if (ast.reactTailwind) {
          window.currentSnippets.layout.tailwind = ast.reactTailwind;
          window.currentSnippets.layout.react = "const " + cName + " = () => {\n  return (\n" + ast.reactTailwind.split('\n').map(function(l) { return '    ' + l; }).join('\n') + "\n  );\n};\nexport default " + cName + ";";
        } else {
          window.currentSnippets.layout.tailwind = genTW.length > 0 ? genTW.join(' ') : '/* No tailwind classes generated */';
          window.currentSnippets.layout.react = "const " + cName + " = () => {\n  return (\n    <div className=\"" + genTW.join(' ') + "\">\n      {/* Element content */}\n    </div>\n  );\n};\nexport default " + cName + ";";
        }
        
        if (ast.swiftui) {
           window.currentSnippets.layout.swiftui = "struct " + cName + ": View {\n  let body: some View {\n" + ast.swiftui.split('\n').map(function(l) { return '    ' + l; }).join('\n') + "\n  }\n}";
        } else {
           window.currentSnippets.layout.swiftui = "// No SwiftUI snippet generated";
        }
        
        if (ast.flutter) {
           window.currentSnippets.layout.flutter = "class " + cName + " extends StatelessWidget {\n  @override\n  Widget build(BuildContext context) {\n    return " + ast.flutter + ";\n  }\n}";
        } else {
           window.currentSnippets.layout.flutter = "// No Flutter snippet generated";
        }
        
        if (window.refreshSnippetPreview) window.refreshSnippetPreview();

        // Feature 5: Contextual Intelligence Warnings
        if ((ast.pt !== ast.pb || ast.pl !== ast.pr) && psum > 0) {
          insights.layout.push({
            level: 'INFO',
            title: 'Asymmetric padding detected',
            tooltip: 'May cause misalignment in auto-layout containers if not purely intentional.',
            fix: 'Visually verify alignment intent or sync left/right padding values.',
            layers: [ast.name]
          });
        }
        if (ast.minH !== null && ast.minH > 0 && ast.minH === ast.maxH) {
          insights.layout.push({
            level: 'WARNING',
            title: 'Element lacks vertical responsiveness',
            tooltip: 'Text may clip on smaller screens or if translated into other languages with dynamic length.',
            fix: 'Set height to \'Hug Content\' or remove explicit max-height bindings.',
            layers: [ast.name]
          });
        }
        if ((!ast.layout || ast.layout === 'NONE') && ast.children && ast.children.length > 0) {
          insights.layout.push({
            level: 'CRITICAL',
            title: 'Missing Auto Layout',
            tooltip: 'Container uses absolute positioning. This breaks responsive alignment and scaling in development.',
            fix: 'Add Auto Layout (Shift + A) to establish a clear directional flow.',
            layers: [ast.name]
          });
        }

        let tabNames = ['Layout', 'Typography', 'Color', 'Variants'];
        let tabs = document.querySelectorAll('#sticky-header .tab');

        ['layout', 'typography', 'color', 'variants'].forEach(function(domain, idx) {
          let domainInsights = insights[domain];
          let insightsCard = document.getElementById('insights-' + domain);
          let tabEl = tabs[idx];
          if (!insightsCard) return;

          if (!domainInsights || domainInsights.length === 0) {
            insightsCard.style.display = 'none';
            if (tabEl) tabEl.innerHTML = tabNames[idx];
            return;
          }

          let levelConf = {
            'CRITICAL': { rank: 3, stroke: '#EF4444', bg: 'rgba(239, 68, 68, 0.15)', bgOuter: 'rgba(239, 68, 68, 0.08)', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>' },
            'WARNING':  { rank: 2, stroke: '#FBBF24', bg: 'rgba(251, 191, 36, 0.15)', bgOuter: 'rgba(251, 191, 36, 0.08)', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>' },
            'INFO':     { rank: 1, stroke: '#60A5FA', bg: 'rgba(96, 165, 250, 0.15)', bgOuter: 'rgba(96, 165, 250, 0.08)', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>' }
          };

          let highest = domainInsights[0];
          domainInsights.forEach(function(ins) {
            if (levelConf[ins.level].rank > levelConf[highest.level].rank) highest = ins;
          });

          if (tabEl) {
             tabEl.innerHTML = tabNames[idx] + ' <span style="display:inline-block; width:6px; height:6px; background:' + levelConf[highest.level].stroke + '; border-radius:50%; margin-left:4px; vertical-align:middle; position:relative; top:-1px;"></span>';
          }

          insightsCard.className = 'card insights-card';
          insightsCard.style.display = 'flex';
          insightsCard.style.flexDirection = 'column';
          insightsCard.style.borderColor = 'rgba(255, 255, 255, 0.08)';
          insightsCard.style.backgroundColor = '#1C1C1F'; // Restoring base card so subtle tints pop
          insightsCard.style.padding = '0'; 
          
          let outHTML = '<div class="card-title" style="color: rgba(255, 255, 255, 0.8); background: rgba(255, 255, 255, 0.03); padding: 12px 16px; border-bottom: 1px solid rgba(255, 255, 255, 0.08); border-top-left-radius: 6px; border-top-right-radius: 6px; margin: 0; display: flex; justify-content: space-between; align-items: center; letter-spacing: 0.5px; font-weight: 700; font-size: 10px; text-transform: uppercase;">' +
                          '<div style="display:flex; align-items:center; gap:8px;">' +
                             '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M8 9a4 4 0 1 1 8 0c0 2-2 3-2 5H10c0-2-2-3-2-5z"></path><path d="M10 18h4"></path><path d="M10 21h4"></path></svg> CONTEXTUAL INSIGHTS' +
                          '</div>' +
                        '</div>';

          outHTML += '<div style="padding: 16px; display: flex; flex-direction: column; gap: 16px;">';
          
          outHTML += '<div style="display: flex; flex-direction: column; gap: 8px; font-size: 10px; color: rgba(255,255,255,0.6); padding-bottom: 16px; border-bottom: 1px dashed rgba(255,255,255,0.06); margin-bottom: -4px;">' +
                        '<div style="font-weight: 500; font-size: 11px; color: rgba(255,255,255,0.85); margin-bottom: 2px;">Severity Guide</div>' +
                        '<div style="display: flex; gap: 16px; align-items: center; flex-wrap: wrap;">' +
                          '<div style="display: flex; align-items: center; gap: 6px;"><span style="width: 8px; height: 8px; border-radius: 50%; background: #EF4444; border: 1px solid rgba(239, 68, 68, 0.5);"></span> Critical</div>' +
                          '<div style="display: flex; align-items: center; gap: 6px;"><span style="width: 8px; height: 8px; border-radius: 50%; background: #FBBF24; border: 1px solid rgba(251, 191, 36, 0.5);"></span> Warning</div>' +
                          '<div style="display: flex; align-items: center; gap: 6px;"><span style="width: 8px; height: 8px; border-radius: 50%; background: #60A5FA; border: 1px solid rgba(96, 165, 250, 0.5);"></span> Info</div>' +
                        '</div>' +
                     '</div>';

          outHTML += domainInsights.map(function(i) {
            let c = levelConf[i.level];
            let displayIcon = c.icon;

            let layersHTML = '';
            if (i.layers && i.layers.length > 0) {
              let renderTag = function(ln) {
                return '<span style="background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.05); padding: 2px 6px; border-radius: 4px; color: #E4E4E7; font-family: \'JetBrains Mono\', monospace; font-size: 10px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 150px;" title="' + escapeHtml(ln) + '">' + escapeHtml(ln) + '</span>';
              };
              let layerTags = i.layers.slice(0, 3).map(renderTag).join(' ');
              if (i.layers.length > 3) {
                let hiddenTags = i.layers.slice(3).map(renderTag).join(' ');
                layerTags += '<span onclick="this.style.display=\'none\'; this.nextElementSibling.style.display=\'contents\';" style="color: let(--accent); cursor: pointer; font-size: 10px; font-weight: 600; padding: 2px 4px; display: inline-flex; align-items: center; text-decoration: underline; text-underline-offset: 3px;" onmouseover="this.style.color=\'#34D399\';" onmouseout="this.style.color=\'let(--accent)\';">+' + (i.layers.length - 3) + ' more</span>';
                layerTags += '<span style="display: none;">' + hiddenTags + 
                             '<span onclick="this.parentElement.style.display=\'none\'; this.parentElement.previousElementSibling.style.display=\'inline-flex\';" style="color: rgba(255,255,255,0.5); cursor: pointer; font-size: 10px; font-weight: 600; padding: 2px 4px; margin-left: 2px; display: inline-flex; align-items: center; text-decoration: underline; text-underline-offset: 3px;" onmouseover="this.style.color=\'#fff\';" onmouseout="this.style.color=\'rgba(255,255,255,0.5)\';">Collapse</span></span>';
              }
              layersHTML = '<div style="margin-top: 12px; display: flex; flex-direction: column; gap: 8px;">' +
                             '<div style="font-size: 9px; font-weight: 700; color: rgba(255,255,255,0.4); text-transform: uppercase;">Affected Elements</div>' +
                             '<div style="display: flex; gap: 6px; flex-wrap: wrap;">' + layerTags + '</div>' +
                           '</div>';
            }
            
            return '<div style="background: ' + c.bgOuter + '; border-radius: 8px; border: 1px solid ' + c.bg + '; padding: 16px;">' +
                      '<div style="display: flex; align-items: center; gap: 10px; margin-bottom: 12px;">' +
                         '<span style="color: ' + c.stroke + '; display: flex;">' + displayIcon + '</span>' +
                         '<span style="font-size: 13px; font-weight: 700; color: #fff;">' + escapeHtml(i.title) + '</span>' +
                      '</div>' +
                      '<div style="font-size: 12px; color: rgba(255,255,255,0.7); line-height: 1.5; margin-bottom: 16px; padding-left: 2px;">' + escapeHtml(i.tooltip) + '</div>' +
                      '<div style="height: 1px; background: rgba(255,255,255,0.06); width: 100%; margin-bottom: 16px;"></div>' +
                      '<div style="display: flex; flex-direction: column; gap: 6px; background: rgba(0,0,0,0.25); border: 1px solid rgba(255,255,255,0.04); border-radius: 6px; padding: 12px;">' +
                         '<div style="font-size:10px; font-weight:700; color:rgba(255,255,255,0.4); text-transform:uppercase; letter-spacing:0.5px;">Fix Recommendation</div>' +
                         '<div style="display: flex; gap: 10px; align-items: flex-start;">' +
                           '<span style="color: #10B981; margin-top: 1px;">' +
                             '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>' +
                           '</span>' +
                           '<div style="font-size: 12px; color: rgba(255,255,255,0.8); line-height: 1.6;">' + escapeHtml(i.fix) + '</div>' +
                         '</div>' +
                      '</div>' +
                      layersHTML +
                   '</div>';
          }).join('');

          outHTML += '</div>';
          insightsCard.innerHTML = outHTML;
        });
      }

      window.navTo = function(panelIndex) {
        activePanelIndex = panelIndex;
        let container = document.getElementById('panel-container');
        container.scrollTo({
          left: panelIndex * container.clientWidth,
          behavior: 'smooth'
        });
        
        let tabs = document.querySelectorAll('#sticky-header .tab');
        tabs.forEach((t, i) => {
          if (i === panelIndex) t.classList.add('active');
          else t.classList.remove('active');
        });

        let tabNames = ['Layout & Spacing', 'Typography', 'Color Tokens', 'Variants'];
        let activeBtnSpan = document.querySelector('#btn-copy-active span');
        if (activeBtnSpan) activeBtnSpan.textContent = 'Copy ' + tabNames[panelIndex];
      };

      window.addEventListener('resize', function() {
        let container = document.getElementById('panel-container');
        if (container && container.style.display !== 'none') {
          container.scrollTo({
            left: activePanelIndex * container.clientWidth,
            behavior: 'instant'
          });
        }
      });

      function renderLimits(ast) {
        let output = document.getElementById('limits-output');
        output.innerHTML = '';
        let items = [
          { label: 'Min-Width', val: ast.minW },
          { label: 'Max-Width', val: ast.maxW },
          { label: 'Min-Height', val: ast.minH },
          { label: 'Max-Height', val: ast.maxH }
        ];

        items.forEach(it => {
          let div = document.createElement('div');
          div.style = 'display:flex; justify-content:space-between; font-size:11px;';
          let displayVal = (it.val === null || it.val === undefined || it.val === 0) ? 'None' : it.val + 'px';
          div.innerHTML = `<span style="color:rgba(255,255,255,0.4);">${it.label}</span><span style="font-family:JetBrains Mono;">${displayVal}</span>`;
          output.appendChild(div);
        });
      }

      function renderTypography(ast, insights) {
        let output = document.getElementById('typo-output');
        output.innerHTML = '';
        let styles = {}; 
        function hunt(n) {
          if (n.type === 'TEXT') {
            let key = n.fontFamily + '_' + n.fontWeight + '_' + n.fontSize + '_' + n.lineHeight + '_' + (n.textStyleName || 'none');
            if (!styles[key]) {
              styles[key] = { 
                fontFamily: n.fontFamily, 
                fontWeight: n.fontWeight, 
                fontSize: n.fontSize, 
                lineHeight: n.lineHeight, 
                textStyleName: n.textStyleName,
                sampleText: n.sampleText || "Aa",
                layers: [] 
              };
            }
            if (!styles[key].layers.includes(n.name)) styles[key].layers.push(n.name);

            let lhMatch = (n.lineHeight !== 'Auto') ? n.lineHeight.toString().match(/(\d+)/) : null;
            if (lhMatch && parseInt(lhMatch[0]) === parseInt(n.fontSize)) {
              let tight = insights.find(function(i) { return i.title === 'Tight Line Height Detected'; });
              if (!tight) {
                tight = {
                  level: 'INFO',
                  title: 'Tight Line Height Detected',
                  tooltip: 'Line height equals font size. Text may feel tight and reduce readability.',
                  fix: 'Increase line-height to 120%-150% of font size.',
                  layers: []
                };
                insights.push(tight);
              }
              if (!tight.layers.includes(n.name)) tight.layers.push(n.name);
            }
            if (!n.textStyleName) {
              let unlinked = insights.find(function(i) { return i.title === 'Unlinked Text Style'; });
              if (!unlinked) {
                unlinked = {
                  level: 'WARNING',
                  title: 'Unlinked Text Style',
                  tooltip: 'Found isolated text styles without bound tokens or Figma styles.',
                  fix: 'Bind text layers to standard typography tokens for consistency.',
                  layers: []
                };
                insights.push(unlinked);
              }
              if (!unlinked.layers.includes(n.name)) unlinked.layers.push(n.name);
            }
            if (['Thin', 'ExtraLight', 'Light'].includes(n.fontWeight) && parseInt(n.fontSize) < 14) {
              let contrast = insights.find(function(i) { return i.title === 'Low Contrast Typography'; });
              if (!contrast) {
                contrast = {
                  level: 'WARNING',
                  title: 'Low Contrast Typography',
                  tooltip: 'Using light font weights on small sizes damages legibility.',
                  fix: 'Use Regular or Medium weights for text smaller than 14px.',
                  layers: []
                };
                insights.push(contrast);
              }
              if (!contrast.layers.includes(n.name)) contrast.layers.push(n.name);
            }
          }
          if (n.children) n.children.forEach(hunt);
        }
        hunt(ast);
        
        let keys = Object.keys(styles);
        if (!keys.length) return;

        let groups = { Headings: [], Body: [], Labels: [], Uncategorized: [] };

        keys.forEach(function(k) {
           let s = styles[k];
           let tName = (s.textStyleName || "").toLowerCase();
           if (tName.includes('head') || tName.includes('h1') || tName.includes('h2') || tName.includes('h3') || tName.includes('large') || tName.includes('display')) {
               groups.Headings.push(s);
           } else if (tName.includes('body') || tName.includes('paragraph') || tName.includes('text') || tName.includes('p-')) {
               groups.Body.push(s);
           } else if (tName.includes('label') || tName.includes('caption') || tName.includes('small') || tName.includes('tag')) {
               groups.Labels.push(s);
           } else {
               groups.Uncategorized.push(s);
           }
        });

        let tCSS = "", tTW = "", tRT = "/* Typography Components */\n", tSI = "// SwiftUI Typography Modifiers\n", tFL = "// Flutter Typography Styles\n";

        Object.keys(groups).forEach(function(groupName) {
            if (groups[groupName].length === 0) return;

            let headerDiv = document.createElement('div');
            headerDiv.className = 'typo-group-title';
            headerDiv.innerHTML = `
              <span style="font-size:10px; font-weight:700; color:rgba(255,255,255,0.6); text-transform:uppercase; letter-spacing:0.8px; background:rgba(255,255,255,0.06); padding:4px 8px; border-radius:4px;">${groupName}</span>
            `;
            output.appendChild(headerDiv);

            groups[groupName].forEach(function(s) {
              let context = s.layers.slice(0, 1).join(', ');
              if (s.layers.length > 1) context += '...';
              
              let tokenNameText = s.textStyleName ? escapeHtml(s.textStyleName) : 'Untokenized';
              let tokenColor = s.textStyleName ? 'let(--accent)' : 'let(--text-muted)';
              
              let cssSnippet = "font-family: '" + s.fontFamily + "'; font-size: " + s.fontSize + "px; line-height: " + s.lineHeight + "; font-weight: " + s.fontWeight + ";";
              let twSnippet = "font-['" + s.fontFamily + "'] text-[" + s.fontSize + "px] font-" + (s.fontWeight || "normal").toString().toLowerCase() + " leading-[" + s.lineHeight + "]";
              let reactSnippet = "fontFamily: '" + s.fontFamily + "', fontSize: '" + s.fontSize + "px', lineHeight: '" + s.lineHeight + "', fontWeight: '" + s.fontWeight + "'";

              let rowDiv = document.createElement('div');
              rowDiv.className = 'typo-row-wrapper';
              rowDiv.innerHTML = `
                <div class="typo-row">
                  <div>
                    <div class="t-style" style="margin-bottom: 4px;">${escapeHtml(s.fontFamily)} ${escapeHtml(s.fontWeight)}</div>
                    <div class="t-used" style="color:${tokenColor}; display:flex; align-items:center; gap:6px; font-family: 'JetBrains Mono', monospace; font-size:11px;">
                      <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"></path></svg>
                      ${tokenNameText}
                    </div>
                  </div>
                  <div class="t-mono">${escapeHtml(s.fontSize)}px</div>
                  <div class="t-mono">${escapeHtml(s.lineHeight)}</div>
                </div>
                <div class="t-used" style="opacity: 0.8; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 250px;">Used for: ${escapeHtml(context)}</div>
              `;
              output.appendChild(rowDiv);

              let name = s.textStyleName ? escapeHtml(s.textStyleName).replace(/[^a-zA-Z0-9_]/g, '') : "Text";
              if (!name) name = "Text";
              tCSS += "." + name.toLowerCase() + " {\n  font-family: '" + s.fontFamily + "';\n  font-size: " + s.fontSize + "px;\n  line-height: " + s.lineHeight + ";\n  font-weight: " + s.fontWeight + ";\n}\n\n";
              tTW += "// " + name + "\n<span className=\"font-['" + s.fontFamily + "'] text-[" + s.fontSize + "px] font-" + (s.fontWeight || "normal").toString().toLowerCase() + " leading-[" + s.lineHeight + "]\">...<\\/span>\n\n";
              tRT += "export const " + name + " = ({ children }) => (\n  <span className=\"font-['" + s.fontFamily + "'] text-[" + s.fontSize + "px] font-" + (s.fontWeight || "normal").toString().toLowerCase() + " leading-[" + s.lineHeight + "]\">\n    {children}\n  <\\/span>\n);\n\n";

              let swName = name.charAt(0).toUpperCase() + name.slice(1);
              let familyWeight = s.fontFamily + "-" + (s.fontWeight === 'Regular' ? 'Regular' : s.fontWeight);
              let lSpacing = "4";
              if (s.lineHeight && s.lineHeight.toString().endsWith('px')) {
                 lSpacing = (parseInt(s.lineHeight) - parseInt(s.fontSize)).toString();
              }
              tSI += "struct " + swName + "TextModifier: ViewModifier {\n  func body(content: Content) -> some View {\n    content\n      .font(.custom(\"" + familyWeight + "\", size: " + s.fontSize + "))\n      .lineSpacing(" + lSpacing + ")\n  }\n}\n\nextension View {\n  func " + name.toLowerCase() + "Style() -> some View {\n    self.modifier(" + swName + "TextModifier())\n  }\n}\n\n";

              let lhRatio = "1.4";
              if (s.lineHeight && s.lineHeight.toString().endsWith('px')) {
                 lhRatio = (parseInt(s.lineHeight) / parseInt(s.fontSize)).toFixed(2);
              }
              tFL += "const " + name.toLowerCase() + "Style = TextStyle(\n  fontFamily: '" + s.fontFamily + "',\n  fontSize: " + s.fontSize + ",\n  height: " + lhRatio + ",\n);\n\n";

            });
        });

        window.currentSnippets.typography = { css: tCSS.trim(), tailwind: tTW.trim(), react: tRT.trim(), swiftui: tSI.trim(), flutter: tFL.trim() };
      }

      function renderTokens(ast) {
        let output = document.getElementById('atom-output');
        output.innerHTML = '';
        if (!ast.atoms || !ast.atoms.length) { output.innerHTML = '<p style="font-size:11px; opacity:0.3;">No color tokens found.</p>'; return; }

        ast.atoms.forEach(atom => {
          let name = atom.name.startsWith('$') ? atom.name.substring(1) : atom.name;
          let titleText = name === atom.value ? atom.value : name + ' — ' + atom.value;
          let context = (atom.usages || []).join(', ');
          if (atom.usages && atom.usages.length >= 2) context = atom.usages.slice(0,1).join('') + '...';

          let badgeHtml = '';
          if (atom.wcag) {
            if (atom.wcag.na) {
              badgeHtml = '<div style="display:inline-block; margin-top:6px; font-size:9px; background:rgba(255,255,255,0.06); padding:2px 6px; border-radius:4px; color:let(--text-muted); border:1px solid rgba(255,255,255,0.05);">WCAG: N/A</div>';
            } else {
              let bgStr = atom.wcag.pass ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)';
              let strokeStr = atom.wcag.pass ? '#22C55E' : '#EF4444';
              let label = atom.wcag.pass ? 'Pass (AA)' : 'Fail';
              badgeHtml = '<div style="display:flex; align-items:center; gap:6px; margin-top:6px;">' +
                '<span style="font-size:9px; font-weight:600; background:' + bgStr + '; color:' + strokeStr + '; border:1px solid ' + strokeStr + '; padding:2px 6px; border-radius:4px;">' + label + '</span>' +
                '<span style="font-size:9px; font-family:\'JetBrains Mono\'; color:let(--text-muted); opacity:0.8;">Ratio: ' + atom.wcag.ratio + ':1 (on ' + atom.wcag.bg + ')</span>' +
              '</div>';
            }
          }

          let row = document.createElement('div');
          row.className = 't-row';
          row.style.alignItems = badgeHtml ? 'flex-start' : 'center';
          row.innerHTML = `
            <div class="t-l" style="flex:1; min-width: 0;">
              <div class="t-swatch" style="background: ${escapeHtml(atom.value)}; margin-top:${badgeHtml ? '2px' : '0'};"></div>
              <div style="min-width: 0;">
                <div class="t-name">${escapeHtml(titleText)}</div>
                <div class="t-ctx" title="used for: ${escapeHtml(context)}">used for: ${escapeHtml(context)}</div>
                ${badgeHtml}
              </div>
            </div>
            <div class="t-copy" title="Copy Hex">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect></svg>
            </div>
          `;

          row.querySelector('.t-copy').onclick = function() {
            let ta = document.createElement('textarea'); ta.value = atom.value;
            document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta);
            this.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4ADE80" stroke-width="3"><polyline points="20 6 9 17 4 12"></polyline></svg>';
            showToast('Copied Hex!');
            setTimeout(() => { this.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect></svg>'; }, 1000);
          };
          output.appendChild(row);
        });

        // Generate Color Snippets
        let cCSS = ":root {\n", cTW = "module.exports = {\n  theme: {\n    extend: {\n      colors: {\n", cRT = "export const Colors = {\n", cSI = "import SwiftUI\n\nextension Color {\n", cFL = "import 'package:flutter/material.dart';\n\nclass AppColors {\n";
        ast.atoms.forEach(a => {
           let name = a.name.startsWith('$') ? a.name.substring(1).replace(/[^a-zA-Z0-9_]/g, '-').toLowerCase() : a.name.replace(/[^a-zA-Z0-9_]/g, '-').toLowerCase();
           cCSS += "  --color-" + name + ": " + a.value + ";\n";
           cTW  += "        '" + name + "': '" + a.value + "',\n";
           let camelName = name.replace(/-([a-z])/g, function(g) { return g[1].toUpperCase(); });
           cRT  += "  " + camelName + ": '" + a.value + "',\n";

           cSI += "  static let " + camelName + " = Color(hex: \"" + a.value + "\")\n";
           let flutterHex = a.value.replace('#', '0xFF').toUpperCase();
           cFL += "  static const Color " + camelName + " = Color(" + flutterHex + ");\n";
        });
        cCSS += "}";
        cTW += "      }\n    }\n  }\n}";
        cRT += "};";
        cSI += "}";
        cFL += "}";
        window.currentSnippets.color = { css: cCSS, tailwind: cTW, react: cRT, swiftui: cSI, flutter: cFL };
      }

      function renderVariants(ast) {
        let card = document.getElementById('card-variants');
        let empty = document.getElementById('variants-empty');
        let output = document.getElementById('variant-output');
        let tabVariants = document.getElementById('tab-variants');
        output.innerHTML = '';
        
        let variants = ast.foundVariants || [];
        
        if (variants.length === 0) {
          card.style.display = 'none';
          empty.style.display = 'flex';
          if (tabVariants) tabVariants.classList.add('empty-tab');
          window.currentSnippets.variants = { css: "", tailwind: "", react: "" };
          return;
        }

        card.style.display = 'flex';
        empty.style.display = 'none';
        if (tabVariants) tabVariants.classList.remove('empty-tab');

        let activeIndex = 0;

        function drawProperties() {
          output.innerHTML = '';
          let currentVariant = variants[activeIndex];

          if (variants.length > 1) {
            let selectorWrap = document.createElement('div');
            selectorWrap.style.marginBottom = '16px';
            let headerText = document.createElement('div');
            headerText.innerHTML = '<div style="font-size:11px; color:rgba(255,255,255,0.7); margin-bottom:8px;">Multiple components with variants found:</div>';
            selectorWrap.appendChild(headerText);
            
            let sel = document.createElement('select');
            sel.className = 'snip-select';
            sel.style.width = '100%';
            variants.forEach(function(fv, i) {
              let opt = document.createElement('option');
              opt.value = i;
              opt.innerText = fv.name;
              if (i === activeIndex) opt.selected = true;
              sel.appendChild(opt);
            });
            sel.onchange = function(e) {
              activeIndex = parseInt(e.target.value);
              drawProperties();
            };
            selectorWrap.appendChild(sel);
            output.appendChild(selectorWrap);
            
            let divLine = document.createElement('div');
            divLine.style.borderBottom = '1px solid let(--card-border)';
            divLine.style.marginBottom = '8px';
            output.appendChild(divLine);
          } else {
             let head = document.createElement('div');
             head.style.fontSize = '12px';
             head.style.fontWeight = '500';
             head.style.marginBottom = '12px';
             head.style.color = '#ECECF1';
             head.innerText = currentVariant.name;
             output.appendChild(head);
          }

          let vCSS = "", vTW = "", vRT = "", vSI = "", vFL = "";
          
          if (!currentVariant.variantMenu || Object.keys(currentVariant.variantMenu).length === 0) {
            let emptyTxt = document.createElement('div');
            emptyTxt.style.fontSize = '11px';
            emptyTxt.style.opacity = '0.5';
            emptyTxt.innerText = 'No properties exposed by this component.';
            output.appendChild(emptyTxt);
          } else {
            for (let prop in currentVariant.variantMenu) {
              let m = currentVariant.variantMenu[prop];
              let div = document.createElement('div');
              div.style = 'display:flex; justify-content:space-between; align-items:flex-start; font-size:11px; padding:12px 0; border-bottom:1px solid rgba(255,255,255,0.04); gap:12px;';
              let list = '<div style="display:flex; gap:8px; flex-wrap:wrap; justify-content:flex-end;">' + m.values.map(v => {
                if (v === m.current) return `<span style="color:#4ade80; background:#14532d; padding:4px 8px; border-radius:4px; font-weight:600;">${escapeHtml(v)}</span>`;
                return `<span style="color:let(--text-muted); background:rgba(255,255,255,0.05); padding:4px 8px; border-radius:4px; font-weight:500;">${escapeHtml(v)}</span>`;
              }).join('') + '</div>';
              div.innerHTML = `<span style="color:rgba(255,255,255,0.7); font-weight:500; min-width: 60px; margin-top:6px; font-size:12px;">${escapeHtml(prop)}</span>${list}`;
              output.appendChild(div);

              let safeName = escapeHtml(currentVariant.name || "Component").replace(/[^a-zA-Z0-9]/g, '');
              let safeProp = escapeHtml(prop).replace(/[^a-zA-Z0-9]/g, '');
              vCSS += "/* Variant: " + escapeHtml(currentVariant.name || "Component") + " - " + escapeHtml(prop) + " */\n" + m.values.map(v => "." + safeName.toLowerCase() + "-" + safeProp.toLowerCase() + "-" + escapeHtml(v).toLowerCase().replace(/[^a-zA-Z0-9]/g,'-') + " { /* styles */ }").join('\n') + "\n\n";
              vTW += "/* Tailwind Variant: " + safeName + " " + escapeHtml(prop) + " */\n" + m.values.map(v => "// " + escapeHtml(v) + "\nclassName=\"...\"").join('\n') + "\n\n";
              vRT += "interface " + safeName + "Props {\n  " + safeProp.toLowerCase() + ": " + m.values.map(v => "'" + escapeHtml(v) + "'").join(" | ") + ";\n}\n\n";

              let swiftValues = m.values.map(v => "case " + escapeHtml(v).toLowerCase().replace(/[^a-zA-Z0-9_]/g,'')).join("\n  ");
              vSI += "enum " + safeProp + " {\n  " + swiftValues + "\n}\n\nstruct " + safeName + "Props {\n  let " + safeProp.toLowerCase() + ": " + safeProp + "\n}\n\n";
              
              let flutterValues = m.values.map(v => escapeHtml(v).toLowerCase().replace(/[^a-zA-Z0-9_]/g,'')).join(",\n  ");
              vFL += "enum " + safeProp + " {\n  " + flutterValues + "\n}\n\nclass " + safeName + "Props {\n  final " + safeProp + " " + safeProp.toLowerCase() + ";\n\n  const " + safeName + "Props({required this." + safeProp.toLowerCase() + "});\n}\n\n";
            }
          }
          window.currentSnippets.variants = { css: vCSS.trim(), tailwind: vTW.trim(), react: vRT.trim(), swiftui: vSI.trim(), flutter: vFL.trim() };
          if (window.refreshSnippetPreview) window.refreshSnippetPreview();
        }
        
        drawProperties();
      }

      function getLayoutMd(ast) {
        let formatMdMixed = function(val, labels) {
          if (Array.isArray(val)) return val.map((v, i) => labels[i] + ":" + v).join(' ');
          return (val || 0) + 'px';
        };
        let strLimit = function(v) { return (v === null || v === undefined || v === 0) ? 'None' : v + 'px'; };
        let md = "### 📐 Layout & Spacing\n";
        md += "- **Size**: " + ast.width + "x" + ast.height + "\n";
        md += "- **Padding**: T:" + (ast.pt||0) + " R:" + (ast.pr||0) + " B:" + (ast.pb||0) + " L:" + (ast.pl||0) + "\n";
        md += "- **Gap**: " + (ast.gap||0) + "px\n";
        md += "- **Corner Radius**: " + formatMdMixed(ast.radius, ['TL', 'TR', 'BR', 'BL']) + "\n";
        md += "- **Border**: " + formatMdMixed(ast.border, ['T', 'R', 'B', 'L']) + "\n";
        md += "- **Limits**: MinW:" + strLimit(ast.minW) + " MaxW:" + strLimit(ast.maxW) + " MinH:" + strLimit(ast.minH) + " MaxH:" + strLimit(ast.maxH) + "\n";
        return md;
      }
      
      function getTypoMd(ast) {
        let md = "";
        let uniqueTypos = []; let stylesT = {};
        function huntT(n) {
          if (n.type === 'TEXT') {
            let key = n.fontFamily + n.fontWeight + n.fontSize + n.lineHeight;
            if (!stylesT[key]) { stylesT[key] = { fontFamily: n.fontFamily, fontSize: n.fontSize, lineHeight: n.lineHeight, layers: [] }; uniqueTypos.push(stylesT[key]); }
            if (!stylesT[key].layers.includes(n.name)) stylesT[key].layers.push(n.name);
          }
          if (n.children) n.children.forEach(huntT);
        }
        huntT(ast);
        if (uniqueTypos.length) {
          md += `\n### 📝 Typography\n| Style | Size | Line Height |\n| --- | --- | --- |\n`;
          uniqueTypos.forEach(s => { md += `| ${s.fontFamily} (used for: ${s.layers[0]}) | ${s.fontSize}px | ${s.lineHeight} |\n`; });
        } else {
          md += `\n### 📝 Typography\nNo typography styles detected.\n`;
        }
        return md;
      }
      
      function getColorMd(ast) {
        let md = "";
        if (ast.atoms && ast.atoms.length) {
          md += "\n### 🎨 Color Tokens\n";
          ast.atoms.forEach(a => { 
            let contrastStr = (a.wcag && !a.wcag.na) ? ` | Contrast: ${a.wcag.ratio}:1 (${a.wcag.pass ? 'Pass' : 'Fail'})` : ``;
            md += "- **" + a.name + "** (" + a.value + ") | used for: " + (a.usages||[]).join(', ') + contrastStr + "\n"; 
          });
        } else {
          md += "\n### 🎨 Color Tokens\nNo color tokens detected.\n";
        }
        return md;
      }
      
      function getVariantsMd(ast) {
        let md = "";
        if (ast.variantMenu && Object.keys(ast.variantMenu).length > 0) {
          md += "\n### 🎭 Variants\n";
          for (let prop in ast.variantMenu) {
             let m = ast.variantMenu[prop];
             md += "- **" + prop + "**: " + m.values.map(v => (v === m.current ? `\`${v}\`` : v)).join(', ') + "\n";
          }
        } else {
           md += "\n### 🎭 Variants\nNo variants detected.\n";
        }
        return md;
      }

      function doCopy(text, btnId) {
        let ta = document.createElement('textarea'); ta.value = text;
        document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta);
        showToast('Copied to clipboard!');
        let btnSpan = document.querySelector('#' + btnId + ' span');
        if (btnSpan) {
           let original = btnSpan.textContent;
           btnSpan.textContent = 'Copied!';
           setTimeout(() => { btnSpan.textContent = original; }, 1500);
        }
      }

      window.copyActiveTabMd = function() {
        if (!currentAST) return;
        let base = "# Spec: " + currentAST.name + "\n\n";
        if (activePanelIndex === 0) base += getLayoutMd(currentAST);
        else if (activePanelIndex === 1) base += getTypoMd(currentAST);
        else if (activePanelIndex === 2) base += getColorMd(currentAST);
        else if (activePanelIndex === 3) base += getVariantsMd(currentAST);
        doCopy(base, 'btn-copy-active');
      };
      
      window.copyAllSpecsMd = function() {
        if (!currentAST) return;
        let md = "# Spec: " + currentAST.name + "\n\n";
        md += getLayoutMd(currentAST);
        md += getTypoMd(currentAST);
        md += getColorMd(currentAST);
        md += getVariantsMd(currentAST);
        doCopy(md, 'btn-copy-all');
      };

      window.copySubGroup = function(group, btn, domain) {
        if (!currentAST) return;
        let txt = "";
        if (group === 'snippetBase') {
          let dom = domain || 'layout';
          txt = window.currentSnippets[dom][window.currentSnippetFormat] || '';
        } else if (group === 'padding') {
          txt = "padding: " + (currentAST.pt||0) + "px " + (currentAST.pr||0) + "px " + (currentAST.pb||0) + "px " + (currentAST.pl||0) + "px;";
        } else if (group === 'dimensions') {
          if (currentAST.hSizing === 'Fill') txt += "width: 100%;\n";
          else if (currentAST.hSizing === 'Hug') txt += "width: fit-content;\n";
          else if (currentAST.width) txt += "width: " + currentAST.width + "px;\n";
          if (currentAST.vSizing === 'Fill') txt += "height: 100%;\n";
          else if (currentAST.vSizing === 'Hug') txt += "height: fit-content;\n";
          else if (currentAST.height) txt += "height: " + currentAST.height + "px;";
        }
        let ta = document.createElement('textarea'); ta.value = txt.trim();
        document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta);
        showToast('Copied Snippet!');
        let originalStroke = btn.getAttribute('stroke') || 'currentColor';
        btn.innerHTML = '<polyline points="20 6 9 17 4 12"></polyline>';
        btn.setAttribute('stroke', '#4ADE80');
        setTimeout(function() {
          btn.innerHTML = '<path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>';
          btn.setAttribute('stroke', originalStroke);
        }, 1200);
      };

      window.addEventListener('keydown', function(e) {
        if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
          e.preventDefault();
          if (activePanelIndex < 3) navTo(activePanelIndex + 1);
        } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
          e.preventDefault();
          if (activePanelIndex > 0) navTo(activePanelIndex - 1);
        } else if ((e.metaKey || e.ctrlKey) && e.key === 'c') {
          let sel = window.getSelection().toString();
          if (!sel) {
            e.preventDefault();
            copyActiveTabMd();
          }
        }
      });
    })();
