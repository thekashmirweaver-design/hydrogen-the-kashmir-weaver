import {redirect} from 'react-router';
import type {Route} from './+types/blogs.$blogHandle.$articleHandle';

export async function loader({params}: Route.LoaderArgs) {
  const slug = params.articleHandle;
  if (!slug) throw redirect('/journal');
  throw redirect(`/journal/${slug}`);
}

export default function ArticleRedirect() {
  return null;
}
