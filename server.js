const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8089;

const MIME_TYPES = {
	'.html': 'text/html; charset=utf-8',
	'.js': 'application/javascript; charset=utf-8',
	'.css': 'text/css; charset=utf-8',
	'.jpg': 'image/jpeg',
	'.jpeg': 'image/jpeg',
	'.png': 'image/png',
	'.gif': 'image/gif',
	'.svg': 'image/svg+xml',
	'.json': 'application/json; charset=utf-8',
	'.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
	// Clean URL path
	let reqPath = decodeURIComponent(req.url.split('?')[0]);
	if (reqPath === '/' || reqPath === '') {
		reqPath = '/index.html';
	}

	const filePath = path.join(__dirname, reqPath);

	// Security: prevent directory traversal
	if (!filePath.startsWith(__dirname)) {
		res.writeHead(403);
		res.end('Forbidden');
		return;
	}

	fs.stat(filePath, (err, stats) => {
		if (err || !stats.isFile()) {
			res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
			res.end('404 Not Found: ' + reqPath);
			return;
		}

		const ext = path.extname(filePath).toLowerCase();
		const contentType = MIME_TYPES[ext] || 'application/octet-stream';

		res.writeHead(200, {
			'Content-Type': contentType,
			'Access-Control-Allow-Origin': '*',
			'Cache-Control': 'no-cache'
		});

		fs.createReadStream(filePath).pipe(res);
	});
});

server.on('error', (err) => {
	if (err.code === 'EADDRINUSE') {
		console.log('====================================================');
		console.log(`  ℹ️  提示: 端口 ${PORT} 已在运行中！`);
		console.log(`  👉 浏览器访问地址: http://localhost:${PORT}/index.html`);
		console.log('====================================================');
	} else {
		console.error('Server error:', err);
	}
});

server.listen(PORT, '0.0.0.0', () => {
	console.log('====================================================');
	console.log('  🎨 3D 现代奢华艺术展厅服务已成功启动！');
	console.log(`  👉 浏览器访问地址: http://localhost:${PORT}/index.html`);
	console.log(`  👉 备用局域网地址: http://127.0.0.1:${PORT}/index.html`);
	console.log('  💡 提示: 请保持此黑色命令行窗口开启');
	console.log('====================================================');
});
