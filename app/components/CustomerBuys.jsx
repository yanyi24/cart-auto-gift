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
import { removeGidStr, resourcePicker } from "../utils.js";
import ConditionSelector from "./ConditionSelector.jsx";

export default function CustomerBuys({
                                       onChange,        // 父组件传入的回调函数，用于传递变化后的数据
                                       buys,            // 传入的初始购买类型
                                       currencyCode,    // 币种代码
                                       weightUnit,      // 重量单位
                                       shopTags,        // 店铺的标签列表
                                       shopVendors,     // 店铺的供应商列表
                                       shopTypes,       // 店铺的产品类型列表
                                     }) {
  const [buyType, setBuyType] = useState(buys.type);   // 当前购买类型的状态
  const [selectedProducts, setSelectedProducts] = useState([]);  // 选择的产品
  const [selectedCollections, setSelectedCollections] = useState([]);  // 选择的集合
  const [conditionData, setConditionData] = useState({  // 条件选择器的数据
    condition: '',
    operator: '',
    value: '',
  });
  const [filterType, setFilterType] = useState('all_conditions');  // 筛选器的类型

  /**
   * 通用的资源选择处理逻辑
   * 根据选择的类型调用 `resourcePicker` 并更新相应的状态（产品或集合）
   * @param {string} type - 要选择的资源类型 ('PRODUCT' 或 'COLLECTION')
   */
  const handleSelectResource = async (type) => {
    const isProductType = type === 'PRODUCT';
    const selectedItems = isProductType ? selectedProducts : selectedCollections;  // 根据类型选择合适的状态
    const data = await resourcePicker({ type: type.toLowerCase(), selectionIds: selectedItems });  // 调用资源选择器

    if (data?.length) {
      // 更新状态并调用 onChange 传递格式化的数据
      if (isProductType) {
        setSelectedProducts(data);
      } else {
        setSelectedCollections(data);
      }
      onChange(formatResource(data, type));
    }
  };

  /**
   * 处理购买类型的切换逻辑
   * 根据选择的不同类型更新相关的数据，并通过 onChange 通知父组件
   * @param {string} newValue - 新的购买类型 ('ALL_PRODUCTS', 'PRODUCT', 'COLLECTION', 'FILTER')
   */
  const handleTypeChange = useCallback((newValue) => {
    setBuyType(newValue);
    let value = {};  // 用于传递给父组件的值

    // 根据不同的购买类型设置相应的值
    switch (newValue) {
      case 'PRODUCT':
        value = selectedProducts;
        break;
      case 'COLLECTION':
        value = selectedCollections;
        break;
      case 'FILTER':
        value = { filterType, conditions: conditionData };
        break;
      default:
        value = {};
    }

    // 调用 onChange 将格式化后的数据传递给父组件
    onChange(formatResource(value, newValue));
  }, [conditionData, filterType, onChange, selectedCollections, selectedProducts]);

  /**
   * 处理筛选器类型的切换
   * 当用户在条件筛选器中切换条件类型时调用
   * @param {string} newValue - 筛选器的新类型 ('all_conditions' 或 'any_conditions')
   */
  const handleFilterTypeChange = useCallback((_, newValue) => {
    setFilterType(newValue);
    // 更新筛选条件，并调用 onChange 通知父组件
    onChange(formatResource({ filterType: newValue, conditions: conditionData }, 'FILTER'));
  }, [conditionData, onChange]);

  /**
   * 处理条件选择器的数据变化
   * 当条件选择器内的数据发生变化时调用
   * @param {object} newData - 新的条件数据
   */
  const handleConditionDataChange = useCallback((newData) => {
    setConditionData(newData);
    // 更新条件筛选，并调用 onChange 通知父组件
    onChange(formatResource({ filterType, conditions: newData }, 'FILTER'));
  }, [filterType, onChange]);

  /**
   * 通用的删除项目处理函数
   * 处理产品或集合的删除逻辑
   * @param {array} items - 当前选择的产品或集合数组
   * @param {function} setItems - 用于更新相应状态的函数
   * @param {string} id - 要删除的项目的 ID
   * @param {string} type - 类型 ('PRODUCT' 或 'COLLECTION')
   */
  const handleRemoveItem = (items, setItems, id, type) => {
    const updatedItems = items.filter((item) => item.id !== id);  // 过滤掉要删除的项目
    setItems(updatedItems);
    onChange(formatResource(updatedItems, type));  // 更新后调用 onChange 通知父组件
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
            {/* 购买类型选择器 */}
            <Select
              label="Any items from"
              labelHidden
              options={[
                { label: 'All products', value: 'ALL_PRODUCTS' },
                { label: 'Specific products', value: 'PRODUCT' },
                { label: 'Specific collections', value: 'COLLECTION' },
                { label: 'Custom product filters', value: 'FILTER' },
              ]}
              onChange={handleTypeChange}  // 处理购买类型切换
              value={buyType}
              name="buyType"
            />
            {(buyType === 'PRODUCT' || buyType === 'COLLECTION') && (
              // 产品或集合选择按钮
              <Button onClick={() => handleSelectResource(buyType)}>Browse</Button>
            )}
          </InlineGrid>
        </Box>

        {/* 条件筛选器部分 */}
        {buyType === 'FILTER' && (
          <>
            <BlockStack gap="100">
              <Text variant="headingSm" as="h3">
                Conditions
              </Text>
              <Box>
                <InlineStack gap="300" blockAlign="center">
                  <Text as="p">Products must match:</Text>
                  {/* 筛选条件选择器 */}
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
                onChange={handleConditionDataChange}  // 处理条件选择器的变化
              />
            </BlockStack>
          </>
        )}

        {/* 选择的产品部分 */}
        {buyType === 'PRODUCT' && (
          <SelectedTargets
            products={selectedProducts}
            onRemove={(id) => handleRemoveItem(selectedProducts, setSelectedProducts, id, 'PRODUCT')}
            onEdit={() => handleSelectResource('PRODUCT')}  // 编辑产品
            currencyCode={currencyCode}
          />
        )}

        {/* 选择的集合部分 */}
        {buyType === 'COLLECTION' && (
          <SelectedTargets
            collections={selectedCollections}
            onRemove={(id) => handleRemoveItem(selectedCollections, setSelectedCollections, id, 'COLLECTION')}
            currencyCode={currencyCode}
          />
        )}
      </BlockStack>
    </Card>
  );
}

/**
 * 格式化资源数据
 * 根据不同类型格式化产品或集合的数据结构
 * @param {array|object} resource - 当前选择的资源
 * @param {string} type - 资源类型 ('PRODUCT', 'COLLECTION', 'FILTER')
 * @returns {object} - 格式化后的数据
 */
function formatResource(resource, type = 'PRODUCT') {
  const result = {
    type,
    value: resource,
  };

  if (type === 'PRODUCT') {
    // 格式化产品数据，提取产品 ID 和变体 ID
    result.value = resource.map((p) => ({
      productId: removeGidStr(p.id),
      variants: p.variants.map((v) => removeGidStr(v.id)),
    }));
  } else if (type === 'COLLECTION') {
    // 格式化集合数据，提取集合 ID
    result.value = resource.map((c) => removeGidStr(c.id));
  }

  return result;
}
