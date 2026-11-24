/**
 * DNS lookups over HTTPS (Cloudflare's JSON API), for the checks: where a
 * domain's mail goes, and whether a host points anywhere at all. Over HTTPS,
 * they work where this machine's own resolver is blocked but the web isn't.
 * FOHM_DOH_URL points them elsewhere (the tests use a local server).
 */
const DOH = () => process.env.FOHM_DOH_URL || 'https://cloudflare-dns.com/dns-query';
const TYPE = { A: 1, CNAME: 5, MX: 15, TXT: 16, AAAA: 28 };
const NOERROR = 0;
const NXDOMAIN = 3;

/** One lookup: whether the name exists, and its answers. A failed lookup (SERVFAIL and the like) throws. */
async function query(name, type) {
  const res = await fetch(`${DOH()}?name=${encodeURIComponent(name)}&type=${type}`, { headers: { accept: 'application/dns-json' }, signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`the DNS lookup answered ${res.status}`);
  const { Status, Answer = [] } = await res.json();
  if (Status !== NOERROR && Status !== NXDOMAIN) throw new Error(`the DNS lookup failed (status ${Status})`);
  return { exists: Status === NOERROR, answers: Answer };
}

/** A domain's mail servers, best first: none when it takes no mail (no MX, or a null MX: "0 ."). */
export async function mxHosts(domain) {
  const { exists, answers } = await query(domain, 'MX');
  const hosts = answers
    .filter((a) => a.type === TYPE.MX)
    .map((a) => {
      const [priority, host = ''] = String(a.data).trim().split(/\s+/);
      return { priority: Number(priority), host: host.replace(/\.$/, '') };
    })
    .filter((mx) => mx.host)
    .sort((a, b) => a.priority - b.priority)
    .map((mx) => mx.host);
  return { exists, hosts };
}

/** Whether a host has an address (directly, or through a CNAME), as the world sees it. */
export async function pointsSomewhere(host) {
  const { exists, answers } = await query(host, 'A');
  return exists && answers.some((a) => [TYPE.A, TYPE.CNAME, TYPE.AAAA].includes(a.type));
}

/** A domain's DMARC policy (the TXT record at _dmarc.<domain> that starts v=DMARC1), or null when it has none. */
export async function dmarcPolicy(domain) {
  const { answers } = await query(`_dmarc.${domain}`, 'TXT');
  const record = answers
    .filter((a) => a.type === TYPE.TXT)
    .map((a) => String(a.data).replace(/^"|"$/g, '').replace(/"\s*"/g, ''))
    .find((t) => /^v=DMARC1/i.test(t.trim()));
  return record ? record.trim() : null;
}
