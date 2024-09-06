import {
  BlockStack, Box,
  Button,
  Card, Divider,
  InlineGrid, InlineStack,
  Layout,
  Page, RadioButton,
  Select,
  Text,
  TextField, Thumbnail
} from "@shopify/polaris";
import {json} from "@remix-run/node";
import {useLoaderData} from "@remix-run/react";
import {useCallback, useState} from "react";
import {ImageIcon, XSmallIcon} from "@shopify/polaris-icons";
import {useI18n} from "@shopify/react-i18n";
import shopify from "../shopify.server.js";
import * as PropTypes from "prop-types";
import CurrencySymbol from "../components/CurrencySymbol.jsx";

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
  const [i18n] = useI18n();

  const [buyType, setBuyType] = useState('ALL_PRODUCTS');
  const options = [
    {label: 'All products', value: 'ALL_PRODUCTS'},
    {label: 'Specific products', value: 'PRODUCTS'},
    {label: 'Specific collections', value: 'COLLECTIONS'},
  ];
  const handleBuyTypeChange = useCallback((value) => setBuyType(value),[]);

  const [triggerCondition, setTriggerCondition] = useState('QUANTITY');
  const [triggerConditionValue, setTriggerConditionValue] = useState();
  const handleConditionChange = useCallback(
    (_, newValue) => setTriggerCondition(newValue),
    [],
  );
  const handleChangeTriggerConditionValue = useCallback(
    (newValue) => setTriggerConditionValue(newValue),
    [],
  );

  const [selectedBuysProducts, setSelectedBuysProducts] = useState([]);
  const [selectedBuysCollections, setSelectedBuysCollections] = useState([]);

  async function handleSelectBuys() {
    const isCollection = buyType === 'COLLECTIONS';
    const type = isCollection ? 'collection' : 'product';
    let selectionIds = [];

    if (isCollection) {
      selectionIds = selectedBuysCollections && selectedBuysCollections.map(c => ({id: c.id}));
    } else {
      if (selectedBuysProducts) {
        selectionIds = selectedBuysProducts.map(p => {
          if (p.hasOnlyDefaultVariant || p.totalVariants === p.variants.length){
            return {id: p.id};
          } else {
            const variants = p.variants.map(v => ({id: v.id}));
            return {
              id: p.id,
              variants
            };
          }
        })
      }
    }

    const data = await window.shopify.resourcePicker({
      type,
      action: 'add',
      multiple: true,
      selectionIds
    });

    if (data.length) {
      isCollection ? setSelectedBuysCollections(data) : setSelectedBuysProducts(data);
    }
  }

  const SelectedTargets = ({products, collections}) => {
    const ProductItem = ({product, isLast}) => {
      const {totalVariants, variants, title, hasOnlyDefaultVariant, images, id} = product;
      const tips = hasOnlyDefaultVariant ?
        i18n.formatCurrency(variants[0].price, {currency: currencyCode}) :
        `(${variants.length} of ${totalVariants} variants selected)`;
      const img = images?.[0]?.originalSrc || ImageIcon;
      const alt = images?.[0]?.altText || title;

      const handleRemoveProduct = () => {
        setSelectedBuysProducts((prevProducts) =>
          prevProducts.filter((p) => p.id !== id)
        );
      };

      return (
        <Box borderBlockEndWidth={isLast ? '0' : '025'} padding="300" borderColor="border-brand">
          <InlineStack blockAlign="center" align="space-between">
            <InlineStack gap="300">
              <Thumbnail source={img} alt={alt} />
              <Box>
                <Text as="p">{title}</Text>
                <Text as="p">{tips}</Text>
              </Box>
            </InlineStack>
            <InlineStack gap="400">
              {!hasOnlyDefaultVariant && <Button variant="plain" onClick={handleSelectBuys}>Edit</Button>}
              <Button variant="plain" icon={XSmallIcon} onClick={handleRemoveProduct} />
            </InlineStack>
          </InlineStack>
        </Box>
      );
    }
    const CollectionItem = ({collection, isLast}) => {
      const {productsCount, title, image, id} = collection;
      const tips = productsCount > 1 ? `${productsCount} products` : `${productsCount} product`;
      const img = image?.originalSrc || ImageIcon;

      const handleRemoveCollection = () => {
        setSelectedBuysCollections((prevCollections) =>
          prevCollections.filter((c) => c.id !== id)
        );
      };

      return (
        <Box borderBlockEndWidth={isLast ? '0' : '025'} padding="300" borderColor="border-brand">
          <InlineStack blockAlign="center" align="space-between">
            <InlineStack gap="300">
              <Thumbnail source={img} alt={title} />
              <Box>
                <Text as="p">{title}</Text>
                <Text as="p">{tips}</Text>
              </Box>
            </InlineStack>
            <InlineStack gap="400">
              <Button variant="plain" icon={XSmallIcon} onClick={handleRemoveCollection} />
            </InlineStack>
          </InlineStack>
        </Box>
      )
    }

    return (
      <>
        {
          products && (
            <Box borderWidth={products.length ? '025' : '0'} borderRadius="200" borderColor="border-brand">
              {products.map((product, idx) => (
                <ProductItem
                  key={product.id}
                  product={product}
                  isLast={idx === products.length - 1}
                />
              ))}
            </Box>
          )
        }
        {
          collections && (
            <Box borderWidth={collections.length ? '025' : '0'} borderRadius="200" borderColor="border-brand">
              {collections.map((collection, idx) => (
                <CollectionItem
                  key={collection.id}
                  collection={collection}
                  isLast={idx === collections.length - 1}
                />
              ))}
            </Box>
          )
        }
      </>
    )
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
                  {buyType === 'PRODUCTS' && <SelectedTargets products={selectedBuysProducts}/>}
                  {buyType === 'COLLECTIONS' && <SelectedTargets collections={selectedBuysCollections}/>}
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
                        id="PURCHASE"
                        name="trigger_condition"
                        checked={triggerCondition === 'PURCHASE'}
                        onChange={handleConditionChange}
                      />
                    </BlockStack>
                    <Divider />
                    <InlineGrid columns="1fr 2fr" gap="200">
                      <TextField
                        autoComplete="off"
                        type="number"
                        onChange={handleChangeTriggerConditionValue}
                        value={triggerConditionValue}
                        label={triggerCondition === 'QUANTITY' ? 'Quantity' : 'Amount'}
                        prefix={triggerCondition === 'QUANTITY' ? '' : <CurrencySymbol currencyCode={currencyCode} />}
                      />
                    </InlineGrid>
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
