import {BlockStack, Button, Card, InlineStack, Text} from "@shopify/polaris";
import {useState} from "react";

export default function SelectProducts({multiple}) {
  const [selectedProducts, setSelectedProducts] = useState([]);

  async function selectProduct(action = 'select') {
    const products = await window.shopify.resourcePicker({
      type: "product",
      action,
      multiple
    });

    if (products) {
      setSelectedProducts(products);
    }
  }

  console.log({selectedProducts})
  return (
    <Card>
      <BlockStack gap="500">
        <InlineStack align="space-between">
          <Text as={"h2"} variant="headingLg">
            Product
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
  );
}
