import {
  Page,
  Layout,
  BlockStack,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import SelectProducts from "../components/selectProducts.jsx";

export const loader = async ({ request }) => {
  await authenticate.admin(request);

  return null;
};



export default function Index() {




  return (
    <Page>
      <TitleBar title="Remix app template">

      </TitleBar>
      <BlockStack gap="500">
        <Layout>
          <Layout.Section>
            {/*<SelectProducts multiple={true} />*/}
          </Layout.Section>
          <Layout.Section variant="oneThird">
          </Layout.Section>
        </Layout>
      </BlockStack>
    </Page>
  );
}
