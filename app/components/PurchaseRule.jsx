import {BlockStack, Box, Card, Icon, InlineStack, RadioButton, Text, Tooltip} from "@shopify/polaris";
import {AlertCircleIcon} from "@shopify/polaris-icons";
import {useCallback} from "react";

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
  )
}
