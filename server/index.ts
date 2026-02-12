import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { getWorldInfo } from './vrchat-api';

const app = new Hono();

// CORS設定（Electronからのリクエストを許可）
app.use('/*', cors({
  origin: '*',
  credentials: true,
}));

// ヘルスチェック
app.get('/health', (c) => {
  return c.json({ status: 'ok', message: 'VRChat API Server is running' });
});

// ワールド情報取得
app.get('/api/world/:worldId', async (c) => {
  try {
    const worldId = c.req.param('worldId');

    if (!worldId) {
      return c.json({ error: 'World ID is required' }, 400);
    }

    const worldInfo = await getWorldInfo(worldId);

    if (!worldInfo) {
      return c.json({ error: 'World not found' }, 404);
    }

    return c.json({
      id: worldInfo.id,
      name: worldInfo.name,
      authorName: worldInfo.authorName,
      description: worldInfo.description,
      imageUrl: worldInfo.imageUrl,
      thumbnailImageUrl: worldInfo.thumbnailImageUrl,
      visits: worldInfo.visits,
      favorites: worldInfo.favorites,
      capacity: worldInfo.capacity,
      tags: worldInfo.tags,
    });
  } catch (error) {
    console.error('Error fetching world info:', error);
    return c.json({
      error: 'Failed to fetch world information',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

// サーバー起動関数
export function startServer(port: number = 3737) {
  const server = serve({
    fetch: app.fetch,
    port,
  });

  console.log(`🚀 Hono server running on http://localhost:${port}`);

  return server;
}

import { fileURLToPath } from 'node:url';
import process from 'node:process';

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  startServer();
}

export default app;
