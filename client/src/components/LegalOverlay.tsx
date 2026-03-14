import { useState, useEffect } from 'react';
import { t, useLocale } from '../i18n';

type Tab = 'impressum' | 'datenschutz';

export function LegalOverlay() {
  useLocale(s => s.locale);
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>('impressum');

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      setTab(detail === 'datenschutz' ? 'datenschutz' : 'impressum');
      setOpen(true);
    };
    window.addEventListener('show-legal', handler);
    return () => window.removeEventListener('show-legal', handler);
  }, []);

  if (!open) return null;

  return (
    <div className="legal-overlay" onClick={() => setOpen(false)}>
      <div className="legal-content" onClick={e => e.stopPropagation()}>
        <div className="legal-header">
          <div className="legal-tabs">
            <button
              className={`legal-tab ${tab === 'impressum' ? 'active' : ''}`}
              onClick={() => setTab('impressum')}
            >{t('legal.impressum')}</button>
            <button
              className={`legal-tab ${tab === 'datenschutz' ? 'active' : ''}`}
              onClick={() => setTab('datenschutz')}
            >{t('legal.datenschutz')}</button>
          </div>
          <button className="legal-close" onClick={() => setOpen(false)}>✕</button>
        </div>
        <div className="legal-body">
          {tab === 'impressum' ? <Impressum /> : <Datenschutz />}
        </div>
      </div>
    </div>
  );
}

function Impressum() {
  return (
    <>
      <h2>{t('legal.impressumTitle')}</h2>
      <h3>{t('legal.tmgTitle')}</h3>
      <p>
        Zwetan Letschew<br />
        Leipziger Str. 72<br />
        08056 Zwickau, Deutschland
      </p>
      <h3>{t('legal.contactTitle')}</h3>
      <p>
        Telefon: +49 151 56030309<br />
        E-Mail: zwetan@letschew.de
      </p>
      <h3>{t('legal.liabilityContentTitle')}</h3>
      <p>{t('legal.liabilityContent')}</p>
      <h3>{t('legal.liabilityLinksTitle')}</h3>
      <p>{t('legal.liabilityLinks')}</p>
    </>
  );
}

function Datenschutz() {
  return (
    <>
      <h2>{t('legal.privacyTitle')}</h2>

      <h3>{t('legal.responsibleTitle')}</h3>
      <p>
        Zwetan Letschew<br />
        Leipziger Str. 72<br />
        08056 Zwickau, Deutschland<br />
        E-Mail: zwetan@letschew.de
      </p>

      <h3>{t('legal.dataProcessingTitle')}</h3>
      <p>{t('legal.dataProcessing')}</p>

      <h3>{t('legal.cookiesTitle')}</h3>
      <p>{t('legal.cookies')}</p>

      <h3>{t('legal.localStorageTitle')}</h3>
      <p>{t('legal.localStorage')}</p>

      <h3>{t('legal.serverLogsTitle')}</h3>
      <p>{t('legal.serverLogs')}</p>

      <h3>{t('legal.rightsTitle')}</h3>
      <p>{t('legal.rights')}</p>
    </>
  );
}
