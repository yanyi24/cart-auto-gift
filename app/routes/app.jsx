import { json } from "@remix-run/node";
import { Link, Outlet, useLoaderData, useRouteError } from "@remix-run/react";
import { boundary } from "@shopify/shopify-app-remix/server";
import { AppProvider } from "@shopify/shopify-app-remix/react";
import {NavMenu, useAppBridge} from "@shopify/app-bridge-react";
import polarisStyles from "@shopify/polaris/build/esm/styles.css?url";
import { authenticate } from "../shopify.server";
import {I18nManager, I18nContext} from "@shopify/react-i18n";
import {useEffect, useState} from "react";
import {DiscountProvider} from "../components/DiscountProvider.jsx";

export const links = () => [{ rel: "stylesheet", href: polarisStyles }];

export const loader = async ({ request }) => {
  await authenticate.admin(request);
  return json({ apiKey: process.env.SHOPIFY_API_KEY || "" });
};

export default function App() {
  const { apiKey } = useLoaderData();
  const app = useAppBridge();
  const [locale, setLocale] = useState('en');

  useEffect(() => {
    setLocale(app.config.locale);
  }, [app]);

  const i18nManager = new I18nManager({
    locale,
    onError(error) {
      boundary.error(error);
    },
  });
  return (
    <AppProvider isEmbeddedApp apiKey={apiKey}>
      <I18nContext.Provider value={i18nManager}>
        <DiscountProvider>
          <ui-nav-menu>
            <Link to="/app" rel="home">
              Home
            </Link>
            <Link to="/app/additional">Additional page</Link>
          </ui-nav-menu>
          <Outlet />
        </DiscountProvider>
      </I18nContext.Provider>
    </AppProvider>
  );
}

// Shopify needs Remix to catch some thrown responses, so that their headers are included in the response.
export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
