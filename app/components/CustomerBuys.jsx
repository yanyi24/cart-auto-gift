import { useState, useEffect, useCallback } from "react";
import {BlockStack, Box, Button, InlineGrid, InlineStack, Select, Tag, TextField, Text, Card} from "@shopify/polaris";
import SelectedTargets from "../components/SelectedTargets.jsx";
import {resourcePicker} from "../utils.js";

export default function CustomerBuys({ onChange, initialBuyType = 'ALL_PRODUCTS', initialBuysValue = {}, currencyCode }) {
  const [buyType, setBuyType] = useState(initialBuyType);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [selectedCollections, setSelectedCollections] = useState([]);

  // 更新 buyType 时重置相关数据
  useEffect(() => {

    handleBuysChange();
  }, [buyType]);

  // 处理 buys 变化
  const handleBuysChange = useCallback(() => {
    let value = [];
    if (buyType === 'PRODUCT') {
      value = selectedProducts;
    } else if (buyType === 'COLLECTION') {
      value = selectedCollections;
    } else if (buyType === 'TAG') {
    }

    // 将最终的 type 和 value 传递给父组件
    // onChange({ type: buyType, value });
  }, [buyType, selectedProducts, selectedCollections]);



  // 处理产品和集合的选择
  const handleSelectResource = async (type) => {
    const data = await resourcePicker({ type: type.toLowerCase(), selectionIds: [] });
    if (data?.length) {
      if (buyType === 'PRODUCT') {
        setSelectedProducts(data);
      } else if (buyType === 'COLLECTION') {
        setSelectedCollections(data);
      }
    }
  };

  const buyTypeOptions = [
    { label: 'All products', value: 'ALL_PRODUCTS' },
    { label: 'Specific products', value: 'PRODUCT' },
    { label: 'Specific collections', value: 'COLLECTION' },
    { label: 'Custom product filters', value: 'FILTER' }
  ];

  return (
    <Card>
      <BlockStack gap="200">
        <Text variant="headingMd" as="h2">Customer buys</Text>
        <Box paddingBlockEnd="100">
          <Text as="p">Any items from</Text>
          <InlineGrid columns="2fr auto" gap={(buyType === 'PRODUCT' || buyType === 'COLLECTION') ? "200" : "0"}>
            <Select
              label="Any items from"
              labelHidden
              options={buyTypeOptions}
              onChange={(newValue) => {
                setBuyType(newValue);
                console.log(selectedProducts)
              }}
              value={buyType}
              name="buyType"
            />
            {(buyType === 'PRODUCT' || buyType === 'COLLECTION') && (
              <Button onClick={() => handleSelectResource(buyType)}>Browse</Button>
            )}
          </InlineGrid>
        </Box>

        {buyType === 'FILTER' && (
          <>
            <Box>
              <Text as="p">FILTER</Text>
            </Box>
          </>
        )}

        {buyType === 'PRODUCT' && (
          <SelectedTargets
            products={selectedProducts}
            onRemove={(id) => setSelectedProducts(selectedProducts.filter((p) => p.id !== id))}
            onEdit={() => handleSelectResource('product')}
            currencyCode={currencyCode}
          />
        )}

        {buyType === 'COLLECTION' && (
          <SelectedTargets
            collections={selectedCollections}
            onRemove={(id) => setSelectedCollections(selectedCollections.filter((c) => c.id !== id))}
            currencyCode={currencyCode}
          />
        )}
      </BlockStack>
    </Card>
  );
}

