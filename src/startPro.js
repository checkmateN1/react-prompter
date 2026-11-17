export function validServer(value) {
  try {
    const url = new URL(value);
    return (url.protocol === 'ws:' || url.protocol === 'wss:') && !!url.hostname && !url.hash;
  } catch (_) { return false; }
}

export function serverFromLocation(location = window.location) {
  const server = new URLSearchParams(location.search).get('server');
  return validServer(server) ? server : null;
}

// Keep the server visible in the URL; credentials are delivered separately by StartPro.
export function updateServerLocation(server, displaySignature) {
  const url = new URL(window.location.href);
  url.searchParams.set('server', server);
  url.searchParams.set('startpro', '1');
  if (typeof displaySignature === 'string' && displaySignature) url.searchParams.set('display', displaySignature);
  window.history.replaceState(null, '', url.href);
}

