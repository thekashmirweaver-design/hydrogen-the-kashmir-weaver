import {Outlet} from 'react-router';

/** Layout route for `/book` — the landing page lives in `book._index`. */
export default function BookRouteLayout() {
  return <Outlet />;
}