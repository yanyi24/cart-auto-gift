import {
  BlockStack,
  Box,
  Button,
  Card,
  Divider,
  InlineGrid,
  InlineStack,
  RadioButton,
  Text,
  TextField
} from "@shopify/polaris";
import CurrencySymbol from "./CurrencySymbol.jsx";
import { DeleteIcon, PlusIcon } from "@shopify/polaris-icons";
import SelectedTargets from "./SelectedTargets.jsx";
import { useCallback, useState } from "react";
import {DISCOUNTED, removeGidStr, resourcePicker, RULES} from "../utils.js";

export default function PurchaseCondition({ rule, currencyCode, conditionsData, onChange }) {
  const MAXRULE = 3;

  // 创建新的空白条件
  const createBlankCondition = () => ({
    quantity: undefined,
    amount: undefined,
    products: [],
    discounted: DISCOUNTED.free,
    discountedPercentage: "",
    discountedEachOff: "",
  });

  // 初始化条件状态
  const [conditions, setConditions] = useState(conditionsData || [createBlankCondition()]);

  /**
   * 更新条件的通用逻辑，确保更新状态后调用 onChange 通知父组件
   * @param {number} idx - 要更新的条件索引
   * @param {any} newValue - 更新的值
   * @param {string} field - 更新的字段
   */
  const updateConditionValue = useCallback((idx, newValue, field) => {
    const newConditions = conditions.map((condition, i) =>
      i === idx ? { ...condition, [field]: newValue } : condition
    );
    setConditions(newConditions);
    onChange(formatConditions(newConditions));
  }, [conditions, onChange]);

  /**
   * 处理资源选择的逻辑，更新相应条件中的产品列表
   * @param {array} selectionIds - 已选择的产品 ID 列表
   * @param {number} idx - 要更新的条件索引
   */
  const handleResourceSelect = async (selectionIds, idx) => {
    const data = await resourcePicker({ type: "product", selectionIds });
    if (data?.length && idx !== null) {
      updateConditionValue(idx, data, "products");
    }
  };

  /**
   * 删除某个条件
   * @param {number} idx - 要删除的条件索引
   */
  const removeCondition = useCallback((idx) => {
    const newConditions = conditions.filter((_, i) => i !== idx);
    setConditions(newConditions);
    onChange(formatConditions(newConditions));
  }, [conditions, onChange]);

  /**
   * 添加新的空白条件
   */
  const addCondition = () => {
    setConditions((prev) => [...prev, createBlankCondition()]);
  };

  /**
   * 渲染折扣选项（RadioButton）和相应的输入框
   * @param {object} condition - 当前条件对象
   * @param {number} idx - 条件索引
   */
  const renderDiscountOptions = (condition, idx) => (
    <>
      <InlineStack gap="400">
        <RadioButton
          label="Free"
          id={`${DISCOUNTED.free}-${idx}`}
          value={DISCOUNTED.free}
          checked={condition.discounted === DISCOUNTED.free}
          onChange={() => updateConditionValue(idx, DISCOUNTED.free, "discounted")}
        />
        <RadioButton
          label="Percentage"
          id={`${DISCOUNTED.percentage}-${idx}`}
          value={DISCOUNTED.percentage}
          checked={condition.discounted === DISCOUNTED.percentage}
          onChange={() => updateConditionValue(idx, DISCOUNTED.percentage, "discounted")}
        />
        <RadioButton
          label="Fixed amount"
          id={`${DISCOUNTED.fixed_amount}-${idx}`}
          value={DISCOUNTED.fixed_amount}
          checked={condition.discounted === DISCOUNTED.fixed_amount}
          onChange={() => updateConditionValue(idx, DISCOUNTED.fixed_amount, "discounted")}
        />
      </InlineStack>

      {condition.discounted === DISCOUNTED.percentage && (
        <Box width="200px" paddingBlockEnd="200">
          <TextField
            label="Percentage"
            labelHidden
            value={condition.discountedPercentage}
            onChange={(value) => updateConditionValue(idx, value, "discountedPercentage")}
            suffix="%"
            autoComplete="off"
          />
        </Box>
      )}

      {condition.discounted === DISCOUNTED.fixed_amount && (
        <Box width="200px" paddingBlockEnd="200">
          <TextField
            label="Each off"
            labelHidden
            value={condition.discountedEachOff}
            onChange={(value) => updateConditionValue(idx, value, "discountedEachOff")}
            prefix={<CurrencySymbol currencyCode={currencyCode} />}
            autoComplete="off"
          />
        </Box>
      )}
    </>
  );

  return (
    <Card>
      <BlockStack gap="300">
        <Text variant="headingMd" as="h2">Purchase conditions</Text>
        <Box>
          <BlockStack gap="400">
            {conditions.map((condition, idx) => (
              <Box key={idx}>
                <Text variant="headingSm" as="h3">{rule === RULES.amount ? "Amount" : "Quantity"} condition</Text>
                <Box paddingBlockEnd="300" paddingBlockStart="200">
                  <InlineGrid columns={conditions.length > 1 ? "2fr auto auto" : "2fr auto"} gap="200">
                    {(rule === RULES.quantity || rule === RULES.unique) && (
                      <TextField
                        autoComplete="off"
                        type="number"
                        onChange={(value) => updateConditionValue(idx, value, "quantity")}
                        value={condition.quantity}
                        label="Quantity"
                        labelHidden
                      />
                    )}

                    {rule === RULES.amount && (
                      <TextField
                        autoComplete="off"
                        type="number"
                        onChange={(value) => updateConditionValue(idx, value, "amount")}
                        value={condition.amount}
                        label="Amount"
                        labelHidden
                        prefix={<CurrencySymbol currencyCode={currencyCode} />}
                      />
                    )}

                    {/* 选择产品的按钮 */}
                    <Button onClick={() => handleResourceSelect(condition.products, idx)}>Customer gets</Button>
                    {conditions.length > 1 && (<Button icon={DeleteIcon} onClick={() => removeCondition(idx)} />)}
                  </InlineGrid>
                </Box>

                {/* 显示选择的产品 */}
                <SelectedTargets
                  products={condition.products}
                  onRemove={(id) =>
                    updateConditionValue(
                      idx,
                      condition.products.filter((p) => p.id !== id),
                      "products"
                    )
                  }
                  onEdit={() => handleResourceSelect(condition.products, idx)}
                  currencyCode={currencyCode}
                />

                {/* 渲染折扣选项 */}
                <Box paddingBlockStart={condition.products.length ? "200" : "0"} paddingBlockEnd="200">
                  <BlockStack gap="200">
                    <Text variant="headingSm" as="h3">Discount value</Text>
                    <BlockStack gap="200">{renderDiscountOptions(condition, idx)}</BlockStack>
                  </BlockStack>
                </Box>
                <Divider />
              </Box>
            ))}
          </BlockStack>
        </Box>

        {/* 当条件数目小于 MAXRULE 时显示添加按钮 */}
        {conditions.length <= MAXRULE && (
          <Box paddingBlockStart="100">
            <Button onClick={addCondition} accessibilityLabel="Add another condition" icon={PlusIcon}>
              Add another condition
            </Button>
          </Box>
        )}
      </BlockStack>
    </Card>
  );
}

/**
 * 格式化条件列表，将产品数据转换为符合期望的格式
 * @param {array} data - 原始条件数据
 * @returns {array} - 格式化后的条件数据
 */
function formatConditions(data) {
  return JSON.parse(JSON.stringify(data)).map(c => {
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
}
