'use client';

import {useEffect} from 'react';
import {useNavigate} from 'react-router';
import {
  CONCIERGE_INQUIRY_TYPES,
  registerWebMcpTools,
  type WebMcpTool,
} from '~/lib/webmcp';

/** Registers site-wide WebMCP tools when the browser supports `document.modelContext`. */
export function WebMcpTools() {
  const navigate = useNavigate();

  useEffect(() => {
    const controller = new AbortController();

    const tools: WebMcpTool[] = [
      {
        name: 'search_products',
        description:
          'Search The Kashmir Weaver catalog by keyword (product name, collection, or description). Opens the search results page.',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search term, e.g. "solid pashmina", "kani", "emerald".',
            },
          },
          required: ['query'],
        },
        annotations: {readOnlyHint: true},
        execute: ({query}) => {
          const q = String(query ?? '').trim();
          if (!q) return 'Please provide a search query.';
          navigate(`/search?q=${encodeURIComponent(q)}`);
          return `Opened search results for "${q}".`;
        },
      },
      {
        name: 'submit_concierge_inquiry',
        description:
          'Send a personal inquiry to The Kashmir Weaver atelier for custom orders, bespoke pashmina, wedding or corporate gifting, wholesale, personal shopping, or press.',
        inputSchema: {
          type: 'object',
          properties: {
            inquiryType: {
              type: 'string',
              enum: [...CONCIERGE_INQUIRY_TYPES],
              description: 'Reason for the inquiry.',
            },
            name: {type: 'string', description: 'Full name of the inquirer.'},
            email: {type: 'string', description: 'Contact email address.'},
            location: {
              type: 'string',
              description: 'Country or city.',
            },
            phone: {
              type: 'string',
              description: 'Optional phone number with country code.',
            },
            message: {
              type: 'string',
              description: 'How the atelier may assist.',
            },
          },
          required: ['inquiryType', 'name', 'email', 'location', 'message'],
        },
        annotations: {readOnlyHint: false},
        execute: async (input) => {
          const body = new FormData();
          body.set('inquiryType', String(input.inquiryType ?? ''));
          body.set('name', String(input.name ?? ''));
          body.set('email', String(input.email ?? ''));
          body.set('location', String(input.location ?? ''));
          body.set('phone', String(input.phone ?? ''));
          body.set('message', String(input.message ?? ''));

          const response = await fetch('/api/concierge', {
            method: 'POST',
            body,
          });
          const data = (await response.json()) as {
            success?: boolean;
            errors?: Record<string, string>;
          };

          if (data.success) {
            return 'Inquiry submitted. Our atelier will respond personally within 24 hours.';
          }

          if (data.errors) {
            return `Validation failed: ${Object.values(data.errors).join(' ')}`;
          }

          return 'Unable to submit inquiry. Please try again or email thekashmirweaver@gmail.com.';
        },
      },
    ];

    void registerWebMcpTools(tools, controller.signal);

    return () => controller.abort();
  }, [navigate]);

  return null;
}
