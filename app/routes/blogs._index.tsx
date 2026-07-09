import {redirect} from 'react-router';
import type {Route} from './+types/blogs._index';

const PERMANENT_CACHE = {
  status: 301,
  headers: {
    'Cache-Control': 'public, max-age=86400',
  },
} as const;

export async function loader() {
  // 301 (permanent) — the legacy /blogs path was retired when /journal
  // became the canonical journal. Cache the redirect for 24 h so CDN
  // and crawlers converge on /journal quickly.
  throw redirect('/journal', PERMANENT_CACHE);
}

export default function BlogsRedirect() {
  return null;
}
