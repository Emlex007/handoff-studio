const fs = require('fs');
const path = require('path');
const esbuild = require('esbuild');

async function build() {
    // Read .env
    let envVars = {};
    if (fs.existsSync('.env')) {
        const envSrc = fs.readFileSync('.env', 'utf8');
        envSrc.split('\n').forEach(line => {
            const [key, ...rest] = line.split('=');
            if (key && rest.length) {
                envVars[key.trim()] = rest.join('=').trim().replace(/(^"|"$)/g, '');
            }
        });
    }

    const distPath = path.join(__dirname, 'dist');
    if (!fs.existsSync(distPath)) fs.mkdirSync(distPath);

    console.log('Building plugin UI & backend with esbuild...');

    // 1. Build Plugin Backend
    await esbuild.build({
        entryPoints: ['src/plugin.ts'],
        bundle: true,
        outfile: 'dist/code.js',
        target: 'es2020',
        minify: true,
    });

    // 2. Build Plugin Frontend JS (UI)
    const defineVars = {};
    Object.keys(envVars).forEach(key => {
        defineVars[`process.env.${key}`] = `"${envVars[key]}"`;
    });

    await esbuild.build({
        entryPoints: ['src/ui.ts'],
        bundle: true,
        outfile: 'dist/ui.js',
        target: 'es2020',
        minify: true,
        define: defineVars,
    });

    // 3. Assemble single ui.html
    let html = fs.readFileSync('src/ui.html', 'utf8');
    const css = fs.readFileSync('src/ui.css', 'utf8');
    const js = fs.readFileSync('dist/ui.js', 'utf8');
    
    // Replace markers with actual code
    html = html.replace('<!-- INJECT_CSS -->', `<style>\n${css}\n</style>`);
    html = html.replace('<!-- INJECT_JS -->', `<script>\n${js}\n</script>`);
    
    // Replace unhandled env vars directly in HTML (as a fallback)
    Object.keys(envVars).forEach(key => {
        const regex = new RegExp(`process\\.env\\.${key}`, 'g');
        html = html.replace(regex, `"${envVars[key]}"`);
    });

    fs.writeFileSync(path.join(distPath, 'ui.html'), html);
    
    // Clean up temporary UI script
    fs.unlinkSync(path.join(distPath, 'ui.js'));

    // Mod and copy manifest.json
    let manifest = JSON.parse(fs.readFileSync('manifest.json', 'utf8'));
    manifest.main = "code.js";
    manifest.ui = "ui.html";
    fs.writeFileSync(path.join(distPath, 'manifest.json'), JSON.stringify(manifest, null, 2));

    console.log('✅ Build successful! Your production-ready plugin is inside the /dist folder.');
}

build().catch(err => {
    console.error(err);
    process.exit(1);
});
