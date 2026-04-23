import { renderButtonChildren } from '../utils/dom';

export function generateFlutter(ast: any, depth: number = 0): string {
    if (!ast) return '';
    
    if (ast.type === 'AVATAR') return 'CircleAvatar()';
    if (ast.type === 'BADGE') return 'Chip(label: Text("' + (ast.text || 'Badge') + '"))';
    
    if (ast.type === 'BUTTON') {
       const kidsOutput = renderButtonChildren(ast,
           function(text) { return 'Text("' + text.replace(/"/g, '\\"') + '")'; },
           function(name) { return 'Icon(Icons.' + name.replace(/[^a-zA-Z0-9_]/g, '_') + ')'; }
       ).join(', ');
       
       if ((ast.children || []).length > 1) {
           return 'ElevatedButton(\n  onPressed: () {},\n  child: Row(mainAxisSize: MainAxisSize.min, children: [' + kidsOutput + ']),\n)';
       }
       return 'ElevatedButton(\n  onPressed: () {},\n  child: ' + (kidsOutput || 'Text("Button")') + ',\n)';
    }

    if (ast.type === 'TEXT') return 'Text("' + (ast.text || 'Text').replace(/"/g, '\\"') + '")';
    if (ast.type === 'ICON') {
        return 'Icon(Icons.' + ast.name.replace(/[^a-zA-Z0-9_]/g, '_') + ')';
    }

    const kids = (ast.children || []).map(function(c: any) { return generateFlutter(c, depth + 1); }).filter(Boolean).join(',\n');
    
    if (!ast.layout) return kids;

    const container = ast.layout === 'HORIZONTAL' ? 'Row' : (ast.layout === 'VERTICAL' ? 'Column' : 'Stack');
    if (!kids.trim()) return ast.pt === 0 && ast.pl === 0 ? '' : container + '(children: [])';
    
    const indentedKids = kids.split('\n').map(function(line: string) { return '  ' + line; }).join('\n');
    let res = container + '(\n  children: [\n' + indentedKids + '\n  ],\n)';
    
    if (ast.pt > 0 || ast.pl > 0) res = 'Padding(\n  padding: const EdgeInsets.all(' + Math.max(ast.pt, ast.pl) + '),\n  child: ' + res + ',\n)';
    return res;
}
