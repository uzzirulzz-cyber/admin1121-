import React, { useEffect, useState } from 'react';
import { Check, Copy } from 'lucide-react';
import type { DomainRecord } from '../types/admin';
import { api } from '../lib/api';

interface DomainsPageProps {
  onDataChanged: () => void;
}

export function DomainsPage({ onDataChanged }: DomainsPageProps) {
  const [domains, setDomains] = useState<DomainRecord[]>([]);
  const [publisherId, setPublisherId] = useState('ca-pub-9777611286139666');
  const [adsTxtLine, setAdsTxtLine] = useState(
    'google.com, pub-9777611286139666, DIRECT, f08c47fec0942fa0',
  );
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    api
      .domains()
      .then((res) => {
        setDomains(res.domains);
        setPublisherId(res.publisherId);
        setAdsTxtLine(res.adsTxtLine);
      })
      .finally(() => setLoading(false));
  }, []);

  async function toggleCompliance(
    domain: DomainRecord,
    field: 'privacyOk' | 'termsOk' | 'inCloudflareAccount',
  ) {
    const nextVal = !domain[field];
    const res = await api.updateDomain(domain.domain, { [field]: nextVal });
    setDomains((prev) =>
      prev.map((d) => (d.domain === domain.domain ? res.domain : d)),
    );
    onDataChanged();
  }

  function handleCopy() {
    navigator.clipboard?.writeText(adsTxtLine);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
          Domain Family & AdSense Compliance
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Hosting topology, <span className="font-mono text-xs">ads.txt</span> authorization, and AdSense-required <span className="font-mono text-xs">/privacy</span> + <span className="font-mono text-xs">/terms</span> policy status across all 5 PlayBeat properties.
        </p>
      </div>

      {/* Publisher Reference Bar */}
      <section className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
            Authorized Publisher · {publisherId}
          </p>
          <p className="font-mono text-xs text-zinc-900 dark:text-zinc-100 break-all">
            {adsTxtLine}
          </p>
        </div>
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-zinc-700 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 whitespace-nowrap shrink-0 self-start md:self-auto"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copied ? 'Copied ads.txt' : 'Copy ads.txt Line'}</span>
        </button>
      </section>

      {/* Domains Table */}
      <section className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-800 text-xs font-medium text-zinc-500 dark:text-zinc-400">
                <th className="py-3 px-5">Domain & Role</th>
                <th className="py-3 px-4">Cloudflare Hosting</th>
                <th className="py-3 px-4">ads.txt / Script</th>
                <th className="py-3 px-4">/privacy</th>
                <th className="py-3 px-4">/terms</th>
                <th className="py-3 px-5">Action / Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/80 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-xs text-zinc-500">
                    Loading domains...
                  </td>
                </tr>
              ) : (
                domains.map((d) => (
                  <tr
                    key={d.domain}
                    className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40 align-top transition-colors"
                  >
                    <td className="py-4 px-5">
                      <p className="font-semibold text-zinc-950 dark:text-zinc-50 font-mono text-xs">
                        {d.domain}
                      </p>
                      <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400 max-w-xs">
                        {d.siteRole}
                      </p>
                    </td>
                    <td className="py-4 px-4 text-xs">
                      <p
                        className={
                          d.inCloudflareAccount
                            ? 'font-medium text-emerald-700 dark:text-emerald-400'
                            : 'font-medium text-amber-700 dark:text-amber-400'
                        }
                      >
                        {d.inCloudflareAccount ? 'In This CF Account' : 'External Zone'}
                      </p>
                      <p className="mt-0.5 text-zinc-500 dark:text-zinc-400">{d.hosting}</p>
                    </td>
                    <td className="py-4 px-4 text-xs whitespace-nowrap">
                      <p className="text-emerald-700 dark:text-emerald-400 font-medium">
                        ads.txt OK · Loader OK
                      </p>
                      <p className="mt-0.5 text-zinc-500 dark:text-zinc-400">Auto ads only</p>
                    </td>
                    <td className="py-4 px-4 text-xs whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => toggleCompliance(d, 'privacyOk')}
                        className={`font-medium hover:underline ${
                          d.privacyOk
                            ? 'text-emerald-700 dark:text-emerald-400'
                            : 'text-red-700 dark:text-red-400'
                        }`}
                      >
                        {d.privacyOk ? 'Live (OK)' : '404 · Mark Live'}
                      </button>
                    </td>
                    <td className="py-4 px-4 text-xs whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => toggleCompliance(d, 'termsOk')}
                        className={`font-medium hover:underline ${
                          d.termsOk
                            ? 'text-emerald-700 dark:text-emerald-400'
                            : 'text-red-700 dark:text-red-400'
                        }`}
                      >
                        {d.termsOk ? 'Live (OK)' : '404 · Mark Live'}
                      </button>
                    </td>
                    <td className="py-4 px-5 text-xs max-w-sm">
                      {d.actionRequired && (!d.privacyOk || !d.termsOk) ? (
                        <p className="text-amber-700 dark:text-amber-400 leading-relaxed">
                          {d.actionRequired}
                        </p>
                      ) : (
                        <p className="text-zinc-500 dark:text-zinc-400 leading-relaxed">
                          {d.autoAdsNote}
                        </p>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
