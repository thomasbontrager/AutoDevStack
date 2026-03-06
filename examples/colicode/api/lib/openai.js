/**
 * OpenAI helpers
 *
 * Uses the native fetch available in Node 18+ to call the OpenAI Chat
 * Completions API without adding the openai npm package as a dependency.
 * This keeps the server lightweight and avoids version-pinning concerns.
 */

const OPENAI_API = 'https://api.openai.com/v1';

function openaiHeaders() {
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    throw Object.assign(new Error('OPENAI_API_KEY environment variable is not set'), { status: 500 });
  }
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${key}`,
  };
}

async function chatCompletion(messages, { maxTokens = 1024 } = {}) {
  const model = process.env.OPENAI_MODEL || 'gpt-4o';
  const res = await fetch(`${OPENAI_API}/chat/completions`, {
    method: 'POST',
    headers: openaiHeaders(),
    body: JSON.stringify({
      model,
      messages,
      max_tokens: maxTokens,
      temperature: 0.2,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    const err = new Error(`OpenAI API error ${res.status}: ${body}`);
    err.status = 502;
    throw err;
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content?.trim() ?? '';
}

// ── Code review ───────────────────────────────────────────────────────────────

export async function reviewCode(code, { filename, language } = {}) {
  const context = [
    filename ? `File: ${filename}` : null,
    language ? `Language: ${language}` : null,
  ]
    .filter(Boolean)
    .join('\n');

  const systemPrompt = `You are an expert software engineer performing a thorough code review.
Analyze the provided code and give structured feedback covering:
1. **Correctness** — logic errors, edge cases, off-by-one issues
2. **Security** — injection risks, insecure defaults, secret exposure
3. **Performance** — unnecessary allocations, N+1 queries, blocking operations
4. **Readability** — naming, comments, complexity
5. **Best practices** — idiomatic patterns for the language/framework

Be concise and actionable. Use markdown for formatting. Focus only on real issues.`;

  const userPrompt = `${context ? context + '\n\n' : ''}Please review the following code:\n\n\`\`\`\n${code}\n\`\`\``;

  return chatCompletion(
    [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    { maxTokens: 1500 },
  );
}

// ── Code improvement suggestion ───────────────────────────────────────────────

export async function suggestImprovement(code, instruction, { filename } = {}) {
  const systemPrompt = `You are an expert software engineer. When given a code snippet and an instruction,
you return only the improved code — no explanations, no markdown fences, no commentary.
Preserve the original indentation style. Make only the changes necessary to fulfil the instruction.`;

  const userPrompt = `${filename ? `File: ${filename}\n\n` : ''}Instruction: ${instruction}\n\nCode:\n${code}`;

  return chatCompletion(
    [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    { maxTokens: 2048 },
  );
}

// ── PR insights ───────────────────────────────────────────────────────────────

export async function generateInsights(pr, diff) {
  const systemPrompt = `You are a senior software engineer reviewing a GitHub pull request.
Given the PR metadata and the unified diff, produce a concise analysis with these sections:
1. **Summary** — one paragraph describing what the PR does
2. **Key changes** — bullet list of the most important modifications
3. **Potential concerns** — risks, missing tests, breaking changes (or "None identified")
4. **Suggestions** — up to 3 concrete improvement ideas (or "None")

Use markdown. Be direct and specific.`;

  const prContext = `PR #${pr.number}: ${pr.title}
Author: ${pr.author}  |  Base: ${pr.base} ← Head: ${pr.head}
Labels: ${pr.labels.join(', ') || 'none'}
+${pr.additions} / -${pr.deletions} across ${pr.changedFiles} file(s)

Description:
${pr.body || '(none)'}`;

  const userPrompt = `${prContext}\n\nDiff (truncated to 6000 chars):\n\`\`\`diff\n${diff}\n\`\`\``;

  return chatCompletion(
    [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    { maxTokens: 1200 },
  );
}
