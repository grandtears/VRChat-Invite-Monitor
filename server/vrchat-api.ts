/**
 * VRChat API クライアント
 * 
 * 注意: VRChat APIは利用規約があります。
 * 過度なリクエストは避け、レートリミットを守りましょう。
 * 公式ドキュメント: https://vrchatapi.github.io/
 */

const VRC_API_BASE = 'https://api.vrchat.cloud/api/1';

// 簡易的なキャッシュ（同じワールドの情報を何度もリクエストしない）
const worldCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5分

export interface WorldInfo {
  id: string;
  name: string;
  authorName: string;
  description: string;
  imageUrl: string;
  thumbnailImageUrl: string;
  visits: number;
  favorites: number;
  capacity: number;
  tags: string[];
}

/**
 * ワールド情報を取得
 * 
 * @param worldId - ワールドID (例: wrld_xxxx)
 * @returns ワールド情報、または取得失敗時はnull
 */
export async function getWorldInfo(worldId: string): Promise<WorldInfo | null> {
  try {
    // キャッシュチェック
    const cached = worldCache.get(worldId);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      console.log(`Cache hit for world: ${worldId}`);
      return cached.data;
    }

    // VRChat APIにリクエスト
    const url = `${VRC_API_BASE}/worlds/${worldId}`;
    console.log(`Fetching world info: ${url}`);

    const headers: HeadersInit = {
      'User-Agent': 'VRCInviteMonitor/1.0',
    };

    const response = await fetch(url, { headers });

    if (!response.ok) {
      console.error(`Failed to fetch world info: ${response.status} ${response.statusText}`);

      // 404の場合はワールドが見つからない
      if (response.status === 404) {
        return null;
      }

      throw new Error(`API request failed: ${response.status}`);
    }

    const data = await response.json();

    const worldInfo: WorldInfo = {
      id: data.id,
      name: data.name,
      authorName: data.authorName || 'Unknown',
      description: data.description || '',
      imageUrl: data.imageUrl || '',
      thumbnailImageUrl: data.thumbnailImageUrl || '',
      visits: data.visits || 0,
      favorites: data.favorites || 0,
      capacity: data.capacity || 0,
      tags: data.tags || [],
    };

    // キャッシュに保存
    worldCache.set(worldId, {
      data: worldInfo,
      timestamp: Date.now(),
    });

    return worldInfo;
  } catch (error) {
    console.error(`Error fetching world info for ${worldId}:`, error);
    return null;
  }
}

/**
 * キャッシュをクリア
 */
export function clearCache(): void {
  worldCache.clear();
  console.log('World cache cleared');
}

/**
 * 古いキャッシュを削除
 */
export function cleanupCache(): void {
  const now = Date.now();
  let deletedCount = 0;

  for (const [worldId, cached] of worldCache.entries()) {
    if (now - cached.timestamp > CACHE_DURATION) {
      worldCache.delete(worldId);
      deletedCount++;
    }
  }

  if (deletedCount > 0) {
    console.log(`Cleaned up ${deletedCount} expired cache entries`);
  }
}

// 定期的にキャッシュをクリーンアップ（10分ごと）
setInterval(cleanupCache, 10 * 60 * 1000);
