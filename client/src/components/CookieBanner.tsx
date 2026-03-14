import { useState, useEffect } from 'react';
import { t, useLocale } from '../i18n';

const COOKIE_KEY = 'cookie_consent';

export function CookieBanner() {
  useLocale(s => s.locale);
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
        {t('cookie.message')}{' '}
        <button className="cookie-link" onClick={() => {
          window.dispatchEvent(new CustomEvent('show-legal', { detail: 'datenschutz' }));
        }}>{t('cookie.learnMore')}</button>
      </span>
      <button className="cookie-accept" onClick={accept}>{t('cookie.accept')}</button>
    </div>
  );
}
