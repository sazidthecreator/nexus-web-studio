// Unsplash search. Requires VITE_UNSPLASH_ACCESS_KEY.
// Returns [] gracefully when no key configured so the UI degrades cleanly.

export type UnsplashPhoto = {
  id: string;
  thumb: string;
  regular: string;
  full: string;
  width: number;
  height: number;
  alt: string;
  credit: { name: string; link: string };
};

const KEY = (import.meta as any).env?.VITE_UNSPLASH_ACCESS_KEY as
  | string
  | undefined;

export function unsplashConfigured(): boolean {
  return Boolean(KEY);
}

export async function searchUnsplash(
  query: string,
  page = 1,
): Promise<UnsplashPhoto[]> {
  if (!KEY) return [];
  const res = await fetch(
    `https://api.unsplash.com/search/photos?query=${encodeURIComponent(
      query,
    )}&page=${page}&per_page=20&orientation=landscape`,
    { headers: { Authorization: `Client-ID ${KEY}` } },
  );
  if (!res.ok) return [];
  const data = await res.json();
  return (data.results || []).map((p: any) => ({
    id: p.id,
    thumb: p.urls.thumb,
    regular: p.urls.regular,
    full: p.urls.full,
    width: p.width,
    height: p.height,
    alt: p.alt_description || "",
    credit: {
      name: p.user.name,
      link: `${p.links.html}?utm_source=sitely&utm_medium=referral`,
    },
  }));
}

// Required by Unsplash API guidelines — call when user selects a photo.
export async function selectUnsplashPhoto(photoId: string): Promise<void> {
  if (!KEY) return;
  await fetch(`https://api.unsplash.com/photos/${photoId}/download`, {
    headers: { Authorization: `Client-ID ${KEY}` },
  }).catch(() => undefined);
}
