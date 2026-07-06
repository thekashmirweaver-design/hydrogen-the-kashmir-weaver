import type {
  FormHTMLAttributes,
  InputHTMLAttributes,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react';

/** Chrome WebMCP declarative API attributes (origin trial). */
type WebMcpFormAttributes = {
  toolname?: string;
  tooldescription?: string;
};

type WebMcpFieldAttributes = {
  toolparamdescription?: string;
};

type WebMcpRegisterTool = (
  tool: {
    name: string;
    description: string;
    inputSchema: Record<string, unknown>;
    execute: (input: Record<string, unknown>) => Promise<unknown> | unknown;
  },
  options?: {signal?: AbortSignal; exposedTo?: string[]},
) => Promise<void>;

declare global {
  interface Document {
    modelContext?: {
      registerTool: WebMcpRegisterTool;
    };
  }

  interface SubmitEvent {
    agentInvoked?: boolean;
    respondWith?: (promise: Promise<unknown>) => void;
  }
}

declare module 'react' {
  interface FormHTMLAttributes<T> extends WebMcpFormAttributes {}
  interface InputHTMLAttributes<T> extends WebMcpFieldAttributes {}
  interface SelectHTMLAttributes<T> extends WebMcpFieldAttributes {}
  interface TextareaHTMLAttributes<T> extends WebMcpFieldAttributes {}
}

export {};
