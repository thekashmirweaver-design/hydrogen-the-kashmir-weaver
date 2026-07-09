import {redirect} from 'react-router';
import type {Route} from './+types/articles._index';

const PERMANENT_CACHE = {
  status: 301,
  headers: {
    'Cache-Control': 'public, max-age=86400',
  },
} as const;

export async function loader() {
  throw redirect('/journal', PERMANENT_CACHE);
}

export default function ArticlesRedirect() {
  return null;
}
