import {redirect} from 'react-router';
import type {Route} from './+types/articles.$handle';

const PERMANENT_CACHE = {
  status: 301,
  headers: {
    'Cache-Control': 'public, max-age=86400',
  },
} as const;

export async function loader({params}: Route.LoaderArgs) {
  const slug = params.handle;
  if (!slug) throw redirect('/journal', PERMANENT_CACHE);
  throw redirect(`/journal/${slug}`, PERMANENT_CACHE);
}

export default function ArticleRedirect() {
  return null;
}
