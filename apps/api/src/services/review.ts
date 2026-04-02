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

const REVIEW_TOOL: Anthropic.Tool = {
  name: 'submit_review',
  description: 'Submit the completed code review result.',
  input_schema: {
    type: 'object',
    properties: {
      summary: {
        type: 'string',
        description:
          '2-3 sentence assessment. Start with overall quality, then call out the most important issue if any.',
      },
      riskLevel: {
        type: 'string',
        enum: ['low', 'medium', 'high', 'critical'],
        description:
          'critical=security/data-loss risk, high=likely production failure, medium=non-urgent bugs, low=style/minor',
      },
      inlineComments: {
        type: 'array',
        description: "Max 8 items. Only genuine issues worth a developer's attention.",
        items: {
          type: 'object',
          properties: {
            path: { type: 'string', description: 'File path relative to repo root' },
            line: { type: 'integer', description: 'Line number in the diff' },
            body: {
              type: 'string',
              description:
                'Issue description with suggested fix. Prefix with [ERROR], [WARNING], or [INFO].',
            },
            severity: { type: 'string', enum: ['info', 'warning', 'error'] },
          },
          required: ['path', 'line', 'body', 'severity'],
        },
      },
    },
    required: ['summary', 'riskLevel', 'inlineComments'],
  },
};

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
    tools: [REVIEW_TOOL],
    // Force Claude to always call submit_review — no free-text fallback
    tool_choice: { type: 'tool', name: 'submit_review' },
    messages: [
      {
        role: 'user',
        content: `Review this pull request.\n\n**Repo:** ${repoFullName}  \n**PR #${prNumber}:** ${prTitle}  \n**Description:** ${
          prDescription || '(no description)'
        }\n\n**Diff:**\n\`\`\`diff\n${truncatedDiff}\n\`\`\``,
      },
    ],
  });

  const toolUse = response.content.find((c) => c.type === 'tool_use');
  if (!toolUse || toolUse.type !== 'tool_use') {
    throw new Error('Claude did not return a tool_use block');
  }

  const parsed = toolUse.input as {
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
