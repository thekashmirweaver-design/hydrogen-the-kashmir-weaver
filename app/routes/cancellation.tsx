import {redirect} from 'react-router';

/** Legacy URL — cancellation rules live under Returns. */
const PERMANENT = {
  status: 301,
  headers: {'Cache-Control': 'public, max-age=86400'},
} as const;

export async function loader() {
  throw redirect('/returns', PERMANENT);
}

export default function CancellationRedirect() {
  return null;
}
