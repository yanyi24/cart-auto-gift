import {
  Page,
  Layout,
  BlockStack, InlineStack, Text, Button, Card,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import {useState} from "react";
import {useI18n} from "@shopify/react-i18n";
import en from '../locales/en.json';
import zhCN from '../locales/zh-CN.json';

export const loader = async ({ request }) => {
  await authenticate.admin(request);

  return null;
};



export default function Index() {
  const [i18n, ShareTranslations] = useI18n({
    id: 'greeting',
    fallback: en,
    translations: {
      en,
      'zh-CN': zhCN
    }
  });

  const [selectedProducts, setSelectedProducts] = useState([]);

  async function selectProduct() {
    const products = await window.shopify.resourcePicker({
      type: "product",
      action: 'add',
      multiple: true
    });

    if (products) {
      setSelectedProducts(products);
    }
  }



  return (

    <Page>
      <TitleBar title="Remix app template">

      </TitleBar>
      <BlockStack gap="500">
        <Layout>
          <Layout.Section>
            <Card>
              <BlockStack gap="500">
                <InlineStack align="space-between">
                  <Text as={"h2"} variant="headingLg">
                   Products {i18n.translate('greeting')}
                  </Text>
                  {selectedProducts.length > 0 && (
                    <Button variant="plain" onClick={selectProduct}>
                      Change products
                    </Button>
                  )}
                </InlineStack>
                {selectedProducts.length > 0 ? (
                  <InlineStack blockAlign="center" gap="500">
                    Change product
                  </InlineStack>
                ) : (
                  <BlockStack gap="200">
                    <Button onClick={selectProduct} id="select-product">
                      Select products
                    </Button>
                  </BlockStack>
                )}
              </BlockStack>
            </Card>
          </Layout.Section>
          <Layout.Section variant="oneThird">
          </Layout.Section>
        </Layout>
      </BlockStack>
    </Page>
  );
}
