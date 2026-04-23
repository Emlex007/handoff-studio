import { renderButtonChildren } from '../utils/dom';

export function generateSwiftUI(ast: any, depth: number = 0): string {
    if (!ast) return '';
    
    if (ast.type === 'AVATAR') return 'AvatarView()';
    if (ast.type === 'BADGE') return 'Badge("' + (ast.text || 'Badge') + '")';
    
    if (ast.type === 'BUTTON') {
       const kidsOutput = renderButtonChildren(ast,
           function(text) { return 'Text("' + text.replace(/"/g, '\\"') + '")'; },
           function(name) { return 'Image(systemName: "' + name.replace(/[^a-zA-Z0-9-]/g, '') + '")'; }
       ).join('\n');
       
       if ((ast.children || []).length > 1) {
           return 'Button(action: {}) {\n  HStack {\n' + kidsOutput.split('\n').map(function(l: string){return '    '+l}).join('\n') + '\n  }\n}';
       }
       return 'Button(action: {}) {\n  ' + (kidsOutput || 'Text("Button")') + '\n}';
    }
    
    if (ast.type === 'TEXT') return 'Text("' + (ast.text || 'Text').replace(/"/g, '\\"') + '")';
    if (ast.type === 'ICON') {
        return 'Image(systemName: "' + ast.name.replace(/[^a-zA-Z0-9-]/g, '') + '")';
    }

    const kids = (ast.children || []).map(function(c: any) { return generateSwiftUI(c, depth + 1); }).filter(Boolean).join('\n');
    
    const mods = [];
    if (ast.pt > 0 || ast.pl > 0) mods.push('.padding(' + Math.max(ast.pt, ast.pl) + ')');
    const modStr = mods.length > 0 ? '\n' + mods.map(function(m){ return '  '.repeat(depth) + m; }).join('\n') : '';

    if (!ast.layout) return kids;

    const container = ast.layout === 'HORIZONTAL' ? 'HStack' : (ast.layout === 'VERTICAL' ? 'VStack' : 'ZStack');
    const props = [];
    if (ast.gap > 0) props.push('spacing: ' + ast.gap);
    const propStr = props.length > 0 ? '(' + props.join(', ') + ')' : '';

    if (!kids.trim()) return mods.length === 0 ? '' : (container + propStr + ' {}' + modStr);
    const indentedKids = kids.split('\n').map(function(line: string) { return '  ' + line; }).join('\n');
    return container + propStr + ' {\n' + indentedKids + '\n}' + modStr;
}
