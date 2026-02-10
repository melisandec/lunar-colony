/**
 * Offline fallback page.
 * Displayed by the service worker when the user has no connection.
 */
export default function OfflinePage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-950 via-indigo-950 to-slate-950 text-white">
      <div className="px-6 text-center">
        <div className="mb-4 text-6xl">🌙</div>
        <h1 className="mb-2 text-2xl font-bold">Colony Offline</h1>
        <p className="mb-6 text-indigo-300/70">
          Your connection to the lunar base was interrupted.
          <br />
          Check your signal and try again.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="rounded-full bg-indigo-600 px-8 py-3 text-lg font-semibold transition hover:bg-indigo-500"
          style={{ minWidth: 60, minHeight: 60 }}
        >
          🔄 Retry Connection
        </button>
      </div>
    </div>
  );
}
