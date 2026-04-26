// Defaults shared by the public API and the runtime.

export const DEFAULTS = Object.freeze({
  apiPath: '/api/v1',
  flushInterval: 5000,           // ms between automatic flushes
  flushOnUnload: true,           // try to flush via sendBeacon on pagehide
  maxQueueSize: 50,              // events buffered before forced flush
  maxBatchSize: 100,             // server-enforced cap, do not exceed
  maxRetries: 3,
  retryBaseDelay: 1000,          // exponential backoff base in ms
  storage: 'auto',               // 'auto' | 'localStorage' | 'cookie' | 'memory' | 'none'
  cookieDays: 365 * 2,           // 2-year first-party cookie
  cookieDomain: 'auto',          // 'auto' = derive eTLD+1, 'host' = current host only, or explicit '.example.com'
  cookieSameSite: 'Lax',
  cookieSecure: 'auto',          // 'auto' = true on https
  consent: 'granted',            // 'granted' | 'required'
  respectDoNotTrack: false,
  autoTrack: {
    pageviews: true,
    outboundLinks: true,
    downloads: true,
    forms: true,
  },
  downloadExtensions: [
    'pdf','zip','rar','7z','tar','gz','tgz',
    'doc','docx','xls','xlsx','ppt','pptx','csv','tsv','txt','rtf',
    'mp3','wav','flac','ogg','m4a',
    'mp4','mov','avi','mkv','webm','wmv',
    'dmg','exe','pkg','msi','apk','deb','rpm','iso',
    'jpg','jpeg','png','gif','svg','webp','bmp','heic',
  ],
  logLevel: 'warn',              // 'silent' | 'error' | 'warn' | 'info' | 'debug'
});

export const STORAGE_KEYS = Object.freeze({
  deviceId: '_oxi_did',
  userId: '_oxi_uid',
  consent: '_oxi_consent',
});

export const SDK_PLATFORM = 'web';
export const SDK_VERSION = '0.1.0';
