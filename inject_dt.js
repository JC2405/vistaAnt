const fs = require('fs');
const path = require('path');
const dir = path.join('c:/Users/admin/Documents/laravel/ProyectoPractica/vista');

const headTags = `
    <!-- DataTables CSS -->
    <link href="https://cdn.datatables.net/v/bs5/jszip-3.10.1/dt-2.0.2/b-3.0.1/b-colvis-3.0.1/b-html5-3.0.1/b-print-3.0.1/r-3.0.0/datatables.min.css" rel="stylesheet">
`;

const bodyTags = `
    <!-- DataTables JS & Plugins -->
    <script src="https://code.jquery.com/jquery-3.7.1.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.7/pdfmake.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.7/vfs_fonts.js"></script>
    <script src="https://cdn.datatables.net/v/bs5/jszip-3.10.1/dt-2.0.2/b-3.0.1/b-colvis-3.0.1/b-html5-3.0.1/b-print-3.0.1/r-3.0.0/datatables.min.js"></script>
`;

function processDir(currentPath) {
    const items = fs.readdirSync(currentPath);
    for (const item of items) {
        const fullPath = path.join(currentPath, item);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory() && !fullPath.includes('node_modules')) {
            processDir(fullPath);
        } else if (stat.isFile() && fullPath.endsWith('.html')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            let modified = false;

            if (!content.includes('datatables.min.css') && content.includes('</head>')) {
                content = content.replace('</head>', headTags + '\n</head>');
                modified = true;
            }
            if (!content.includes('datatables.min.js') && content.includes('</body>')) {
                content = content.replace('</body>', bodyTags + '\n</body>');
                modified = true;
            }

            if (modified) {
                fs.writeFileSync(fullPath, content);
                console.log('Updated:', fullPath);
            }
        }
    }
}

processDir(dir);
console.log('Done');
