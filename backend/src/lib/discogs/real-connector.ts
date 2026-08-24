import type {
  DiscogsConnector,
  DiscogsRelease,
  DiscogsReleaseSummary,
  PublishedListing,
  PublishListingInput,
} from './types';
import { createMockConnector } from './mock-connector';

const API_BASE = 'https://api.discogs.com';
// Discogs rejette les requetes sans User-Agent identifiable.
const USER_AGENT = 'VinylBackofficeTest/0.1';

interface DiscogsSearchResult {
  id: number;
  master_id?: number;
  title: string;
  year?: string;
  country?: string;
  format?: string[];
  label?: string[];
  thumb?: string;
  cover_image?: string;
}

// Les resultats de recherche Discogs arrivent au format "Artiste - Titre".
function splitTitle(raw: string): { artist: string; title: string } {
  const separator = raw.indexOf(' - ');
  if (separator === -1) return { artist: '', title: raw };
  return {
    artist: raw.slice(0, separator).trim(),
    title: raw.slice(separator + 3).trim(),
  };
}

export function createRealConnector(token: string): DiscogsConnector {
  const mock = createMockConnector();

  async function request<T>(path: string): Promise<T> {
    const url = new URL(`${API_BASE}${path}`);
    url.searchParams.set('token', token);
    const response = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
    });
    if (!response.ok) {
      throw new Error(`Discogs API error ${response.status} on ${path}`);
    }
    return (await response.json()) as T;
  }

  return {
    mode: 'real',

    async searchReleases(query: string): Promise<DiscogsReleaseSummary[]> {
      const q = query.trim();
      if (!q) return [];
      const data = await request<{ results: DiscogsSearchResult[] }>(
        `/database/search?type=release&per_page=10&q=${encodeURIComponent(q)}`,
      );
      return data.results.map((result) => {
        const { artist, title } = splitTitle(result.title);
        return {
          releaseId: String(result.id),
          masterId: result.master_id ? String(result.master_id) : undefined,
          title,
          artist,
          year: result.year ? parseInt(result.year, 10) : undefined,
          country: result.country,
          format: result.format?.join(', '),
          label: result.label?.[0],
          thumbUrl: result.thumb,
          coverUrl: result.cover_image,
        };
      });
    },

    async getRelease(releaseId: string): Promise<DiscogsRelease | null> {
      try {
        const data = await request<{
          id: number;
          master_id?: number;
          title: string;
          artists?: { name: string }[];
          year?: number;
          country?: string;
          formats?: { name: string; qty: string }[];
          labels?: { name: string }[];
          genres?: string[];
          styles?: string[];
          thumb?: string;
        }>(`/releases/${encodeURIComponent(releaseId)}`);
        const format = data.formats
          ?.map((f) => (parseInt(f.qty, 10) > 1 ? `${f.qty}x${f.name}` : f.name))
          .join(', ');
        return {
          releaseId: String(data.id),
          masterId: data.master_id ? String(data.master_id) : undefined,
          title: data.title,
          artist: data.artists?.map((a) => a.name).join(', ') ?? '',
          year: data.year,
          country: data.country,
          format,
          label: data.labels?.[0]?.name,
          genres: data.genres,
          styles: data.styles,
          thumbUrl: data.thumb,
        };
      } catch (error) {
        if (error instanceof Error && error.message.includes(' 404 ')) return null;
        throw error;
      }
    },

    // Volontairement simule meme en mode "real" : publier creerait une vraie
    // annonce sur la marketplace. Les lectures sont reelles, les ecritures non.
    async publishListing(input: PublishListingInput): Promise<PublishedListing> {
      return mock.publishListing(input);
    },
  };
}
