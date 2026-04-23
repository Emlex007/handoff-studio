// Helper functions for code generation

export function escapeHtml(str: string) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

export function getTailwindClasses(node: any) {
   let tw = [];
   if (node.layout === 'HORIZONTAL') tw.push('flex flex-row items-center');
   if (node.layout === 'VERTICAL') tw.push('flex flex-col');
   if (node.gap > 0) tw.push('gap-' + Math.min(Math.round(node.gap / 4), 16));
   
   let pt = Math.min(Math.round(node.pt / 4), 16);
   let pb = Math.min(Math.round(node.pb / 4), 16);
   let pl = Math.min(Math.round(node.pl / 4), 16);
   let pr = Math.min(Math.round(node.pr / 4), 16);
   
   if (pt === pb && pl === pr && pt === pl && pt > 0) tw.push('p-' + pt);
   else {
       if (pt === pb && pt > 0) tw.push('py-' + pt);
       else if (pt > 0 || pb > 0) {
           if (pt > 0) tw.push('pt-' + pt);
           if (pb > 0) tw.push('pb-' + pb);
       }
       if (pl === pr && pl > 0) tw.push('px-' + pl);
       else if (pl > 0 || pr > 0) {
           if (pl > 0) tw.push('pl-' + pl);
           if (pr > 0) tw.push('pr-' + pr);
       }
   }
   
   if (node.hSizing === 'Fill') tw.push('w-full');
   if (node.vSizing === 'Fill') tw.push('h-full');
   return tw.join(' ');
}

export function renderButtonChildren(ast: any, textRenderer: (text: string) => string, iconRenderer: (name: string) => string): string[] {
    return (ast.children || []).map(function(k: any) {
        if (k.type === 'TEXT') return textRenderer(k.text || 'Button');
        if (k.type === 'ICON') return iconRenderer(k.name);
        return '';
    }).filter(Boolean);
}
