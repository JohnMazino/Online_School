export default function Draw() {
  // Передаём все параметры запроса в iframe
  const search = typeof window !== 'undefined' ? window.location.search : '';
  const params = typeof URLSearchParams !== 'undefined' ? new URLSearchParams(search) : null;
  const userId = params ? params.get('userId') : '';

  // В режиме разработки используем локальный dev-сервер draw (CRA start обычно на :3000)
  const isDev = typeof import.meta !== 'undefined' && (import.meta as any).env && (import.meta as any).env.DEV;
  const src = isDev
    ? `http://localhost:3000/?userId=${userId}`
    : `${window.location.origin}/draw/index.html${search}`;

  return (
    <div style={{ width: '100%', height: '100vh', background: '#0b0b0b' }}>
      <iframe
        title="Интерактивная доска"
        src={src}
        style={{ width: '100%', height: '100%', border: 'none' }}
      />
    </div>
  );
}
