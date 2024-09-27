import { BlockStack, Box, Card, Layout, Page, Text, TextField } from "@shopify/polaris";
import {json, redirect} from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import {useCallback, useMemo, useState} from "react";
import shopify from "../shopify.server.js";
import {ActiveDatesCard } from "@shopify/discount-app-components";
import {useField} from "@shopify/react-form";
import CustomerBuys from "../components/CustomerBuys.jsx";
import PurchaseRule from "../components/PurchaseRule.jsx";
import PurchaseCondition from "../components/PurchaseCondition.jsx";
import {createDiscount} from "../model/discount.js";
import {BUYS_TYPES, RULES} from "../utils.js";

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
        vendors: productVendors(first:250){
          edges{
            node
          }
        }
        tags: productTags(first: 250) {
          edges {
            node
          }
        }
        types: productTypes(first: 250) {
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
  const { admin, session } = await shopify.authenticate.admin(request);
  const formData = await request.formData();

  const rule = formData.get('rule');
  const buys = JSON.parse(formData.get('buys'));
  const startsAt = formData.get('startDate');
  const endsAt = formData.get('endDate') || null;
  const conditions = JSON.parse(formData.get('conditions'));
  const title = formData.get('title');
  const metafield = JSON.stringify(
    {
      inCollectionIds: buys.type === 'COLLECTIONS' ? buys.value : [],
      tags: buys.type === BUYS_TYPES.filter ? buys.value.conditions.filter(c => c.condition === 'tag').map(c => c.value) : [],
      buys,
      rule,
      conditions
    }
  );
  const metafields = [
    {
      namespace: "$app:auto-gift",
      key: "amount-configuration",
      type: "json",
      value: metafield,
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
    const res = await createDiscount({
      discountId: discount.discountId,
      title: title,
      metafield,
      shop: session.shop,
      startsAt,
      endsAt,
    });
    if (res.success) {
      return redirect("/app/discounts");
    } else {
      return json({ success: false, message: res.message });
    }

  }
};

export default function Discount() {
  const { currencyCode, weightUnit, shopVendors, shopTags, shopTypes, discountInfo } = useLoaderData();

  const [title, setTitle] = useState('');
  const [rule, setRule] = useState(RULES.quantity);
  const [conditions, setConditions] = useState([]);
  const [buys, setBuys] = useState({ type: BUYS_TYPES.products, value: {} });
  const todayDate = useMemo(() => new Date(), []);

  const startDate = useField(todayDate);
  const endDate = useField(null);

  // Handle state change callbacks
  const handleTitleChange = useCallback((newValue) => setTitle(newValue), []);

  async function handleSave(e) {
    e.preventDefault();
    const form = document.getElementById('discountForm');
    form.querySelector('input[name="buys"]').value = JSON.stringify(buys);
    form.querySelector('input[name="conditions"]').value = JSON.stringify(conditions);
    form.querySelector('input[name="startDate"]').value = new Date(startDate.value).toISOString();
    form.querySelector('input[name="endDate"]').value = endDate.value ? new Date(endDate.value).toISOString() : '';
    form.querySelector('input[name="rule"]').value = rule;
    form.submit();
  }
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
                <BlockStack gap="300">
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
                onChange={(newBuys) => setBuys(newBuys)}
                buys={buys}
              />

              {/* Purchase Conditions Section */}
              <PurchaseRule rule={rule} onChange={setRule} />

              <PurchaseCondition
                rule={rule}
                currencyCode={currencyCode}
                onChange={(conditions) => setConditions(conditions)}
              />

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
