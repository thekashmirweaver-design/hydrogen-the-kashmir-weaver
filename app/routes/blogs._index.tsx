import {redirect} from 'react-router';
import type {Route} from './+types/blogs._index';

export async function loader() {
  throw redirect('/journal');
}

export default function BlogsRedirect() {
  return null;
}
