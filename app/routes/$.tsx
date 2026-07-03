import {NotFoundView} from '~/components/PageLayout';

export const meta = () => {
  return [{title: 'Not Found — The Kashmir Weaver'}];
};

export default function NotFoundRoute() {
  return <NotFoundView />;
}
