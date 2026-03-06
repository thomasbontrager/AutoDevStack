/**
 * GitHub API helpers
 *
 * All requests are authenticated with the GITHUB_TOKEN env var.
 * Uses the native fetch available in Node 18+.
 */

const GITHUB_API = 'https://api.github.com';

function githubHeaders(accept = 'application/vnd.github+json') {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    throw Object.assign(new Error('GITHUB_TOKEN environment variable is not set'), { status: 500 });
  }
  return {
    Accept: accept,
    Authorization: `Bearer ${token}`,
    'X-GitHub-Api-Version': '2022-11-28',
  };
}

async function githubFetch(url, accept) {
  const res = await fetch(url, { headers: githubHeaders(accept) });
  if (!res.ok) {
    const body = await res.text();
    const err = new Error(`GitHub API error ${res.status}: ${body}`);
    err.status = res.status === 404 ? 404 : 502;
    throw err;
  }
  return res;
}

// ── Pull-request metadata ─────────────────────────────────────────────────────

export async function fetchPR(owner, repo, prNumber) {
  const res = await githubFetch(`${GITHUB_API}/repos/${owner}/${repo}/pulls/${prNumber}`);
  const data = await res.json();
  return {
    number: data.number,
    title: data.title,
    state: data.state,
    author: data.user?.login,
    body: data.body || '',
    base: data.base?.ref,
    head: data.head?.ref,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
    mergeable: data.mergeable,
    draft: data.draft,
    labels: (data.labels || []).map(l => l.name),
    changedFiles: data.changed_files,
    additions: data.additions,
    deletions: data.deletions,
    url: data.html_url,
  };
}

// ── Unified diff ──────────────────────────────────────────────────────────────

export async function fetchPRDiff(owner, repo, prNumber) {
  const res = await githubFetch(
    `${GITHUB_API}/repos/${owner}/${repo}/pulls/${prNumber}`,
    'application/vnd.github.diff',
  );
  return res.text();
}

// ── Check-run statuses ────────────────────────────────────────────────────────

export async function fetchPRChecks(owner, repo, prNumber) {
  // We need the head SHA first
  const prRes = await githubFetch(`${GITHUB_API}/repos/${owner}/${repo}/pulls/${prNumber}`);
  const pr = await prRes.json();
  const sha = pr.head?.sha;
  if (!sha) return [];

  const res = await githubFetch(`${GITHUB_API}/repos/${owner}/${repo}/commits/${sha}/check-runs`);
  const data = await res.json();
  return (data.check_runs || []).map(cr => ({
    name: cr.name,
    status: cr.status,
    conclusion: cr.conclusion,
    url: cr.html_url,
  }));
}

// ── Review decisions ──────────────────────────────────────────────────────────

export async function fetchPRReviews(owner, repo, prNumber) {
  const res = await githubFetch(`${GITHUB_API}/repos/${owner}/${repo}/pulls/${prNumber}/reviews`);
  const data = await res.json();
  return (data || []).map(rv => ({
    reviewer: rv.user?.login,
    state: rv.state,
    submittedAt: rv.submitted_at,
    body: rv.body || '',
  }));
}
