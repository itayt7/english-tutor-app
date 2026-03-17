import { useEffect, useState } from 'react';
import { CheckCircle, XCircle, Loader2, RefreshCw } from 'lucide-react';

// Shape of the /api/test-connection response
interface TestConnectionResponse {
  status: string;
  database: string;
  user_count: number;
}

type TestState =
  | { phase: 'idle' }
  | { phase: 'loading' }
  | { phase: 'success'; data: TestConnectionResponse; latencyMs: number }
  | { phase: 'error'; message: string; statusCode?: number };

const ENDPOINT = '/api/test-connection';

export default function IntegrationTest() {
  const [state, setState] = useState<TestState>({ phase: 'idle' });

  const runTest = () => {
    setState({ phase: 'loading' });
    const t0 = performance.now();

    fetch(ENDPOINT)
      .then(async (res) => {
        const latencyMs = Math.round(performance.now() - t0);
        if (!res.ok) {
          setState({
            phase: 'error',
            message: res.statusText || 'Non-2xx response',
            statusCode: res.status,
          });
          return;
        }
        const data = (await res.json()) as TestConnectionResponse;
        setState({ phase: 'success', data, latencyMs });
      })
      .catch((err: Error) => {
        const isRefused =
          err.message.includes('Failed to fetch') ||
          err.message.includes('NetworkError') ||
          err.message.includes('ERR_CONNECTION_REFUSED');

        setState({
          phase: 'error',
          message: isRefused
            ? 'Connection refused — is the FastAPI server running on port 8000?'
            : err.message,
        });
      });
  };

  // Run automatically on mount
  useEffect(() => { runTest(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100 space-y-4">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
            Backend Integration
          </p>
          <p className="font-semibold text-gray-800">Connection Test</p>
        </div>
        <button
          onClick={runTest}
          disabled={state.phase === 'loading'}
          className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 transition hover:bg-gray-50 disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${state.phase === 'loading' ? 'animate-spin' : ''}`} />
          Re-test
        </button>
      </div>

      {/* Result area */}
      {state.phase === 'idle' && (
        <p className="text-sm text-gray-400">Test has not run yet.</p>
      )}

      {state.phase === 'loading' && (
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Loader2 className="h-4 w-4 animate-spin text-indigo-500" />
          Pinging {ENDPOINT} …
        </div>
      )}

      {state.phase === 'success' && (
        <div className="space-y-3">
          {/* Status badge */}
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-emerald-500" />
            <span className="rounded-full bg-emerald-100 px-3 py-0.5 text-xs font-semibold text-emerald-700">
              Success
            </span>
            <span className="text-xs text-gray-400">{state.latencyMs} ms</span>
          </div>

          {/* Details grid */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Status',     value: state.data.status },
              { label: 'Database',   value: state.data.database },
              { label: 'Users in DB', value: String(state.data.user_count) },
            ].map(({ label, value }) => (
              <div key={label} className="rounded-xl bg-gray-50 p-3">
                <p className="text-xs text-gray-400">{label}</p>
                <p className="mt-0.5 font-semibold text-gray-800 capitalize">{value}</p>
              </div>
            ))}
          </div>

          {/* Endpoint */}
          <p className="text-xs text-gray-400 font-mono break-all">{ENDPOINT}</p>
        </div>
      )}

      {state.phase === 'error' && (
        <div className="space-y-3">
          {/* Error badge */}
          <div className="flex items-center gap-2">
            <XCircle className="h-5 w-5 text-red-500" />
            <span className="rounded-full bg-red-100 px-3 py-0.5 text-xs font-semibold text-red-700">
              {state.statusCode ? `HTTP ${state.statusCode}` : 'Error'}
            </span>
          </div>

          {/* Error message */}
          <div className="rounded-xl bg-red-50 border border-red-100 p-3">
            <p className="text-sm text-red-700">{state.message}</p>
          </div>

          {/* Endpoint */}
          <p className="text-xs text-gray-400 font-mono break-all">{ENDPOINT}</p>
        </div>
      )}
    </div>
  );
}
