import { BlockStack, Box, Button, Card, Divider, InlineGrid, Layout,  Page, RadioButton, Select, Text, TextField } from "@shopify/polaris";
import {json} from "@remix-run/node";
import {useLoaderData} from "@remix-run/react";
import {useCallback, useState} from "react";
import {DeleteIcon,  PlusIcon} from "@shopify/polaris-icons";
import shopify from "../shopify.server.js";
import CurrencySymbol from "../components/CurrencySymbol.jsx";
import SelectedTargets from "../components/SelectedTargets.jsx";

export  const loader = async ({params, request}) => {
  const { admin } = await shopify.authenticate.admin(request);
  const response = await admin.graphql(`
    query shopInfo {
      shop {
        currencyCode
      }
    }
  `);
  const responseJson = await response.json();
  return json({
    isNew: params.id === 'new',
    currencyCode: responseJson.data.shop.currencyCode,
  })
};

export const action = async ({request}) => {
  // TODO: implement
};

export default function Discount() {
  const {isNew, currencyCode} = useLoaderData();

  const [buyType, setBuyType] = useState('ALL_PRODUCTS');
  const options = [
    {label: 'All products', value: 'ALL_PRODUCTS'},
    {label: 'Specific products', value: 'PRODUCTS'},
    {label: 'Specific collections', value: 'COLLECTIONS'},
  ];
  const handleBuyTypeChange = useCallback((value) => setBuyType(value),[]);

  const [triggerCondition, setTriggerCondition] = useState('QUANTITY');
  const handleConditionChange = useCallback(
    (_, newValue) => setTriggerCondition(newValue),
    [],
  );
  const handleChangeTriggerConditionValue = useCallback(
    (idx, newValue, type) => {
      setConditions((prevConditions) => {
        return prevConditions.map((condition, index) => {
          if (index === idx) {
            return {
              ...condition,
              [type]: newValue,
            };
          }
          return condition;
        });
      });
    },
    []
  );

  const [selectedBuysProducts, setSelectedBuysProducts] = useState([]);
  const [selectedBuysCollections, setSelectedBuysCollections] = useState([]);

  const [conditions, setConditions] = useState([{
    quantity: undefined,
    amount: undefined,
    products: []
  }]);

  function handleDeleteGets(index) {
    setConditions((prevConditions) => {
      return prevConditions.filter((_, i) => i !== index);
    })
  }
  async function handleSelectGets(idx) {
    const selectionIds = conditions[idx].products;
    const data = await resourcePicker({type: 'product', selectionIds});

    if (data?.length) {
      setConditions((prevConditions) => {
        return prevConditions.map((condition, index) => {
          if (index === idx) {
            return {
              ...condition,
              products: data
            };
          }
          return condition;
        });
      });
    }
  }
  async function handleSelectBuys() {
    const isCollection = buyType === 'COLLECTIONS';
    const type = isCollection ? 'collection' : 'product';
    const selectionIds = isCollection ? selectedBuysCollections : selectedBuysProducts;

    const data = await resourcePicker({type, selectionIds})

    if (data?.length) {
      isCollection ? setSelectedBuysCollections(data) : setSelectedBuysProducts(data);
    }
  }

  function addCondition() {
    if (conditions.find(c => c.products.length === 0)) return;
    setConditions((prevConditions) => [...prevConditions, {
      quantity: undefined,
      amount: undefined,
      products: []
    }]);
  }
  function handleRemoveProductBuys(id) {
    setSelectedBuysProducts((prevProducts) =>
      prevProducts.filter((p) => p.id !== id)
    );
  }
  function handleRemoveProductGets(index, id) {
    const newProducts = conditions[index].products.filter((p) => p.id !== id);
    setConditions((prevConditions) => {
      return prevConditions.map((condition, i) => {
        if (i === index) {
          return {
            ...condition,
            products: newProducts
          };
        }
        return condition;
      });
    });
  }
  function handleRemoveCollectionBuys(id) {
    setSelectedBuysCollections((prevCollections) =>
      prevCollections.filter((c) => c.id !== id)
    );
  }


  return (
    <Page
      backAction={{ url: '/app/discounts'}}
      title={isNew ? 'New discount' : 'Edit discount'}
      primaryAction={{
        content: 'Save',
        onAction: () => {},
      }}
    >
      <Layout>
        <Layout.Section>
          <form method="post" id="discountForm">
            <input type="hidden" name="isNew" value={isNew}/>
            <BlockStack gap="400">
              <Card>
                <BlockStack>
                  <Text variant="headingMd" as="h2">Title</Text>
                  <TextField
                    autoComplete="off"
                    label="Title"
                    labelHidden={true}
                    helpText="Customers will see this in their cart and at checkout."
                  />
                </BlockStack>
              </Card>
              <Card>
                <BlockStack gap="200">
                  <Text variant="headingMd" as="h2">Customer buys</Text>
                  <Box>
                    <Text as="p">Any items from</Text>
                    <InlineGrid columns="2fr auto" gap={buyType === 'ALL_PRODUCTS' ? "0" : "200"  }>
                      <Select
                        label="Any items from"
                        labelHidden={true}
                        options={options}
                        onChange={handleBuyTypeChange}
                        value={buyType}
                      />
                      {buyType !== 'ALL_PRODUCTS' && (
                        <Button onClick={handleSelectBuys}>Browse</Button>
                      )}
                    </InlineGrid>
                  </Box>
                  {
                    buyType === 'PRODUCTS' &&
                    <SelectedTargets
                      products={selectedBuysProducts}
                      onRemove={handleRemoveProductBuys}
                      onEdit={handleSelectBuys}
                      currencyCode={currencyCode}
                    />
                  }
                  {
                    buyType === 'COLLECTIONS' &&
                    <SelectedTargets
                      collections={selectedBuysCollections}
                      onRemove={handleRemoveCollectionBuys}
                      currencyCode={currencyCode}
                    />
                  }
                </BlockStack>
              </Card>
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
                        <InlineGrid columns="2fr auto auto" gap="200">
                          {triggerCondition === 'QUANTITY' && (
                            <TextField
                              autoComplete="off"
                              type="number"
                              onChange={(newValue) => {handleChangeTriggerConditionValue(idx,  newValue, 'quantity')}}
                              value={condition['quantity']}
                              label="Quantity"
                              labelHidden={true}
                            />
                          )}
                          {triggerCondition === 'AMOUNT' && (
                            <TextField
                              autoComplete="off"
                              type="number"
                              onChange={(newValue) => {handleChangeTriggerConditionValue(idx, newValue, 'amount')}}
                              value={condition['amount']}
                              label="Amount"
                              labelHidden={true}
                              prefix={<CurrencySymbol currencyCode={currencyCode} />}
                            />
                          )}
                          <Button onClick={() => handleSelectGets(idx)}>Customer gets</Button>
                          <Button icon={DeleteIcon} onClick={() => handleDeleteGets(idx)} />
                        </InlineGrid>
                        <SelectedTargets
                          products={condition['products']}
                          onRemove={(id) => handleRemoveProductGets(idx, id)}
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
          <Card></Card>
        </Layout.Section>
      </Layout>
    </Page>
  )
}


async function resourcePicker({type, selectionIds}) {
  return await window.shopify.resourcePicker({
    type,
    action: 'add',
    multiple: true,
    selectionIds
  });
}
