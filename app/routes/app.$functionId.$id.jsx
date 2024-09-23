import {
  BlockStack,
  Box,
  Button,
  Card,
  Divider, Icon,
  InlineGrid, InlineStack,
  Layout,
  Page,
  RadioButton,
  Text,
  TextField, Tooltip
} from "@shopify/polaris";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import {useCallback, useEffect, useMemo, useState} from "react";
import {AlertCircleIcon, DeleteIcon, PlusIcon} from "@shopify/polaris-icons";
import shopify from "../shopify.server.js";
import CurrencySymbol from "../components/CurrencySymbol.jsx";
import SelectedTargets from "../components/SelectedTargets.jsx";
import {ActiveDatesCard } from "@shopify/discount-app-components";
import {useField} from "@shopify/react-form";
import {removeGidStr} from "../utils.js";
import CustomerBuys from "../components/CustomerBuys.jsx";

let functionId = null, isNew = false;
export const loader = async ({ params, request }) => {
  const { admin } = await shopify.authenticate.admin(request);
  const paramsFunctionId = params.functionId;
  const discountId = params.id;
  isNew = discountId === 'new';

  const response = await admin.graphql(`
    #graphql
    query shopInfo {
      shop {
        weightUnit
        currencyCode
        vendors: productVendors(first:100){
          edges{
            node
          }
        }
        tags: productTags(first: 100) {
          edges {
            node
          }
        }
        types: productTypes(first: 100) {
          edges {
            node
          }
        }
      }
    }
  `);
  const { data } = await response.json();

  if (paramsFunctionId === 'null') {
    const functionsRes = await admin.graphql(`
      #graphql
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
    const functions = await functionsRes.json();
    functionId = functions.data?.shopifyFunctions?.nodes.find(node => (node.apiType === 'product_discounts' && node.app.handle === 'cart-auto-gift'))?.id;
  } else {
    functionId = paramsFunctionId;
  }

  let discountInfo = null;
  if (!isNew) {
    const discountRes = await admin.graphql(`
      #graphql
      query queryDiscountById($id: ID!) {
        discountInfo: discountNode(id: $id) {
          id
          metafield(key: "amount-configuration", namespace: "$app:auto-gift") {
            value
          }
          discount {
            ... on DiscountAutomaticApp {
              endsAt
              asyncUsageCount
              combinesWith {
                orderDiscounts
                productDiscounts
                shippingDiscounts
              }
              startsAt
              status
              title
              updatedAt
            }
          }
        }
      }`, {
      variables: {
        id: `gid://shopify/DiscountAutomaticNode/${discountId}`
      }
    });
    const discount = await discountRes.json();
    discountInfo = discount.data?.discountInfo;
  }
  return json({
    currencyCode: data?.shop?.currencyCode,
    weightUnit: data?.shop?.weightUnit,
    shopVendors: data?.shop?.vendors?.edges?.map(i => {
      return { label: i.node, value: i.node }
    }),
    shopTags: data?.shop?.tags?.edges?.map(i => {
      return { label: i.node, value: i.node }
    }),
    shopTypes: data?.shop?.types?.edges?.map(i => {
      return { label: i.node, value: i.node }
    }),
    discountInfo: discountInfo
  });
};


export const action = async ({ request }) => {
  const { admin } = await shopify.authenticate.admin(request);
  const formData = await request.formData();

  const rule = formData.get('rule');
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
          inCollectionIds: buys.type === 'COLLECTIONS' ? buys.value : [],
          inTags: buys.type === 'TAGS' ? buys.value : [],
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

  const response = await admin.graphql(`
    #graphql
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
  if (errors?.length) {
    return json({
      errors: errors.map((error) => ({
        message: error.message,
        field: error.field,
      })),
    }, { status: 400 });
  } else {
    return json({
      discountId: discount.discountId,
      success: true,
    });
  }
};

export default function Discount() {
  const { currencyCode, weightUnit, shopVendors, shopTags, shopTypes, discountInfo } = useLoaderData();
  const discountMetafield = JSON.parse(discountInfo?.metafield?.value || "{}") ;
  const discountData = discountInfo?.discount || {};

  const [title, setTitle] = useState('');
  const [buyType, setBuyType] = useState('ALL_PRODUCTS');
  const [selectedTags, setSelectedTags] = useState([]);
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


  useEffect(() => {
    if (discountInfo) {
      setTitle(discountData.title || '');
      setBuyType(discountMetafield?.buys?.type || 'ALL_PRODUCTS');

      // 填充选中的产品或集合
      if (discountMetafield?.buys?.type === 'PRODUCTS') {
        setSelectedBuysProducts(discountMetafield.buys.value || []);
      } else if (discountMetafield?.buys?.type === 'COLLECTIONS') {
        setSelectedBuysCollections(discountMetafield.buys.value || []);
      } else if (discountMetafield?.buys?.type === 'TAGS') {
        setSelectedTags(discountMetafield.buys.value || []);
      }

      if (discountMetafield?.rule === 'QUANTITY') {
        discountMetafield.conditions.forEach(condition => condition.amount = undefined);
      } else if (discountMetafield?.rule === 'AMOUNT'){
        discountMetafield.conditions.forEach(condition => condition.quantity = undefined);
      }
      // 填充条件
      setConditions(discountMetafield.conditions || [{
        quantity: undefined,
        amount: undefined,
        products: [],
        discounted: 'FREE',
        discountedPercentage: '',
        discountedEachOff: ''
      }]);

      // 设置开始和结束日期
      if (discountData.startsAt) {
        startDate.onChange(new Date(discountData.startsAt));
      }
      if (discountData.endsAt) {
        endDate.onChange(new Date(discountData.endsAt));
      }

      // 设置规则
      setRule(discountMetafield.rule || 'QUANTITY');
    }
  }, [discountInfo]);


  // Handle state change callbacks
  const handleTitleChange = useCallback((newValue) => setTitle(newValue), []);
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
      buys.value = selectedBuysCollections.map(c => c.id);
    } else if (buyType === 'TAGS') {
      buys.value = selectedTags;
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
  const [buys, setBuys] = useState({ type: 'ALL_PRODUCTS', value: {} });
  const handleBuysChange = (newBuys) => {
    setBuys(newBuys);
  };
  return (
    <Page
      backAction={{ url: '/app/discounts' }}
      title='New discount'
    >
      <Layout>
        <Layout.Section>
          <form
            data-save-bar={true}
            data-discard-confirmation={true}
            method="post"
            onSubmit={handleSave}
            id="discountForm"
          >
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
              <CustomerBuys
                currencyCode={currencyCode}
                weightUnit={weightUnit}
                shopTags={shopTags}
                shopVendors={shopVendors}
                shopTypes={shopTypes}
                onChange={handleBuysChange}
                initialBuyType={buys.type}
                initialBuysValue={buys.value}
              />

              {/* Purchase Conditions Section */}
              <Card>
                <BlockStack gap="200">
                  <Text variant="headingMd" as="h2">Purchase rule</Text>
                  <Box>
                    <BlockStack>
                      <InlineStack gap="100" blockAlign="center">
                        <RadioButton
                          label="Minimum total quantity"
                          checked={rule === 'QUANTITY'}
                          id="QUANTITY"
                          name="rule"
                          value="QUANTITY"
                          onChange={handleRuleChange}
                        />
                        <Tooltip content="Requires the total number of items in the cart to meet or exceed a specified quantity, regardless of item types.">
                          <Icon source={AlertCircleIcon} tone="base" />
                        </Tooltip>
                      </InlineStack>
                      <InlineStack gap="100" blockAlign="center">
                        <RadioButton
                          label="Minimum unique items"
                          checked={rule === 'UNIQUE'}
                          id="UNIQUE"
                          name="rule"
                          value="UNIQUE"
                          onChange={handleRuleChange}
                        />
                        <Tooltip content="Requires the number of unique item types in the cart to meet or exceed a specified number, regardless of quantity for each type.">
                          <Icon source={AlertCircleIcon} tone="base" />
                        </Tooltip>
                      </InlineStack>
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
                      <Text as="p">{rule === 'AMOUNT' ? 'Amount' : 'Quantity'}</Text>
                    </BlockStack>
                    <BlockStack gap="400">
                      {conditions.map((condition, idx) => (

                        <Box key={idx}>
                          <Box paddingBlockEnd="300">
                            <InlineGrid columns="2fr auto auto" gap="200">
                              {(rule === 'QUANTITY' || rule === 'UNIQUE') && (
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
                              <Text variant="headingSm" as="h2">Discount value</Text>
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
                                  label="Fixed amount"
                                  id={`FIXED_AMOUNT-${idx}`}
                                  value="FIXED_AMOUNT"
                                  checked={condition.discounted === 'FIXED_AMOUNT'}
                                  onChange={() => updateConditionValue(idx, 'FIXED_AMOUNT', 'discounted')}
                                />
                                {condition.discounted === 'FIXED_AMOUNT' && (
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
                    <Button onClick={addCondition} accessibilityLabel="Add another condition" variant="plain" icon={PlusIcon}>Add another condition</Button>
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

    </Page>
  );
}

async function resourcePicker({ type, selectionIds }) {
  return await window.shopify.resourcePicker({
    type,
    action: 'add',
    multiple: true,
    selectionIds,
    filter: {
      draft: false
    }
  });
}


