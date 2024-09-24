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
import {removeGidStr, resourcePicker} from "../utils.js";

export default function PurchaseCondition({ rule, currencyCode, conditionsData, onChange }) {
  const MAXRULE = 3;
  const createBlankCondition = () => ({
    quantity: undefined,
    amount: undefined,
    products: [],
    discounted: "FREE",
    discountedPercentage: "",
    discountedEachOff: "",
  });
  // 初始化条件状态
  const [conditions, setConditions] = useState(
    conditionsData || [createBlankCondition()]
  );
  // 更新条件的通用逻辑
  const updateConditionValue = useCallback((idx, newValue, field) => {
    const newConditions = conditions.map((condition, i) => (i === idx ? {...condition, [field]: newValue} : condition))
    setConditions(newConditions);

    onChange(formatConditions(newConditions));
  }, [conditions, onChange]);

  // 处理产品选择的逻辑
  const handleSelectGets = (idx) => handleResourceSelect(conditions[idx].products, idx);

  // 删除某个条件
  const removeCondition = useCallback((idx) => {
    const newConditions = conditions.filter((_, i) => i !== idx)
    setConditions(newConditions);
    onChange(formatConditions(newConditions));
  }, [conditions, onChange]);

  // 添加新的条件
  const addCondition = () => {
    setConditions((prev) => [
      ...prev,
      createBlankCondition()
    ]);
  };

  // 处理资源选择的逻辑
  const handleResourceSelect = async (selectionIds, idx) => {
    const data = await resourcePicker({ type: "product", selectionIds });
    if (data?.length && idx !== null) {
      updateConditionValue(idx, data, "products");
    }
  };

  // 抽取通用的 RadioButton 逻辑
  const renderDiscountOptions = (condition, idx) => (
    <>
      <InlineStack gap="400">
        <RadioButton
          label="Free"
          id={`FREE-${idx}`}
          value="FREE"
          checked={condition.discounted === "FREE"}
          onChange={() => updateConditionValue(idx, "FREE", "discounted")}
        />
        <RadioButton
          label="Percentage"
          id={`PERCENTAGE-${idx}`}
          value="PERCENTAGE"
          checked={condition.discounted === "PERCENTAGE"}
          onChange={() => updateConditionValue(idx, "PERCENTAGE", "discounted")}
        />
        <RadioButton
          label="Fixed amount"
          id={`FIXED_AMOUNT-${idx}`}
          value="FIXED_AMOUNT"
          checked={condition.discounted === "FIXED_AMOUNT"}
          onChange={() => updateConditionValue(idx, "FIXED_AMOUNT", "discounted")}
        />

      </InlineStack>
      {condition.discounted === "PERCENTAGE" && (
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
      {condition.discounted === "FIXED_AMOUNT" && (
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
                <Text variant="headingSm" as="h3" >{rule === "AMOUNT" ? "Amount" : "Quantity"} condition</Text>
                <Box paddingBlockEnd="300" paddingBlockStart="200">
                  <InlineGrid columns={conditions.length > 1 ? "2fr auto auto" : "2fr auto"} gap="200">
                    {(rule === "QUANTITY" || rule === "UNIQUE") && (
                      <TextField
                        autoComplete="off"
                        type="number"
                        onChange={(value) => updateConditionValue(idx, value, "quantity")}
                        value={condition.quantity}
                        label="Quantity"
                        labelHidden
                      />
                    )}

                    {rule === "AMOUNT" && (
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
                    <Button onClick={() => handleSelectGets(idx)}>Customer gets</Button>
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
                  onEdit={() => handleSelectGets(idx)}
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


        {conditions.length <= MAXRULE && (
          <Box paddingBlockStart="100">
            <Button onClick={addCondition} accessibilityLabel="Add another condition"  icon={PlusIcon}>
              Add another condition
            </Button>
          </Box>
        )}
      </BlockStack>
    </Card>
  );
}

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
  })
}
