import { PUBLIC_BASE_URL } from "$env/static/public";

function normalizeUrl(baseUrl: string, path: string): string {
  const normalizedBase = baseUrl.replace(/\/+$/, '');
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${normalizedBase}${normalizedPath}`;
}

export function getLeadboxEmbedCode(id: string = 'default') {
  const url = normalizeUrl(PUBLIC_BASE_URL, `/embed/leadbox/${id}?t=${Date.now()}`);
  return `<script src="${url}"></script>`;
}

export function getLeadformEmbedCode(id: string = 'default') {
  const url = normalizeUrl(PUBLIC_BASE_URL, `/embed/leadform/${id}?t=${Date.now()}`);
  return `<script src="${url}"></script>`;
} 