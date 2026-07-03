import {redirect} from 'react-router';
import type {Route} from './+types/blogs.$blogHandle._index';

export async function loader() {
  throw redirect('/journal');
}

export default function BlogRedirect() {
  return null;
}
