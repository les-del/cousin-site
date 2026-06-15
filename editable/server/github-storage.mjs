const GITHUB_HEADERS = {
  Accept: 'application/vnd.github+json',
  'X-GitHub-Api-Version': '2022-11-28',
  'User-Agent': 'cousin-cms',
};

export async function readGithubJson(filePath, config) {
  if (!config.githubToken) return null;
  const res = await fetch(
    'https://api.github.com/repos/' + config.githubRepo + '/contents/' + filePath,
    { headers: Object.assign({ Authorization: 'Bearer ' + config.githubToken }, GITHUB_HEADERS) }
  );
  if (res.status === 404) return null;
  if (!res.ok) throw new Error('GitHub read failed: ' + (await res.text()));
  const meta = await res.json();
  const raw = Buffer.from(meta.content, 'base64').toString('utf8');
  return { data: JSON.parse(raw), sha: meta.sha };
}

export async function writeGithubJson(filePath, data, message, config) {
  if (!config.githubToken) {
    throw new Error('GITHUB_TOKEN not configured — add it in Netlify environment variables');
  }
  const content = JSON.stringify(data, null, 2) + '\n';
  const base64 = Buffer.from(content).toString('base64');
  const headers = Object.assign(
    { Authorization: 'Bearer ' + config.githubToken, 'Content-Type': 'application/json' },
    GITHUB_HEADERS
  );

  let sha;
  const existing = await readGithubJson(filePath, config);
  if (existing) sha = existing.sha;

  const putRes = await fetch(
    'https://api.github.com/repos/' + config.githubRepo + '/contents/' + filePath,
    {
      method: 'PUT',
      headers,
      body: JSON.stringify({ message, content: base64, sha }),
    }
  );

  if (!putRes.ok) throw new Error('GitHub write failed: ' + (await putRes.text()));
  return { pushedToGitHub: true };
}
