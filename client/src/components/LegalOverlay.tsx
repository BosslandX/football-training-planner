import { useState, useEffect } from 'react';

type Tab = 'impressum' | 'datenschutz';

export function LegalOverlay() {
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
            >Impressum</button>
            <button
              className={`legal-tab ${tab === 'datenschutz' ? 'active' : ''}`}
              onClick={() => setTab('datenschutz')}
            >Datenschutz</button>
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
      <h2>Impressum</h2>
      <h3>Angaben gemäß § 5 TMG</h3>
      <p>
        Zwetan Letschew<br />
        Leipziger Str. 72<br />
        08056 Zwickau, Deutschland
      </p>
      <h3>Kontakt</h3>
      <p>
        Telefon: +49 151 56030309<br />
        E-Mail: zwetan@letschew.de
      </p>
      <h3>Haftung für Inhalte</h3>
      <p>
        Als Diensteanbieter sind wir gemäß § 7 Abs.1 TMG für eigene Inhalte auf
        diesen Seiten nach den allgemeinen Gesetzen verantwortlich. Nach §§ 8 bis
        10 TMG sind wir als Diensteanbieter jedoch nicht verpflichtet,
        übermittelte oder gespeicherte fremde Informationen zu überwachen oder
        nach Umständen zu forschen, die auf eine rechtswidrige Tätigkeit hinweisen.
      </p>
      <h3>Haftung für Links</h3>
      <p>
        Unser Angebot enthält Links zu externen Websites Dritter, auf deren
        Inhalte wir keinen Einfluss haben. Für die Inhalte der verlinkten Seiten
        ist stets der jeweilige Anbieter verantwortlich.
      </p>
    </>
  );
}

function Datenschutz() {
  return (
    <>
      <h2>Datenschutzerklärung</h2>

      <h3>1. Verantwortlicher</h3>
      <p>
        Zwetan Letschew<br />
        Leipziger Str. 72<br />
        08056 Zwickau, Deutschland<br />
        E-Mail: zwetan@letschew.de
      </p>

      <h3>2. Allgemeines zur Datenverarbeitung</h3>
      <p>
        Diese Anwendung verarbeitet personenbezogene Daten nur im technisch
        notwendigen Umfang. Eine Weitergabe an Dritte findet nicht statt.
      </p>

      <h3>3. Cookies</h3>
      <p>
        Diese Website verwendet ausschließlich technisch notwendige Cookies
        (z.B. zur Speicherung Ihrer Cookie-Einwilligung im Local Storage).
        Es werden keine Tracking- oder Analyse-Cookies eingesetzt.
      </p>

      <h3>4. Local Storage</h3>
      <p>
        Die Anwendung speichert Ihre Trainingsplanungen lokal im Browser
        (Local Storage). Diese Daten verlassen Ihren Browser nicht und werden
        nicht an Server übertragen, sofern Sie keinen Export durchführen.
      </p>

      <h3>5. Server-Logs</h3>
      <p>
        Bei der Nutzung der Export-Funktionen (PDF, Video) werden
        technisch notwendige Daten an unseren Server übermittelt. Diese
        werden ausschließlich zur Verarbeitung Ihres Exports verwendet und
        nicht gespeichert.
      </p>

      <h3>6. Ihre Rechte</h3>
      <p>
        Sie haben das Recht auf Auskunft, Berichtigung, Löschung und
        Einschränkung der Verarbeitung Ihrer Daten gemäß DSGVO.
        Wenden Sie sich hierzu an: zwetan@letschew.de
      </p>
    </>
  );
}
