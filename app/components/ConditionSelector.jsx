import { Box, Button, InlineGrid, OptionList, Popover, TextField } from "@shopify/polaris";
import { ProductFilterConditions, ProductFilterOperators } from "../utils.js";
import CurrencySymbol from "./CurrencySymbol.jsx";
import { useCallback, useState } from "react";
import WeightSymbol from "./WeightSymbol.jsx";
import { PlusIcon } from "@shopify/polaris-icons";

export default function ConditionSelector({
                                            currencyCode,
                                            weightUnit,
                                            shopTags,
                                            shopVendors,
                                            shopTypes,
                                            initialCondition = ['tag'],
                                            initialOperator = ['equal'],
                                            initialValue = '',
                                            onChange
                                          }) {
  const [conditions, setConditions] = useState([
    {
      id: 1,
      condition: initialCondition,
      conditionLabel: 'Tag', // 初始化 conditionLabel
      operator: initialOperator,
      operatorLabel: 'is equal to', // 初始化 operatorLabel
      operatorList: [{ label: 'is equal to', value: 'equal' }], // 初始化 operatorList
      value: initialValue,
      valueList: shopTags, // 初始化为 shopTags，因为默认条件是 'tag'
    },
  ]);

  // 添加一个新的条件选择器
  const addCondition = () => {
    setConditions([
      ...conditions,
      {
        id: conditions.length + 1,
        condition: ['tag'],
        conditionLabel: 'Tag',
        operator: ['equal'],
        operatorLabel: 'is equal to',
        operatorList: [{ label: 'is equal to', value: 'equal' }], // 默认新条件选择器初始化
        value: '',
        valueList: shopTags, // 默认新条件选择器初始化为 'tag'
      },
    ]);
  };

  // 统一处理每个条件选择器的变化，并传递给父组件
  const handleChange = (index, updatedCondition) => {
    const updatedConditions = conditions.map((cond, idx) => {
      if (idx === index) {
        return { ...cond, ...updatedCondition };
      }
      return cond;
    });

    setConditions(updatedConditions);
    onChange(updatedConditions);
  };

  return (
    <>
      {conditions.map((cond, index) => (
        <ConditionItem
          key={cond.id}
          index={index}
          conditionData={cond}
          shopTags={shopTags}
          shopVendors={shopVendors}
          shopTypes={shopTypes}
          currencyCode={currencyCode}
          weightUnit={weightUnit}
          onConditionChange={(updatedCondition) => handleChange(index, updatedCondition)}
        />
      ))}
      <Box paddingBlockStart="200">
        <Button icon={PlusIcon} onClick={addCondition}>
          Add another condition
        </Button>
      </Box>
    </>
  );
}

// 提取一个子组件来渲染每个条件选择器
function ConditionItem({
                         index,
                         conditionData,
                         shopTags,
                         shopVendors,
                         shopTypes,
                         currencyCode,
                         weightUnit,
                         onConditionChange,
                       }) {
  const [conditionPopoverActive, setConditionPopoverActive] = useState(false);
  const [operatorPopoverActive, setOperatorPopoverActive] = useState(false);
  const [valuePopoverActive, setValuePopoverActive] = useState(false);

  const { condition, conditionLabel, operator, operatorLabel, value, operatorList, valueList } = conditionData;

  const createActivator = (expanded, label, toggleActive) => {
    return (
      <Button fullWidth textAlign="left" disclosure={expanded ? 'up' : 'down'} onClick={toggleActive}>
        {label}
      </Button>
    );
  };

  const toggleConditionPopoverActive = useCallback(() => {
    setConditionPopoverActive((active) => !active);
  }, []);

  // 当 condition 改变时，更新 operatorList，并关闭弹窗
  const handleConditionChange = useCallback(
    (v) => {
      const currentCondition = v[0];
      const { label, operators } = ProductFilterConditions.find((item) => item.value === currentCondition);

      // 从条件中获取对应的操作符列表
      const newOperatorList = operators.map((i) => ProductFilterOperators[i]);  // 确保这里正确映射 operators
      const newOperatorLabel = newOperatorList[0].label;
      const newOperatorValue = [newOperatorList[0].value];
      const newValueList = currentCondition === 'tag' ? shopTags : currentCondition === 'vendor' ? shopVendors : shopTypes;

      // 更新整个 condition 选择器的状态，并关闭弹窗
      onConditionChange({
        condition: v,
        conditionLabel: label, // 更新 conditionLabel
        operator: newOperatorValue,
        operatorLabel: newOperatorLabel, // 更新 operatorLabel
        operatorList: newOperatorList, // 更新 operatorList
        valueList: newValueList,
        value: '', // 重置 value，因为 condition 改变
      });
      setConditionPopoverActive(false); // 关闭 condition 弹窗
    },
    [shopTags, shopVendors, shopTypes, onConditionChange]
  );

  const toggleOperatorPopoverActive = useCallback(() => {
    setOperatorPopoverActive((active) => !active);
  }, []);

  const handleOperatorChange = useCallback(
    (v) => {
      const selectedOperator = operatorList.find((i) => i.value === v[0]); // 确保根据选项获取正确 operator
      onConditionChange({
        operator: v,
        operatorLabel: selectedOperator.label, // 更新 operatorLabel
      });
      setOperatorPopoverActive(false); // 关闭 operator 弹窗
    },
    [operatorList, onConditionChange]
  );

  const toggleValuePopoverActive = useCallback(() => {
    setValuePopoverActive((active) => !active);
  }, []);

  const handlePopValueChange = useCallback(
    (v) => {
      onConditionChange({ value: v[0] });
      setValuePopoverActive(false); // 关闭 value 弹窗
    },
    [onConditionChange]
  );

  const handleValueChange = useCallback(
    (newValue) => {
      const changeList = (arr, v) => {
        const newArr = arr.map((o) => Object.assign({}, o));
        return v ? newArr.filter((item) => item.value.toLowerCase().startsWith(v.toLowerCase())) : arr;
      };

      const newValueList = condition[0] === 'tag' ? changeList(shopTags, newValue) : condition[0] === 'vendor' ? changeList(shopVendors, newValue) : changeList(shopTypes, newValue);
      setValuePopoverActive(newValueList.length !== 0);
      onConditionChange({ value: newValue, valueList: newValueList });
    },
    [condition, shopTags, shopTypes, shopVendors, onConditionChange]
  );

  const handleValueFocus = useCallback(() => {
    if ((condition[0] === 'tag' || condition[0] === 'vendor' || condition[0] === 'type') && valueList.length > 0) {
      setValuePopoverActive(true);
    }
  }, [condition, valueList]);

  const valueActivator = (
    <TextField
      label="Condition value"
      size="slim"
      labelHidden
      value={value}
      onChange={handleValueChange}
      autoComplete="off"
      prefix={condition[0] === 'price' && <CurrencySymbol currencyCode={currencyCode} />}
      suffix={condition[0] === 'weight' && <WeightSymbol weightUnit={weightUnit} />}
      onFocus={handleValueFocus} // 在 onFocus 时触发弹框
    />
  );

  return (
    <InlineGrid columns="1fr 1fr 1fr" gap="200">
      <Popover
        active={conditionPopoverActive}
        activator={createActivator(false, conditionLabel, toggleConditionPopoverActive)} // 使用 conditionLabel
        autofocusTarget="first-node"
        preferredPosition="above"
        preferredAlignment="left"
        onClose={toggleConditionPopoverActive}
      >
        <OptionList allowMultiple={false} onChange={handleConditionChange} options={ProductFilterConditions} selected={condition} />
      </Popover>
      <Popover
        active={operatorPopoverActive}
        activator={createActivator(false, operatorLabel, toggleOperatorPopoverActive)} // 使用 operatorLabel
        autofocusTarget="first-node"
        preferredPosition="above"
        preferredAlignment="left"
        onClose={toggleOperatorPopoverActive}
      >
        <OptionList allowMultiple={false} onChange={handleOperatorChange} options={operatorList.map((op) => ({ label: op.label, value: op.value }))} selected={operator} /> {/* 显示正确的 operator 列表 */}
      </Popover>
      <Popover active={valuePopoverActive} activator={valueActivator} preferredPosition="above" preferredAlignment="left" onClose={toggleValuePopoverActive}>
        <OptionList allowMultiple={false} onChange={handlePopValueChange} options={valueList} selected={[value]} />
      </Popover>
    </InlineGrid>
  );
}
