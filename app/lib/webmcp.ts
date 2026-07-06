/** Minimal WebMCP types — experimental Chrome API (origin trial). */

export type WebMcpJsonSchema = {
  type: 'object';
  properties?: Record<string, unknown>;
  required?: string[];
};

export type WebMcpTool = {
  name: string;
  description: string;
  inputSchema: WebMcpJsonSchema;
  execute: (input: Record<string, unknown>) => Promise<unknown> | unknown;
  annotations?: {
    readOnlyHint?: boolean;
    untrustedContentHint?: boolean;
  };
};

export type WebMcpModelContext = {
  registerTool: (
    tool: WebMcpTool,
    options?: {signal?: AbortSignal; exposedTo?: string[]},
  ) => Promise<void>;
};

export function getWebMcpModelContext(): WebMcpModelContext | null {
  if (typeof document === 'undefined') return null;
  const mc = (document as Document & {modelContext?: WebMcpModelContext})
    .modelContext;
  return mc?.registerTool ? mc : null;
}

export async function registerWebMcpTools(
  tools: WebMcpTool[],
  signal?: AbortSignal,
): Promise<void> {
  const mc = getWebMcpModelContext();
  if (!mc) return;
  await Promise.all(
    tools.map((tool) => mc.registerTool(tool, signal ? {signal} : undefined)),
  );
}

export const CONCIERGE_INQUIRY_TYPES = [
  'Custom Orders',
  'Bespoke Pashmina',
  'Wedding Gifting',
  'Corporate Gifting',
  'Wholesale Inquiries',
  'Personal Shopping',
  'Press & Collaborations',
] as const;
