export function isLoopback(url: string | URL | null | undefined): boolean {
  if (!url) {
    return false;
  }

  let validUrl: URL;
  if (typeof url === 'string') {
    try {
      validUrl = new URL(url);
    } catch (urlError) {
      return false;
    }
  } else {
    validUrl = url;
  }

  const hostname = validUrl.hostname.toLowerCase();
  return hostname === 'localhost' || 
         hostname === '127.0.0.1' || 
         hostname.startsWith('127.') ||
         hostname === '::1' ||
         hostname === '[::1]';
}