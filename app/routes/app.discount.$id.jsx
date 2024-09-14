import {
  BlockStack, Box, Button, Card, Divider, InlineGrid, Layout, Page, PageActions, RadioButton, Select, Text, TextField
} from "@shopify/polaris";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import {useCallback, useMemo, useState} from "react";
import { DeleteIcon, PlusIcon } from "@shopify/polaris-icons";
import shopify from "../shopify.server.js";
import CurrencySymbol from "../components/CurrencySymbol.jsx";
import SelectedTargets from "../components/SelectedTargets.jsx";
import {ActiveDatesCard } from "@shopify/discount-app-components";
import {useField} from "@shopify/react-form";
import {removeGidStr} from "../utils.js";

let functionId = null;
export const loader = async ({ params, request }) => {
  const { admin } = await shopify.authenticate.admin(request);

  const response = await admin.graphql(`
    query shopInfo {
      shop {
        currencyCode
      }
    }
  `);
  const functionsRes = await admin.graphql(`
    query functionsInfo {
      shopifyFunctions(first: 250){
        nodes{
          app{
            handle
          }
          apiType
          title
          id
        }
      }
    }
  `);

  const { data } = await response.json();
  const functions = await functionsRes.json();
  functionId = functions.data?.shopifyFunctions?.nodes.find(node => (node.apiType === 'product_discounts' && node.app.handle === 'cart-auto-gift'))?.id;
  return json({
    isNew: params.id === 'new',
    currencyCode: data?.shop?.currencyCode,
  });
};


export const action = async ({ request }) => {
  const { admin } = await shopify.authenticate.admin(request);
  const formData = await request.formData();
  // https://yanyi-checkout.myshopify.com/products/the-collection-snowboard-oxygen 48647179534626
  // https://yanyi-checkout.myshopify.com/products/the-collection-snowboard-liquid 48647179960610
  // https://yanyi-checkout.myshopify.com/products/the-compare-at-price-snowboard?variant=48647179338018
  //'48647179338018'
  const rule = formData.get('rule');
  const isNew = formData.get('isNew');
  const buys = JSON.parse(formData.get('buys'));
  const startsAt = formData.get('startDate');
  const endsAt = formData.get('endDate') || null;
  const conditions = JSON.parse(formData.get('conditions'));
  const title = formData.get('title');
  const metafields = [
    {
      namespace: "$app:auto-gift",
      key: "amount-configuration",
      type: "json",
      value: JSON.stringify(
        {
          buys,
          rule,
          conditions
        }
      ),
    },
  ];
  const baseDiscount = {
    functionId,
    title,
    startsAt,
    endsAt,
    combinesWith: {
      orderDiscounts: true,
      productDiscounts: true,
      shippingDiscounts: true,
    }
  };
  console.log(baseDiscount)
  const response = await admin.graphql(
      `#graphql
    mutation CreateAutomaticDiscount($discount: DiscountAutomaticAppInput!) {
      discountCreate: discountAutomaticAppCreate(automaticAppDiscount: $discount) {
        automaticAppDiscount {
          discountId
        }
        userErrors {
          code
          message
          field
        }
      }
    }`,
    {
      variables: {
        discount: {
          ...baseDiscount,
          metafields,
        },
      },
    },
  );

  const responseJson = await response.json();
  const errors = responseJson.data.discountCreate?.userErrors;
  const discount = responseJson.data.discountCreate?.automaticAppDiscount;
  console.log({errors, discount})
  return null;
};

export default function Discount() {
  const { isNew, currencyCode } = useLoaderData();
  const [title, setTitle] = useState('test');
  const [buyType, setBuyType] = useState('ALL_PRODUCTS');
  const [rule, setRule] = useState('QUANTITY');
  const [conditions, setConditions] = useState([{
    quantity: undefined,
    amount: undefined,
    products: [],
    discounted: 'FREE',
    discountedPercentage: '',
    discountedEachOff: ''
  }]);
  const [selectedBuysProducts, setSelectedBuysProducts] = useState([]);
  const [selectedBuysCollections, setSelectedBuysCollections] = useState([]);
  const todayDate = useMemo(() => new Date(), []);

  const startDate = useField(todayDate);
  const endDate = useField(null);

  // Options for Select dropdown
  const buyTypeOptions = [
    { label: 'All products', value: 'ALL_PRODUCTS' },
    { label: 'Specific products', value: 'PRODUCTS' },
    { label: 'Specific collections', value: 'COLLECTIONS' },
  ];

  // Handle state change callbacks
  const handleTitleChange = useCallback((newValue) => setTitle(newValue), []);
  const handleBuyTypeChange = useCallback(setBuyType, [setBuyType]);
  const handleRuleChange = useCallback((_, newValue) => setRule(newValue), []);

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
    setConditions([...conditions, { quantity: undefined, amount: undefined, products: [], discounted: 'FREE', discountedPercentage: '', discountedEachOff: '' }]);
  }

  function removeCondition(idx) {
    setConditions(conditions.filter((_, i) => i !== idx));
  }
  async function handleSave() {
    const form = document.getElementById('discountForm');
    const buys = {
      type: buyType
    };
    if (buyType === 'ALL_PRODUCTS') {
      buys.value = [];
    } else if (buyType === 'PRODUCTS') {
      buys.value = JSON.parse(JSON.stringify(selectedBuysProducts)).map(p => ({
        productId: removeGidStr(p.id),
        variants: p.variants.map(v => removeGidStr(v.id))
      }));
    } else if (buyType === 'COLLECTIONS') {
      buys.value = selectedBuysCollections.map(c => removeGidStr(c.id));
    }

    form.querySelector('input[name="buys"]').value = JSON.stringify(buys);

    const conditionsData = JSON.parse(JSON.stringify(conditions)).map(c => {
      c.products = c.products.map(p => ({
        productId: removeGidStr(p.id),
        variants: p.variants.map(v => removeGidStr(v.id))
      }));
      c.quantity && (c.quantity = Number(c.quantity));
      c.amount && (c.amount = Number(c.amount));
      c.discountedPercentage = Number(c.discountedPercentage);
      c.discountedEachOff = Number(c.discountedEachOff);
      return c;
    });
    form.querySelector('input[name="conditions"]').value = JSON.stringify(conditionsData);
    form.querySelector('input[name="startDate"]').value = new Date(startDate.value).toISOString();
    form.querySelector('input[name="endDate"]').value = endDate.value ? new Date(endDate.value).toISOString() : '';
    form.submit();
  }
  return (
    <Page
      backAction={{ url: '/app/discounts' }}
      title={isNew ? 'New discount' : 'Edit discount'}
      primaryAction={{ content: 'Save', onAction: handleSave }}
    >
      <Layout>
        <Layout.Section>
          <form method="post" id="discountForm">
            <input type="hidden" name="isNew" value={isNew}/>
            <input type="hidden" name="buys"/>
            <input type="hidden" name="conditions"/>
            <input type="hidden" name="startDate"/>
            <input type="hidden" name="endDate"/>

            <BlockStack gap="400">
              <Card>
                <BlockStack>
                  <Text variant="headingMd" as="h2">Title</Text>
                  <TextField
                    autoComplete="off"
                    label="Title"
                    name="title"
                    labelHidden
                    helpText="Customers will see this in their cart and at checkout."
                    value={title}
                    onChange={handleTitleChange}
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
                        name="buyType"
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
                  <Text variant="headingMd" as="h2">Purchase rule</Text>
                  <Box>
                    <BlockStack>
                      <RadioButton
                        label="Minimum quantity of items"
                        checked={rule === 'QUANTITY'}
                        id="QUANTITY"
                        name="rule"
                        value="QUANTITY"
                        onChange={handleRuleChange}
                      />
                      <RadioButton
                        label="Minimum purchase amount"
                        id="AMOUNT"
                        value="AMOUNT"
                        name="rule"
                        checked={rule === 'AMOUNT'}
                        onChange={handleRuleChange}
                      />
                    </BlockStack>
                  </Box>

                </BlockStack>
              </Card>
              <Card>
                <BlockStack gap="200">
                  <Text variant="headingMd" as="h2">Conditions</Text>
                  <Box>
                    <BlockStack>
                      <Text as="p">{rule === 'QUANTITY' ? 'Quantity' : 'Amount'}</Text>
                    </BlockStack>
                    <BlockStack gap="400">
                      {conditions.map((condition, idx) => (

                        <Box key={idx}>
                          <Box paddingBlockEnd="300">
                            <InlineGrid columns="2fr auto auto" gap="200">
                              {rule === 'QUANTITY' && (
                                <TextField
                                  autoComplete="off"
                                  type="number"
                                  onChange={(value) => updateConditionValue(idx, value, 'quantity')}
                                  value={condition.quantity}
                                  label="Quantity"
                                  labelHidden
                                />
                              )}
                              {rule === 'AMOUNT' && (
                                <TextField
                                  autoComplete="off"
                                  type="number"
                                  onChange={(value) => updateConditionValue(idx, value, 'amount')}
                                  value={condition.amount}
                                  label="Amount"
                                  labelHidden
                                  prefix={<CurrencySymbol currencyCode={currencyCode}/>}
                                />
                              )}
                              <Button onClick={() => handleSelectGets(idx)}>Customer gets</Button>
                              <Button disabled={idx === 0} icon={DeleteIcon} onClick={() => removeCondition(idx)}/>
                            </InlineGrid>
                          </Box>
                          <SelectedTargets
                            products={condition.products}
                            onRemove={(id) => updateConditionValue(idx, condition.products.filter((p) => p.id !== id), 'products')}
                            onEdit={() => handleSelectGets(idx)}
                            currencyCode={currencyCode}
                          />
                          <Box paddingBlockStart="300">
                            <BlockStack gap="200">
                              <Text variant="headingSm" as="h2">Discount</Text>
                              <BlockStack>
                                <RadioButton
                                  label="Free"
                                  id={`FREE-${idx}`}
                                  value='FREE'
                                  checked={condition.discounted === 'FREE'}
                                  onChange={() => updateConditionValue(idx, 'FREE', 'discounted')}
                                />
                                <RadioButton
                                  label="Percentage"
                                  checked={condition.discounted === 'PERCENTAGE'}
                                  id={`PERCENTAGE-${idx}`}
                                  value="PERCENTAGE"
                                  onChange={() => updateConditionValue(idx, 'PERCENTAGE', 'discounted')}
                                />
                                {condition.discounted === 'PERCENTAGE' && (
                                  <Box paddingInlineStart="600" width="200px">
                                    <TextField
                                      label="Percentage"
                                      labelHidden
                                      value={condition.discountedPercentage}
                                      onChange={(value) => updateConditionValue(idx, value, 'discountedPercentage')}
                                      suffix="%"
                                      autoComplete="off"
                                    />
                                  </Box>
                                )}
                                <RadioButton
                                  label="Amount off each"
                                  id={`EACH_OFF-${idx}`}
                                  value="EACH_OFF"
                                  checked={condition.discounted === 'EACH_OFF'}
                                  onChange={() => updateConditionValue(idx, 'EACH_OFF', 'discounted')}
                                />
                                {condition.discounted === 'EACH_OFF' && (
                                  <Box paddingInlineStart="600" width="200px">
                                    <TextField
                                      label="Each off"
                                      labelHidden
                                      value={condition.discountedEachOff}
                                      onChange={(value) => updateConditionValue(idx, value, 'discountedEachOff')}
                                      prefix={<CurrencySymbol currencyCode={currencyCode}/>}
                                      autoComplete="off"
                                    />
                                  </Box>
                                )}
                              </BlockStack>
                            </BlockStack>
                          </Box>
                        </Box>
                      ))}
                    </BlockStack>
                  </Box>
                  <Divider/>
                  <Box>
                    <Button onClick={addCondition} accessibilityLabel="Add condition" variant="plain" icon={PlusIcon}>Add
                      condition</Button>
                  </Box>
                </BlockStack>
              </Card>

            </BlockStack>
            <Box paddingBlockStart="400">

              <ActiveDatesCard
                startDate={startDate}
                endDate={endDate}
                timezoneAbbreviation="EST"
              />
            </Box>


          </form>
        </Layout.Section>
        <Layout.Section variant="oneThird">
          <Card />
        </Layout.Section>
      </Layout>
      <PageActions
        primaryAction={{
          content: 'Save',
          onAction: handleSave
        }}
        secondaryActions={[
          {
            content: 'Discard',
            onAction: () => {
            }
          },
        ]}
      />
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


