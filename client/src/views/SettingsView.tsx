import React, { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import { ThemeMode } from '../hooks/useTheme';
import { Health } from '../types';
import { GithubReturn } from '../hooks/useGithub';
import { GithubStatus } from '../types';
import { API_BASE, GITHUB_LOGIN_URL, getHealth } from '../services/incident.api';
import { Badge, CardHeader, PageTitle } from '../components/ui';

interface SettingsViewProps {
  theme: ThemeMode;
  onSetTheme: (t: ThemeMode) => void;
  online: boolean;
  github: GithubStatus | null;
  githubResult: GithubReturn | null;
  onDisconnectGithub: () => Promise<void>;
}

const Row: React.FC<{ title: string; hint: React.ReactNode; children?: React.ReactNode }> = ({ title, hint, children }) => (
  <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
    <div className="min-w-0 max-w-xl">
      <p className="text-sm font-medium">{title}</p>
      <p className="mt-0.5 text-sm text-muted">{hint}</p>
    </div>
    {children && <div className="shrink-0">{children}</div>}
  </div>
);

const Mono: React.FC<{ children: React.ReactNode }> = ({ children }) => <span className="font-mono text-[13px]">{children}</span>;

export const SettingsView: React.FC<SettingsViewProps> = ({
  theme,
  onSetTheme,
  online,
  github,
  githubResult,
  onDisconnectGithub,
}) => {
  const [health, setHealth] = useState<Health | null>(null);
  const [disconnecting, setDisconnecting] = useState(false);

  useEffect(() => {
    let stopped = false;
    getHealth()
      .then((h) => !stopped && setHealth(h))
      .catch(() => !stopped && setHealth(null));
    return () => {
      stopped = true;
    };
  }, [online]);

  const disconnect = async () => {
    setDisconnecting(true);
    try {
      await onDisconnectGithub();
    } finally {
      setDisconnecting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageTitle title="Settings" subtitle="Appearance, your GitHub connection, and the state of the other services." />

      {githubResult && (
        <div
          role="status"
          className={`rounded-lg border border-line px-5 py-3.5 text-sm ${githubResult.result === 'connected' ? 'bg-ok-soft text-ok' : 'bg-bad-soft text-bad'}`}
        >
          {githubResult.result === 'connected'
            ? 'GitHub connected. Blinkfix can now read your repository and open pull requests.'
            : `GitHub was not connected. ${githubResult.reason ?? ''}`}
        </div>
      )}

      <section className="card">
        <CardHeader title="Appearance" />
        <Row title="Theme" hint="Light for bright rooms, dark for night shifts.">
          <div className="inline-flex rounded-md border border-line p-0.5" role="radiogroup" aria-label="Theme">
            {(['light', 'dark'] as ThemeMode[]).map((t) => (
              <button
                key={t}
                role="radio"
                aria-checked={theme === t}
                onClick={() => onSetTheme(t)}
                className={`inline-flex items-center gap-1.5 rounded px-3 py-1.5 text-sm font-medium transition-colors ${
                  theme === t ? 'bg-accent-soft text-accent' : 'text-muted hover:text-ink'
                }`}
              >
                {t === 'light' ? <Sun size={14} /> : <Moon size={14} />}
                {t === 'light' ? 'Light' : 'Dark'}
              </button>
            ))}
          </div>
        </Row>
      </section>

      <section className="card">
        <CardHeader
          title="GitHub"
          hint="Blinkfix reads the failing code, its history and who last changed it from GitHub, and opens pull requests there."
        />
        <div className="divide-y divide-line">
          {!github ? (
            <Row title="GitHub" hint="Status is unavailable because the API cannot be reached.">
              <Badge tone="bad">Unknown</Badge>
            </Row>
          ) : (
            <>
              <Row
                title="Repository"
                hint={<><Mono>{github.repo}</Mono> on branch <Mono>{github.branch}</Mono>. The service lives in <Mono>{github.pathPrefix || '/'}</Mono>.</>}
              />
              {github.connected ? (
                <Row
                  title="Account"
                  hint={
                    github.via === 'login'
                      ? <>Connected as <Mono>@{github.login}</Mono>. Pull requests are opened from this account.</>
                      : 'Using the personal access token from server/.env.'
                  }
                >
                  <div className="flex items-center gap-3">
                    <Badge tone="ok">Connected</Badge>
                    {github.via === 'login' && (
                      <button className="btn" onClick={disconnect} disabled={disconnecting}>
                        {disconnecting ? 'Disconnecting…' : 'Disconnect'}
                      </button>
                    )}
                  </div>
                </Row>
              ) : github.oauthConfigured ? (
                <Row
                  title="Account"
                  hint="Not connected. Without it Blinkfix can only read public code at a low rate limit, cannot see who last changed a line, and cannot open pull requests."
                >
                  <a className="btn btn-primary" href={GITHUB_LOGIN_URL}>Connect GitHub</a>
                </Row>
              ) : (
                <Row
                  title="Account"
                  hint={
                    <>
                      Not set up. Create a GitHub OAuth App with the callback URL <Mono>{github.callbackUrl}</Mono>, add its
                      client ID and secret to <Mono>server/.env</Mono> as <Mono>GITHUB_CLIENT_ID</Mono> and{' '}
                      <Mono>GITHUB_CLIENT_SECRET</Mono>, then restart the server.
                    </>
                  }
                >
                  <Badge tone="warn">Not set up</Badge>
                </Row>
              )}
              {github.connected && github.canWrite === false && (
                <Row title="Permission" hint="This account cannot push to the repository, so opening a pull request will fail.">
                  <Badge tone="bad">Read only</Badge>
                </Row>
              )}
              {github.problem && (
                <Row title="Problem" hint={github.problem}>
                  <Badge tone="bad">Error</Badge>
                </Row>
              )}
            </>
          )}
        </div>
      </section>

      <section className="card">
        <CardHeader title="Connections" hint="Read from the Blinkfix API." />
        <div className="divide-y divide-line">
          <Row title="Blinkfix API" hint={API_BASE}>
            <Badge tone={online ? 'ok' : 'bad'}>{online ? 'Connected' : 'Unreachable'}</Badge>
          </Row>
          {health && (
            <>
              <Row
                title="Investigation model"
                hint={health.cerebras.configured ? 'Answers for the five investigation agents and writes quick candidate fixes.' : 'No API key set, so the built-in analysis is used.'}
              >
                <Badge tone={health.cerebras.configured ? 'ok' : 'neutral'}>{health.cerebras.model}</Badge>
              </Row>
              <Row
                title="Code Agent (Codex)"
                hint={
                  health.codex.configured
                    ? 'Browses the repository on GitHub and proposes a fix.'
                    : <>Not set up. Add <Mono>OPENAI_API_KEY</Mono> and <Mono>CODEX_MODEL</Mono> to <Mono>server/.env</Mono> and restart the server.</>
                }
              >
                <Badge tone={health.codex.configured ? 'ok' : 'neutral'}>{health.codex.model ?? 'Off'}</Badge>
              </Row>
              <Row
                title="Slack"
                hint={health.demo_mode ? 'Messages are simulated. Nothing is sent to Slack.' : 'Messages are sent to your incidents channel.'}
              >
                <Badge tone={health.demo_mode ? 'warn' : 'ok'}>{health.demo_mode ? 'Simulated' : 'Live'}</Badge>
              </Row>
            </>
          )}
        </div>
      </section>
    </div>
  );
};
