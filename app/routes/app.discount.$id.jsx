import {
  BlockStack, Box, Button, Card, Divider, InlineGrid, Layout, Page, RadioButton, Select, Text, TextField
} from "@shopify/polaris";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { useCallback, useState } from "react";
import { DeleteIcon, PlusIcon } from "@shopify/polaris-icons";
import shopify from "../shopify.server.js";
import CurrencySymbol from "../components/CurrencySymbol.jsx";
import SelectedTargets from "../components/SelectedTargets.jsx";

export const loader = async ({ params, request }) => {
  const { admin } = await shopify.authenticate.admin(request);
  const response = await admin.graphql(`
    query shopInfo {
      shop {
        currencyCode
      }
    }
  `);
  const { data } = await response.json();
  return json({
    isNew: params.id === 'new',
    currencyCode: data.shop.currencyCode,
  });
};

export const action = async ({ request }) => {
  // TODO: implement
};

export default function Discount() {
  const { isNew, currencyCode } = useLoaderData();
  const [buyType, setBuyType] = useState('ALL_PRODUCTS');
  const [triggerCondition, setTriggerCondition] = useState('QUANTITY');
  const [conditions, setConditions] = useState([{ quantity: undefined, amount: undefined, products: [] }]);
  const [selectedBuysProducts, setSelectedBuysProducts] = useState([]);
  const [selectedBuysCollections, setSelectedBuysCollections] = useState([]);

  // Options for Select dropdown
  const buyTypeOptions = [
    { label: 'All products', value: 'ALL_PRODUCTS' },
    { label: 'Specific products', value: 'PRODUCTS' },
    { label: 'Specific collections', value: 'COLLECTIONS' },
  ];

  // Handle state change callbacks
  const handleBuyTypeChange = useCallback(setBuyType, [setBuyType]);
  const handleConditionChange = useCallback((_, newValue) => setTriggerCondition(newValue), []);

  const updateConditionValue = useCallback((idx, newValue, type) => {
    setConditions((prev) => prev.map((c, i) => i === idx ? { ...c, [type]: newValue } : c));
  }, []);

  // Handle resource selection
  async function handleResourceSelect(type, selectionIds, idx = null) {
    const data = await resourcePicker({ type, selectionIds });
    if (data?.length) {
      if (idx !== null) {
        setConditions((prev) =>
          prev.map((condition, i) => i === idx ? { ...condition, products: data } : condition)
        );
      } else {
        type === 'collection' ? setSelectedBuysCollections(data) : setSelectedBuysProducts(data);
      }
    }
  }

  const handleSelectBuys = () => handleResourceSelect(buyType === 'COLLECTIONS' ? 'collection' : 'product', buyType === 'COLLECTIONS' ? selectedBuysCollections : selectedBuysProducts);
  const handleSelectGets = (idx) => handleResourceSelect('product', conditions[idx].products, idx);

  // Handle adding/removing conditions
  function addCondition() {
    if (conditions.some(c => c.products.length === 0)) return;
    setConditions([...conditions, { quantity: undefined, amount: undefined, products: [] }]);
  }

  function removeCondition(idx) {
    setConditions(conditions.filter((_, i) => i !== idx));
  }

  return (
    <Page
      backAction={{ url: '/app/discounts' }}
      title={isNew ? 'New discount' : 'Edit discount'}
      primaryAction={{ content: 'Save', onAction: () => {} }}
    >
      <Layout>
        <Layout.Section>
          <form method="post" id="discountForm">
            <input type="hidden" name="isNew" value={isNew} />
            <BlockStack gap="400">
              <Card>
                <BlockStack>
                  <Text variant="headingMd" as="h2">Title</Text>
                  <TextField
                    autoComplete="off"
                    label="Title"
                    labelHidden
                    helpText="Customers will see this in their cart and at checkout."
                  />
                </BlockStack>
              </Card>

              {/* Customer Buys Section */}
              <Card>
                <BlockStack gap="200">
                  <Text variant="headingMd" as="h2">Customer buys</Text>
                  <Box paddingBlockEnd="100">
                    <Text as="p">Any items from</Text>
                    <InlineGrid columns="2fr auto" gap={buyType === 'ALL_PRODUCTS' ? "0" : "200"}>
                      <Select
                        label="Any items from"
                        labelHidden
                        options={buyTypeOptions}
                        onChange={handleBuyTypeChange}
                        value={buyType}
                      />
                      {buyType !== 'ALL_PRODUCTS' && (
                        <Button onClick={handleSelectBuys}>Browse</Button>
                      )}
                    </InlineGrid>
                  </Box>
                  {
                    buyType === 'PRODUCTS' && (
                      <SelectedTargets
                        products={selectedBuysProducts}
                        onRemove={(id) => setSelectedBuysProducts(selectedBuysProducts.filter((p) => p.id !== id))}
                        onEdit={handleSelectBuys}
                        currencyCode={currencyCode}
                      />
                    )
                  }
                  {
                    buyType === 'COLLECTIONS' && (
                      <SelectedTargets
                        collections={selectedBuysCollections}
                        onRemove={(id) => setSelectedBuysCollections(selectedBuysCollections.filter((c) => c.id !== id))}
                        currencyCode={currencyCode}
                      />
                    )
                  }
                </BlockStack>
              </Card>

              {/* Purchase Conditions Section */}
              <Card>
                <BlockStack gap="200">
                  <Text variant="headingMd" as="h2">Purchase conditions</Text>
                  <Box>
                    <BlockStack>
                      <RadioButton
                        label="Minimum quantity of items"
                        checked={triggerCondition === 'QUANTITY'}
                        id="QUANTITY"
                        name="trigger_condition"
                        onChange={handleConditionChange}
                      />
                      <RadioButton
                        label="Minimum purchase amount"
                        id="AMOUNT"
                        name="trigger_condition"
                        checked={triggerCondition === 'AMOUNT'}
                        onChange={handleConditionChange}
                      />
                    </BlockStack>
                  </Box>
                  <Divider />
                  <Box>
                    <BlockStack>
                      <Text as="p">{triggerCondition === 'QUANTITY' ? 'Quantity' : 'Amount'}</Text>
                    </BlockStack>
                    <BlockStack gap="400">
                    {conditions.map((condition, idx) => (
                      <Box key={idx}>
                        <Box paddingBlockEnd="300">
                          <InlineGrid columns="2fr auto auto" gap="200">
                            {triggerCondition === 'QUANTITY' && (
                              <TextField
                                autoComplete="off"
                                type="number"
                                onChange={(value) => updateConditionValue(idx, value, 'quantity')}
                                value={condition.quantity}
                                label="Quantity"
                                labelHidden
                              />
                            )}
                            {triggerCondition === 'AMOUNT' && (
                              <TextField
                                autoComplete="off"
                                type="number"
                                onChange={(value) => updateConditionValue(idx, value, 'amount')}
                                value={condition.amount}
                                label="Amount"
                                labelHidden
                                prefix={<CurrencySymbol currencyCode={currencyCode} />}
                              />
                            )}
                            <Button onClick={() => handleSelectGets(idx)}>Customer gets</Button>
                            <Button icon={DeleteIcon} onClick={() => removeCondition(idx)} />
                          </InlineGrid>

                        </Box>
                        <SelectedTargets
                          products={condition.products}
                          onRemove={(id) => updateConditionValue(idx, condition.products.filter((p) => p.id !== id), 'products')}
                          onEdit={() => handleSelectGets(idx)}
                          currencyCode={currencyCode}
                        />
                      </Box>
                    ))}
                    </BlockStack>
                  </Box>
                  <Box>
                    <Button onClick={addCondition} accessibilityLabel="Add condition" variant="plain" icon={PlusIcon}>Add condition</Button>
                  </Box>
                </BlockStack>
              </Card>
            </BlockStack>
          </form>
        </Layout.Section>
        <Layout.Section variant="oneThird">
          <Card />
        </Layout.Section>
      </Layout>
    </Page>
  );
}

async function resourcePicker({ type, selectionIds }) {
  return await window.shopify.resourcePicker({
    type,
    action: 'add',
    multiple: true,
    selectionIds
  });
}
