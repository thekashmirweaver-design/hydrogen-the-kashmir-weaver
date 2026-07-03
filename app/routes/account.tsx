import {
  data as remixData,
  Form,
  NavLink,
  Outlet,
  useLoaderData,
} from 'react-router';
import type {Route} from './+types/account';
import {CUSTOMER_DETAILS_QUERY} from '~/graphql/customer-account/CustomerDetailsQuery';
import {Eyebrow} from '~/components/gulriza/Eyebrow';

export function shouldRevalidate() {
  return true;
}

export async function loader({context}: Route.LoaderArgs) {
  const {customerAccount} = context;
  const {data, errors} = await customerAccount.query(
    CUSTOMER_DETAILS_QUERY,
    {
      variables: {
        language: customerAccount.i18n.language,
      },
    },
  );

  if (errors?.length || !data?.customer) {
    throw new Error('Customer not found');
  }

  return remixData(
    {customer: data.customer},
    {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    },
  );
}

export default function AccountLayout() {
  const {customer} = useLoaderData<typeof loader>();

  const heading = customer.firstName
    ? `Welcome, ${customer.firstName}`
    : 'Your account';

  return (
    <section className="mx-auto max-w-[1100px] px-6 pt-32 pb-24 md:px-10">
      <Eyebrow>Account</Eyebrow>
      <h1
        className="font-display mt-6 text-4xl leading-tight md:text-5xl"
        style={{fontWeight: 400}}
      >
        {heading}
      </h1>
      <AccountMenu />
      <div className="mt-12">
        <Outlet context={{customer}} />
      </div>
    </section>
  );
}

function AccountMenu() {
  const linkClass = ({isActive}: {isActive: boolean}) =>
    `tracked text-sm transition hover:text-accent ${isActive ? 'text-accent' : 'text-muted-foreground'}`;

  return (
    <nav
      role="navigation"
      className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3 border-b pb-6"
      style={{borderColor: 'var(--border)'}}
    >
      <NavLink to="/account/orders" className={linkClass}>
        Orders
      </NavLink>
      <NavLink to="/account/profile" className={linkClass}>
        Profile
      </NavLink>
      <NavLink to="/account/addresses" className={linkClass}>
        Addresses
      </NavLink>
      <Logout />
    </nav>
  );
}

function Logout() {
  return (
    <Form method="POST" action="/account/logout">
      <button
        type="submit"
        className="tracked text-sm text-muted-foreground transition hover:text-accent"
      >
        Sign out
      </button>
    </Form>
  );
}
