import fs from 'fs';
import path from 'path';

let content = fs.readFileSync('server.ts', 'utf8');

// Replace the end part with Vercel serverless export
const startServerBlock = `  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
       if (req.path.startsWith('/api')) return res.status(404).end();
       res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(\`Server running on http://localhost:\${PORT}\`);
  });
}

startServer();`;

if (content.includes(startServerBlock)) {
  content = content.replace(startServerBlock, "  return app;\n}\n\nexport default startServer();\n");
} else {
  // alternative replace
  content = content.replace("startServer();", "export default startServer();");
}

fs.mkdirSync('api', { recursive: true });
fs.writeFileSync('api/index.ts', content, 'utf8');
console.log("api/index.ts created successfully.");
