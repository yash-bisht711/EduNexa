const MEDIA_URL =
  import.meta.env.VITE_MEDIA_URL ||
  'http://localhost:5001';

export const getMediaUrl = (url) => {
  if (!url) return '';

  if (/^https?:\/\//i.test(url)) {
    return url;
  }

  return `${MEDIA_URL.replace(/\/$/, '')}/${url.replace(/^\/+/, '')}`;
};
