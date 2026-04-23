import { escapeHtml, getTailwindClasses, renderButtonChildren } from '../utils/dom';

export function generateTailwind(ast: any, depth: number = 0): string {
    if (!ast) return '';
    const lname = (ast.name || '').toLowerCase();
    
    // Component mappings
    if (ast.type === 'AVATAR') return '<Avatar />\n';
    if (ast.type === 'BADGE') return '<Badge>' + escapeHtml(ast.text || 'Badge') + '</Badge>';
    
    if (ast.type === 'BUTTON') {
       const kidsOutput = renderButtonChildren(ast, 
           function(text) { return escapeHtml(text); }, 
           function(name) { return '<Icon name="' + name.replace(/[^a-zA-Z0-9-]/g, '') + '" className="w-4 h-4 mr-2" />'; }
       ).join(' ');
       return '<Button>' + (kidsOutput || 'Button') + '</Button>';
    }

    if (ast.type === 'TEXT') {
        const txt = escapeHtml(ast.text || 'Text');
        return depth === 0 ? '<span className="text-sm">' + txt + '</span>' : txt;
    }
    
    if (ast.type === 'ICON') {
        return '<Icon name="' + ast.name.replace(/[^a-zA-Z0-9-]/g, '') + '" className="w-4 h-4" />';
    }

    const kids = (ast.children || []).map(function(c: any) { return generateTailwind(c, depth + 1); }).filter(Boolean).join('\n');
    const tw = getTailwindClasses(ast);
    
    // Semantic Map
    let tag = 'div';
    if (lname.includes('header')) tag = 'header';
    else if (lname.includes('nav')) tag = 'nav';
    else if (lname.includes('section')) tag = 'section';
    else if (lname === 'list' || lname === 'ul') tag = 'ul';
    else if (lname === 'item' || lname === 'li') tag = 'li';
    
    const clsStr = tw ? ' className="' + tw + '"' : '';
    
    if (!kids.trim()) return '<' + tag + clsStr + ' />';
    
    const indentedKids = kids.split('\n').map(function(line: string) { return '  ' + line; }).join('\n');
    return '<' + tag + clsStr + '>\n' + indentedKids + '\n</' + tag + '>';
}
