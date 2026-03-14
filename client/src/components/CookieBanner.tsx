import { useState, useEffect } from 'react';

const COOKIE_KEY = 'cookie_consent';

export function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(COOKIE_KEY)) {
      setVisible(true);
    }
  }, []);

  if (!visible) return null;

  const accept = () => {
    localStorage.setItem(COOKIE_KEY, 'accepted');
    setVisible(false);
  };

  return (
    <div className="cookie-banner">
      <span>
        Diese Website verwendet Cookies für grundlegende Funktionen.{' '}
        <button className="cookie-link" onClick={() => {
          window.dispatchEvent(new CustomEvent('show-legal', { detail: 'datenschutz' }));
        }}>Mehr erfahren</button>
      </span>
      <button className="cookie-accept" onClick={accept}>OK</button>
    </div>
  );
}
