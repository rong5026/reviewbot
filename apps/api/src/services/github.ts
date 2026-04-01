import { App } from '@octokit/app';

let _app: App | undefined;

function getApp(): App {
  if (_app) return _app;
  const privateKey = process.env.GITHUB_APP_PRIVATE_KEY!;
  // Support base64-encoded keys (common in env vars)
  const decodedKey = privateKey.includes('BEGIN RSA')
    ? privateKey
    : Buffer.from(privateKey, 'base64').toString('utf-8');

  _app = new App({
    appId: process.env.GITHUB_APP_ID!,
    privateKey: decodedKey,
    webhooks: { secret: process.env.GITHUB_WEBHOOK_SECRET! },
    oauth: {
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    },
  });
  return _app;
}

export async function getInstallationClient(installationId: number) {
  const app = getApp();
  return app.getInstallationOctokit(installationId);
}

export async function getOAuthToken(code: string): Promise<{
  access_token: string;
  token_type: string;
}> {
  const response = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      client_id: process.env.GITHUB_CLIENT_ID!,
      client_secret: process.env.GITHUB_CLIENT_SECRET!,
      code,
    }),
  });
  if (!response.ok) throw new Error('GitHub OAuth token exchange failed');
  return response.json();
}

export async function getGithubUser(accessToken: string) {
  const response = await fetch('https://api.github.com/user', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/vnd.github+json',
    },
  });
  if (!response.ok) throw new Error('Failed to fetch GitHub user');
  return response.json() as Promise<{
    id: number;
    login: string;
    email: string | null;
  }>;
}
