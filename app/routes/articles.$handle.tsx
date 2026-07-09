import {redirect} from 'react-router';
import type {Route} from './+types/articles.$handle';

export async function loader({params}: Route.LoaderArgs) {
  const slug = params.handle;
  if (!slug) throw redirect('/journal');
  throw redirect(`/journal/${slug}`);
}

export default function ArticleRedirect() {
  return null;
}
