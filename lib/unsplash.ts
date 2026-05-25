export interface UnsplashPhoto {
  url: string;
  thumb: string;
  credit: { name: string; link: string };
}

export async function searchUnsplash(query: string, count = 6): Promise<UnsplashPhoto[]> {
  const key = process.env.UNSPLASH_ACCESS_KEY;
  if (!key) return [];

  const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=${count}&orientation=landscape`;
  const res = await fetch(url, {
    headers: { Authorization: `Client-ID ${key}` },
    next: { revalidate: 3600 },
  });
  if (!res.ok) return [];

  const data = await res.json();
  return (data.results || []).map((p: { urls: { regular: string; thumb: string }; user: { name: string; links: { html: string } } }) => ({
    url: p.urls.regular,
    thumb: p.urls.thumb,
    credit: { name: p.user.name, link: p.user.links.html },
  }));
}
