#!/usr/bin/env node
/**
 * Local Merchant Center MCP for The Kashmir Weaver.
 * Forked from mcp-google-merchant-center with ALLOWED_IDS fixed for 5822844259.
 */
import {Server} from '@modelcontextprotocol/sdk/server/index.js';
import {StdioServerTransport} from '@modelcontextprotocol/sdk/server/stdio.js';
import {CallToolRequestSchema, ListToolsRequestSchema} from '@modelcontextprotocol/sdk/types.js';
import {google} from 'googleapis';

const DEFAULT_MERCHANT_ID = process.env.MERCHANT_ID || '5822844259';
const ALLOWED_IDS = (
  process.env.MERCHANT_ALLOWED_IDS || '5822844259'
)
  .split(',')
  .map((id) => id.trim())
  .filter(Boolean);

const content = google.content('v2.1');

async function getAuth() {
  const auth = new google.auth.GoogleAuth({
    keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS,
    scopes: ['https://www.googleapis.com/auth/content'],
  });
  return auth.getClient();
}

function resolveMerchantId(id) {
  const resolved = id ? String(id) : DEFAULT_MERCHANT_ID;
  if (!ALLOWED_IDS.includes(resolved)) {
    throw new Error(
      `Merchant ID ${resolved} not allowed. Allowed: ${ALLOWED_IDS.join(', ')}`,
    );
  }
  return resolved;
}

const merchantIdProp = {
  merchant_id: {
    type: 'string',
    description: `Merchant Center ID (optional, default ${DEFAULT_MERCHANT_ID}). Allowed: ${ALLOWED_IDS.join(', ')}`,
  },
};

const server = new Server(
  {name: 'merchant-mcp', version: '1.1.0'},
  {capabilities: {tools: {}}},
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'get_account',
      description: 'Get Merchant Center account info',
      inputSchema: {type: 'object', properties: {...merchantIdProp}},
    },
    {
      name: 'list_products',
      description: 'List products in Merchant Center',
      inputSchema: {
        type: 'object',
        properties: {
          ...merchantIdProp,
          max_results: {
            type: 'number',
            description: 'Max products (default 50)',
          },
          page_token: {type: 'string', description: 'Pagination token'},
        },
      },
    },
    {
      name: 'get_product',
      description: 'Get a specific product',
      inputSchema: {
        type: 'object',
        required: ['product_id'],
        properties: {
          ...merchantIdProp,
          product_id: {
            type: 'string',
            description: 'Product ID (e.g. online:en:US:123)',
          },
        },
      },
    },
    {
      name: 'search_products',
      description: 'Search products by title or brand',
      inputSchema: {
        type: 'object',
        properties: {
          ...merchantIdProp,
          query: {type: 'string', description: 'Title or brand text'},
          max_results: {
            type: 'number',
            description: 'Max results (default 50)',
          },
        },
      },
    },
    {
      name: 'list_data_sources',
      description: 'List Merchant Center data feeds',
      inputSchema: {type: 'object', properties: {...merchantIdProp}},
    },
    {
      name: 'get_product_status',
      description: 'Product approval status and issues',
      inputSchema: {
        type: 'object',
        properties: {
          ...merchantIdProp,
          max_results: {
            type: 'number',
            description: 'Max products (default 50)',
          },
        },
      },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const auth = await getAuth();
  const args = request.params.arguments || {};

  try {
    const merchantId = resolveMerchantId(args.merchant_id);

    if (request.params.name === 'get_account') {
      const res = await content.accounts.get({
        merchantId,
        accountId: merchantId,
        auth,
      });
      return {content: [{type: 'text', text: JSON.stringify(res.data, null, 2)}]};
    }

    if (request.params.name === 'list_products') {
      const {max_results = 50, page_token} = args;
      const res = await content.products.list({
        merchantId,
        maxResults: max_results,
        pageToken: page_token,
        auth,
      });
      return {content: [{type: 'text', text: JSON.stringify(res.data, null, 2)}]};
    }

    if (request.params.name === 'get_product') {
      const res = await content.products.get({
        merchantId,
        productId: args.product_id,
        auth,
      });
      return {content: [{type: 'text', text: JSON.stringify(res.data, null, 2)}]};
    }

    if (request.params.name === 'search_products') {
      const {query = '', max_results = 50} = args;
      const res = await content.products.list({
        merchantId,
        maxResults: 250,
        auth,
      });
      const products = (res.data.resources || [])
        .filter(
          (p) =>
            p.title?.toLowerCase().includes(query.toLowerCase()) ||
            p.brand?.toLowerCase().includes(query.toLowerCase()),
        )
        .slice(0, max_results);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({products, total: products.length}, null, 2),
          },
        ],
      };
    }

    if (request.params.name === 'list_data_sources') {
      const res = await content.datafeeds.list({merchantId, auth});
      return {content: [{type: 'text', text: JSON.stringify(res.data, null, 2)}]};
    }

    if (request.params.name === 'get_product_status') {
      const {max_results = 50} = args;
      const res = await content.productstatuses.list({
        merchantId,
        maxResults: max_results,
        auth,
      });
      return {content: [{type: 'text', text: JSON.stringify(res.data, null, 2)}]};
    }

    return {
      content: [{type: 'text', text: `Unknown tool: ${request.params.name}`}],
    };
  } catch (err) {
    return {
      content: [{type: 'text', text: `Error: ${err.message}`}],
      isError: true,
    };
  }
});

const transport = new StdioServerTransport();
await server.connect(transport);
