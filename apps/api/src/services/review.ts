import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

export interface ReviewComment {
  path: string;
  line: number;
  body: string;
  severity: 'info' | 'warning' | 'error';
}

export interface ReviewResult {
  summary: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  inlineComments: ReviewComment[];
  tokensUsed: number;
}

const SYSTEM_PROMPT = `You are ReviewBot, an expert senior software engineer performing an automated code review.
Your goal is to provide concise, actionable feedback that saves developers time.

Review dimensions (in priority order):
1. Security vulnerabilities: injection, XSS, auth bypasses, exposed secrets
2. Logic bugs: off-by-one, null dereferences, race conditions, wrong assumptions
3. Performance: N+1 queries, unbounded loops, unnecessary allocations
4. Error handling: unhandled exceptions, missing validation at boundaries
5. Code quality: unclear naming, duplicated logic, missing tests for critical paths

Be direct. Reference exact file paths and line numbers. Omit praise.`;

export async function reviewPR(opts: {
  prTitle: string;
  prDescription: string;
  diff: string;
  repoFullName: string;
  prNumber: number;
}): Promise<ReviewResult> {
  const { prTitle, prDescription, diff, repoFullName, prNumber } = opts;
  // Truncate diff to avoid token overflow (~30k chars ≈ 8k tokens)
  const truncatedDiff =
    diff.length > 30_000
      ? diff.slice(0, 30_000) + '\n\n[diff truncated — showing first 30k chars]'
      : diff;

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: `Review this pull request and return a JSON response.

**Repo:** ${repoFullName}  
**PR #${prNumber}:** ${prTitle}  
**Description:** ${prDescription || '(no description)'}

**Diff:**
\`\`\`diff
${truncatedDiff}
\`\`\`

Respond with ONLY valid JSON (no markdown fence):
{
  "summary": "2-3 sentence assessment. Start with the overall quality, then call out the most important issue if any.",
  "riskLevel": "low|medium|high|critical",
  "inlineComments": [
    {
      "path": "path/to/file.ts",
      "line": 42,
      "body": "**[ERROR|WARNING|INFO]** Specific issue. Suggested fix or explanation.",
      "severity": "error|warning|info"
    }
  ]
}

Rules:
- Max 8 inline comments. Only for genuine issues.
- riskLevel = critical if there are security vulnerabilities or data loss risks.
- riskLevel = high if there are logic bugs likely to cause production failures.
- riskLevel = medium for issues that will cause problems but are not urgent.
- riskLevel = low for style or minor improvements.
- If the PR looks good, say so in the summary and return empty inlineComments.`,
      },
    ],
  });

  const content = response.content[0];
  if (content.type !== 'text') throw new Error('Unexpected response type from Claude');

  // Parse JSON — strip any accidental markdown fences
  const cleaned = content.text.replace(/^```[\w]*\n?/m, '').replace(/\n?```$/m, '').trim();
  const parsed = JSON.parse(cleaned) as {
    summary: string;
    riskLevel: ReviewResult['riskLevel'];
    inlineComments: ReviewComment[];
  };

  return {
    summary: parsed.summary,
    riskLevel: parsed.riskLevel,
    inlineComments: parsed.inlineComments ?? [],
    tokensUsed: response.usage.input_tokens + response.usage.output_tokens,
  };
}
