/**
 * Where a domain's email goes: its MX records, looked up over DNS over HTTPS
 * (Cloudflare's JSON API), so it works wherever fetch does, through proxies
 * included. FOHM_DOH_URL points it elsewhere (the tests use a local server).
 */
const DOH = () => process.env.FOHM_DOH_URL || 'https://cloudflare-dns.com/dns-query';
const MX = 15;

/** The mail servers for a domain, best first; [] when it has none (or a null MX: "takes no mail"). */
export async function mxHosts(domain) {
  const res = await fetch(`${DOH()}?name=${encodeURIComponent(domain)}&type=MX`, { headers: { accept: 'application/dns-json' }, signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`the DNS lookup answered ${res.status}`);
  const { Answer = [] } = await res.json();
  return Answer.filter((a) => a.type === MX)
    .map((a) => {
      const [priority, host = ''] = String(a.data).trim().split(/\s+/);
      return { priority: Number(priority), host: host.replace(/\.$/, '') };
    })
    .filter((mx) => mx.host)
    .sort((a, b) => a.priority - b.priority)
    .map((mx) => mx.host);
}
