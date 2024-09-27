import {BlockStack, Box, Card, Icon, InlineStack, RadioButton, Text, Tooltip} from "@shopify/polaris";
import {AlertCircleIcon} from "@shopify/polaris-icons";
import {useCallback} from "react";
import {RULES} from "../utils.js";

export default function PurchaseRule({rule, onChange}){
  const handleRuleChange = useCallback((_, newValue) => {
    onChange(newValue);
  }, [onChange]);

  return (
    <Card>
      <BlockStack gap="200">
        <Text variant="headingMd" as="h2">Purchase rule</Text>
        <Box>
          <BlockStack>
            <InlineStack gap="100" blockAlign="center">
              <RadioButton
                label="Minimum total quantity"
                checked={rule === RULES.quantity}
                id={RULES.quantity}
                name="rule"
                value={RULES.quantity}
                onChange={handleRuleChange}
              />
              <Tooltip content="Requires the total number of items in the cart to meet or exceed a specified quantity, regardless of item types.">
                <Icon source={AlertCircleIcon} tone="base" />
              </Tooltip>
            </InlineStack>
            <InlineStack gap="100" blockAlign="center">
              <RadioButton
                label="Minimum unique items"
                checked={rule === RULES.unique}
                id={RULES.unique}
                name="rule"
                value={RULES.unique}
                onChange={handleRuleChange}
              />
              <Tooltip content="Requires the number of unique item types in the cart to meet or exceed a specified number, regardless of quantity for each type.">
                <Icon source={AlertCircleIcon} tone="base" />
              </Tooltip>
            </InlineStack>
            <RadioButton
              label="Minimum purchase amount"
              id={RULES.amount}
              value={RULES.amount}
              name="rule"
              checked={rule === RULES.amount}
              onChange={handleRuleChange}
            />
          </BlockStack>
        </Box>
      </BlockStack>
    </Card>
  )
}
