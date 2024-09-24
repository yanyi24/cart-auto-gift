import { Box, Button, InlineGrid, OptionList, Popover, TextField } from "@shopify/polaris";
import { ProductFilterConditions, ProductFilterOperators } from "../utils.js";
import CurrencySymbol from "./CurrencySymbol.jsx";
import { useCallback, useState } from "react";
import WeightSymbol from "./WeightSymbol.jsx";
import { DeleteIcon, PlusIcon } from "@shopify/polaris-icons";

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
    createConditionObject(1, shopTags),
  ]);

  // 添加一个新的条件选择器
  const addCondition = () => {
    setConditions([
      ...conditions,
      createConditionObject(conditions.length + 1, shopTags),
    ]);
  };

  // 删除条件选择器
  const deleteCondition = (index) => {
    const updatedConditions = conditions.filter((_, idx) => idx !== index);
    updateConditions(updatedConditions);
  };

  // 统一处理条件和传递给父组件
  const handleChange = (index, updatedCondition) => {
    const updatedConditions = conditions.map((cond, idx) =>
      idx === index ? { ...cond, ...updatedCondition } : cond
    );
    updateConditions(updatedConditions);
  };

  // 更新状态并调用onChange
  const updateConditions = (updatedConditions) => {
    setConditions(updatedConditions);
    onChange(updatedConditions.map(cond => ({
      condition: cond.condition[0],
      operator: cond.operator[0],
      value: cond.value,
    })));
  };

  return (
    <>
      {conditions.map((cond, index) => (
        <ConditionItem
          key={cond.id}
          index={index}
          conditionData={cond}
          countOfConditions={conditions.length}
          shopTags={shopTags}
          shopVendors={shopVendors}
          shopTypes={shopTypes}
          currencyCode={currencyCode}
          weightUnit={weightUnit}
          onConditionChange={(updatedCondition) => handleChange(index, updatedCondition)}
          onDelete={() => deleteCondition(index)}
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

// 函数声明方式的 createConditionObject
function createConditionObject(id, tags) {
  return {
    id,
    condition: ['tag'],
    conditionLabel: 'Tag',
    operator: ['equal'],
    operatorLabel: 'is equal to',
    operatorList: [{ label: 'is equal to', value: 'equal' }],
    value: '',
    valueList: tags,
  };
}

// 提取的子组件来渲染每个条件选择器
function ConditionItem({
                         index,
                         conditionData,
                         countOfConditions,
                         shopTags,
                         shopVendors,
                         shopTypes,
                         currencyCode,
                         weightUnit,
                         onConditionChange,
                         onDelete
                       }) {
  const [conditionPopoverActive, setConditionPopoverActive] = useState(false);
  const [operatorPopoverActive, setOperatorPopoverActive] = useState(false);
  const [valuePopoverActive, setValuePopoverActive] = useState(false);

  const { condition, conditionLabel, operator, operatorLabel, value, operatorList, valueList } = conditionData;

  const createActivator = useCallback((label, toggleActive) => (
    <Button fullWidth textAlign="left" disclosure="down" onClick={toggleActive}>
      {label}
    </Button>
  ), []);

  const togglePopover = (setter) => () => setter((active) => !active);

  const handleConditionChange = useCallback(
    (v) => {
      const currentCondition = v[0];
      const { label, operators } = ProductFilterConditions.find((item) => item.value === currentCondition);
      const newOperatorList = operators.map((i) => ProductFilterOperators[i]);
      const newValueList = getValueListByCondition(currentCondition, shopTags, shopVendors, shopTypes);

      onConditionChange({
        condition: v,
        conditionLabel: label,
        operator: [newOperatorList[0].value],
        operatorLabel: newOperatorList[0].label,
        operatorList: newOperatorList,
        valueList: newValueList,
        value: '',
      });
      setConditionPopoverActive(false);
    },
    [shopTags, shopVendors, shopTypes, onConditionChange]
  );

  const handleOperatorChange = useCallback(
    (v) => {
      const selectedOperator = operatorList.find((i) => i.value === v[0]);
      onConditionChange({
        operator: v,
        operatorLabel: selectedOperator.label,
      });
      setOperatorPopoverActive(false);
    },
    [operatorList, onConditionChange]
  );

  const handlePopValueChange = useCallback(
    (v) => {
      onConditionChange({ value: v[0] });
      setValuePopoverActive(false);
    },
    [onConditionChange]
  );

  const handleValueChange = useCallback(
    (newValue) => {
      const newValueList = getValueListByCondition(condition[0], shopTags, shopVendors, shopTypes, newValue);
      setValuePopoverActive(newValueList.length > 0);
      onConditionChange({ value: newValue, valueList: newValueList });
    },
    [condition, shopTags, shopVendors, shopTypes, onConditionChange]
  );

  const handleValueFocus = useCallback(() => {
    if (valueList.length > 0) setValuePopoverActive(true);
  }, [valueList]);

  return (
    <InlineGrid columns={countOfConditions > 1 ? "1fr 1fr 1fr auto" : "1fr 1fr 1fr"} gap="200">
      <Popover
        active={conditionPopoverActive}
        activator={createActivator(conditionLabel, togglePopover(setConditionPopoverActive))}
        autofocusTarget="first-node"
        preferredPosition="above"
        preferredAlignment="left"
        onClose={togglePopover(setConditionPopoverActive)}
      >
        <OptionList allowMultiple={false} onChange={handleConditionChange} options={ProductFilterConditions} selected={condition} />
      </Popover>

      <Popover
        active={operatorPopoverActive}
        activator={createActivator(operatorLabel, togglePopover(setOperatorPopoverActive))}
        autofocusTarget="first-node"
        preferredPosition="above"
        preferredAlignment="left"
        onClose={togglePopover(setOperatorPopoverActive)}
      >
        <OptionList allowMultiple={false} onChange={handleOperatorChange} options={operatorList.map(op => ({ label: op.label, value: op.value }))} selected={operator} />
      </Popover>

      <Popover
        active={valuePopoverActive}
        activator={<TextField labelHidden value={value} onChange={handleValueChange} autoComplete="off" prefix={condition[0] === 'price' && <CurrencySymbol currencyCode={currencyCode} />} suffix={condition[0] === 'weight' && <WeightSymbol weightUnit={weightUnit} />} onFocus={handleValueFocus} />}
        preferredPosition="above"
        preferredAlignment="left"
        onClose={togglePopover(setValuePopoverActive)}
      >
        <OptionList allowMultiple={false} onChange={handlePopValueChange} options={valueList} selected={[value]} />
      </Popover>

      {countOfConditions > 1 && (
        <Button icon={DeleteIcon} onClick={onDelete} accessibilityLabel="Delete condition" />
      )}
    </InlineGrid>
  );
}

// 根据当前 condition 返回相应的值列表
function getValueListByCondition(condition, shopTags, shopVendors, shopTypes, searchValue = '') {
  const valueLists = {
    tag: shopTags,
    vendor: shopVendors,
    type: shopTypes,
  };
  const list = valueLists[condition] || [];
  return searchValue ? list.filter(item => item.value.toLowerCase().startsWith(searchValue.toLowerCase())) : list;
}
