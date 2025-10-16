import React from 'react';
import { useLocation } from 'react-router-dom';
import { useSVGErrorHandler } from '../../utils/svg-error-handler';

const SHAREABLE_URL =
  'https://cdn.botpress.cloud/webchat/v3.2/shareable.html?configUrl=https://files.bpcontent.cloud/2025/09/04/12/20250904124647-TFLLQOD2.json';

// Renders the Botpress shareable webchat inside an iframe with a themed launcher
export default function BotpressIframeChat() {
  const location = useLocation();
  const [open, setOpen] = React.useState(false);
  const [primary] = React.useState('#79BEDF');
  const [fontFamily, setFontFamily] = React.useState('inherit');
  const [iframeError, setIframeError] = React.useState(false);
  
  // Initialize SVG error handling
  useSVGErrorHandler();

  React.useEffect(() => {
    // Read font from body to match site typography
    try {
      const bodyFont = getComputedStyle(document.body).fontFamily || 'inherit';
      setFontFamily(bodyFont);
    } catch (_) {}
  }, []);

  React.useEffect(() => {
    // Inject minimal responsive styles once
    if (!document.getElementById('bp-iframe-style')) {
      const style = document.createElement('style');
      style.id = 'bp-iframe-style';
      style.textContent = `
.bp-iframe-container { position: fixed; bottom: 20px; right: 20px; z-index: 1000; width: 360px; height: 520px; box-shadow: 0 6px 20px rgba(0,0,0,.15); border-radius: 12px; overflow: hidden; background: #fff; }
.bp-iframe-container.hidden { display: none; }
@media (max-width: 768px) {
  .bp-iframe-container { bottom: 0; right: 0; width: 100%; height: 80vh; border-radius: 0; }
}
.bp-iframe-container iframe { width: 100%; height: 100%; border: 0; display: block; }
.bp-launcher { position: fixed; bottom: 20px; right: 20px; z-index: 1001; }
.bp-launcher-btn { width: 56px; height: 56px; border-radius: 9999px; display: inline-flex; align-items: center; justify-content: center; color: #fff; box-shadow: 0 6px 16px rgba(0,0,0,.2); border: 0; cursor: pointer; }
.bp-tooltip { position: absolute; right: 70px; bottom: 12px; padding: 8px 12px; border-radius: 9999px; white-space: nowrap; color: #fff; box-shadow: 0 4px 12px rgba(0,0,0,.15); opacity: 1; pointer-events: none; transform: translateY(0); transition: opacity .18s ease, transform .18s ease; font-family: inherit; font-size: 12px; }
@media (max-width: 768px) { .bp-tooltip { display: none; } }
.bp-close-btn { position: absolute; top: 8px; right: 8px; z-index: 1002; background: rgba(255,255,255,.9); border: 0; width: 32px; height: 32px; border-radius: 9999px; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; }
      `;
      document.head.appendChild(style);
    }

    // SVG error handling is now managed by the useSVGErrorHandler hook
  }, []);

  // Close chat on route changes to avoid staying open unexpectedly
  React.useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  return (
    <>
      <div className="bp-launcher" style={{ fontFamily }}>
        <button
          type="button"
          aria-label={open ? 'Close support chat' : 'Open support chat'}
          className="bp-launcher-btn"
          onClick={() => setOpen((v) => !v)}
          style={{ background: primary }}
        >
          {!open ? (
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M4 5a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3v8a3 3 0 0 1-3 3H9l-4 4V5Z" fill="currentColor"/>
            </svg>
          ) : (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M18 6L6 18M6 6l12 12" stroke="#fff" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          )}
        </button>
        {!open && (
          <div className="bp-tooltip" style={{ background: primary }}>Need assistance?</div>
        )}
      </div>

      <div className={`bp-iframe-container${open ? '' : ' hidden'}`} style={{ fontFamily }}>
        <button className="bp-close-btn" aria-label="Close chat" onClick={() => setOpen(false)}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M18 6L6 18M6 6l12 12" stroke="#111827" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </button>
        {iframeError ? (
          <div className="flex items-center justify-center h-full p-8 text-center">
            <div>
              <div className="text-gray-500 mb-4">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="mx-auto">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" fill="currentColor"/>
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-700 mb-2">Chat Unavailable</h3>
              <p className="text-sm text-gray-500 mb-4">
                The support chat is temporarily unavailable. Please try again later or contact us directly.
              </p>
              <button
                onClick={() => setIframeError(false)}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm"
              >
                Retry
              </button>
            </div>
          </div>
        ) : (
          <iframe
            title="Support Chat"
            src={SHAREABLE_URL}
            allow="clipboard-write; microphone;"
            referrerPolicy="no-referrer"
            onError={(e) => {
              console.warn('Botpress iframe failed to load:', e);
              setIframeError(true);
            }}
            onLoad={() => {
              // Iframe loaded successfully
              console.log('Botpress chat iframe loaded successfully');
              setIframeError(false);
            }}
          />
        )}
      </div>
    </>
  );
}


