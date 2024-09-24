import { useState, useCallback } from "react";
import {
  BlockStack,
  Box,
  Button,
  InlineGrid,
  InlineStack,
  Select,
  Text,
  Card,
  RadioButton,
} from "@shopify/polaris";
import SelectedTargets from "../components/SelectedTargets.jsx";
import {removeGidStr, resourcePicker} from "../utils.js";
import ConditionSelector from "./ConditionSelector.jsx";

export default function CustomerBuys({
                                       onChange,
                                       buys,
                                       currencyCode,
                                       weightUnit,
                                       shopTags,
                                       shopVendors,
                                       shopTypes,
                                     }) {
  const [buyType, setBuyType] = useState(buys.type);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [selectedCollections, setSelectedCollections] = useState([]);
  const [conditionData, setConditionData] = useState({
    condition: '',
    operator: '',
    value: '',
  });


  // 处理产品和集合的选择逻辑
  const handleSelectResource = async (type) => {
    const data = await resourcePicker({ type: type.toLowerCase(), selectionIds: type === 'product' ? selectedProducts : selectedCollections });
    if (data?.length) {
      buyType === 'PRODUCT' ? setSelectedProducts(data) : setSelectedCollections(data);
      onChange(formatResource(data, buyType));
    }
  };

  const buyTypeOptions = [
    { label: 'All products', value: 'ALL_PRODUCTS' },
    { label: 'Specific products', value: 'PRODUCT' },
    { label: 'Specific collections', value: 'COLLECTION' },
    { label: 'Custom product filters', value: 'FILTER' },
  ];

  const [filterType, setFilterType] = useState('all_conditions');

  const handleFilterTypeChange = useCallback(
    (_, newValue) => {
      setFilterType(newValue);
      onChange(formatResource({filterType: newValue, conditions: conditionData}, 'FILTER'));
    },
    [conditionData, onChange]
  );
  const handleTypeChange = useCallback((newValue) => {
    setBuyType(newValue);
    let value = {};
    switch (newValue) {
      case 'PRODUCT':
        value = selectedProducts;
        break;
        case 'COLLECTION':
          value = selectedCollections;
          break;
        case 'FILTER':
          value = {filterType, conditions: conditionData};
          break;
        default:
          value = {};
    }
    onChange(formatResource(value, newValue));
  }, [conditionData, filterType, onChange, selectedCollections, selectedProducts])
  const handleConditionDataChange = (newData) => {
    setConditionData(newData);
    onChange( formatResource({filterType, conditions: newData}, 'FILTER'));
  };
  const handleRemoveProduct = (id) => {
    const newProducts = selectedProducts.filter((p) => p.id !== id);
    setSelectedProducts(newProducts);
    onChange(formatResource(newProducts, 'PRODUCT'));
  };

  const handleRemoveCollection = (id) => {
    const newCollections = selectedCollections.filter((c) => c.id !== id);
    setSelectedCollections(newCollections);
    onChange(formatResource(newCollections, 'COLLECTION'));
  };

  return (
    <Card>
      <BlockStack gap="200">
        <Text variant="headingMd" as="h2">
          Customer buys
        </Text>
        <Box paddingBlockEnd="100">
          <Text as="p">Any items from</Text>
          <InlineGrid
            columns="2fr auto"
            gap={buyType === 'PRODUCT' || buyType === 'COLLECTION' ? '200' : '0'}
          >
            <Select
              label="Any items from"
              labelHidden
              options={buyTypeOptions}
              onChange={handleTypeChange}
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
            <BlockStack gap="100">
              <Text variant="headingSm" as="h3">
                Conditions
              </Text>
              <Box>
                <InlineStack gap="300" blockAlign="center">
                  <Text as="p">Products must match:</Text>
                  <RadioButton
                    label="all conditions"
                    checked={filterType === 'all_conditions'}
                    id="all_conditions"
                    name="filter_type"
                    onChange={handleFilterTypeChange}
                  />
                  <RadioButton
                    label="any conditions"
                    id="any_conditions"
                    name="filter_type"
                    checked={filterType === 'any_conditions'}
                    onChange={handleFilterTypeChange}
                  />
                </InlineStack>
              </Box>
            </BlockStack>
            <BlockStack gap="200">
              <ConditionSelector
                currencyCode={currencyCode}
                weightUnit={weightUnit}
                shopTags={shopTags}
                shopVendors={shopVendors}
                shopTypes={shopTypes}
                onChange={handleConditionDataChange}
              />
            </BlockStack>
          </>
        )}

        {buyType === 'PRODUCT' && (
          <SelectedTargets
            products={selectedProducts}
            onRemove={handleRemoveProduct}
            onEdit={() => handleSelectResource('product')}
            currencyCode={currencyCode}
          />
        )}

        {buyType === 'COLLECTION' && (
          <SelectedTargets
            collections={selectedCollections}
            onRemove={handleRemoveCollection}
            currencyCode={currencyCode}
          />
        )}
      </BlockStack>
    </Card>
  );
}

function formatResource(resource, type='PRODUCT') {
  const result = {
    type,
    value: resource
  }
  if (type === 'PRODUCT') {
    result.value = JSON.parse(JSON.stringify(resource)).map(p => ({
      productId: removeGidStr(p.id),
      variants: p.variants.map(v => removeGidStr(v.id))
    }));
  } else if (type === 'COLLECTION') {
    result.value = JSON.parse(JSON.stringify(resource)).map(c => removeGidStr(c.id))
  }
  return result;
}
