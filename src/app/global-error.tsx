'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body style={{ margin: 0, minHeight: '100vh', background: '#0a0e1a', color: '#e5e7eb', padding: 32, fontFamily: 'system-ui, sans-serif' }}>
        <h2 style={{ fontSize: 20, marginBottom: 12 }}>Application error</h2>
        <p style={{ marginBottom: 12, color: '#9ca3af' }}>Send a screenshot of this screen to your administrator.</p>
        <pre style={{ whiteSpace: 'pre-wrap', background: '#111827', padding: 16, borderRadius: 8, color: '#fca5a5', fontSize: 13 }}>
          {error.message}
          {error.digest ? `\n\ndigest: ${error.digest}` : ''}
          {error.stack ? `\n\n${error.stack.split('\n').slice(0, 8).join('\n')}` : ''}
        </pre>
        <button
          onClick={() => reset()}
          style={{ marginTop: 16, padding: '10px 16px', borderRadius: 8, border: 'none', background: '#00bcd4', color: '#001018', fontWeight: 600, cursor: 'pointer' }}
        >
          Try again
        </button>
      </body>
    </html>
  );
}
