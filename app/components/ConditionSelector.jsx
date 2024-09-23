import {Button, OptionList, Popover, TextField} from "@shopify/polaris";
import {ProductFilterConditions, ProductFilterOperators} from "../utils.js";
import CurrencySymbol from "./CurrencySymbol.jsx";
import {useCallback, useEffect, useState} from "react";
import WeightSymbol from "./WeightSymbol.jsx";

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
                                          }){

  const [conditionExpanded, setConditionExpanded] = useState(false);
  const [operatorExpanded, setOperatorExpanded] = useState(false);
  const [conditionPopoverActive, setConditionPopoverActive] = useState(false);
  const [operatorPopoverActive, setOperatorPopoverActive] = useState(false);
  const [valuePopoverActive, setValuePopoverActive] = useState(false);
  const [condition, setCondition] = useState(initialCondition);
  const [conditionLabel, setConditionLabel] = useState('Tag');
  const [operator, setOperator] = useState(initialOperator);
  const [valuePopover, setValuePopover] = useState([initialValue]);
  const [value, setValue] = useState(initialValue);
  const [operatorLabel, setOperatorLabel] = useState('is equal to');
  const [operatorList, setOperatorList] = useState([{ label: 'is equal to', value: 'equal'}]);
  const [valueList, setValueList] = useState(shopTags);

  useEffect(() => {
    const {label, operators} = ProductFilterConditions.find(i => i.value === initialCondition[0]);
    const initialOperatorList = operators.map( i => ProductFilterOperators[i]);
    const initialOperatorData = initialOperatorList.find(i => i.value === initialOperator[0]);

    setConditionLabel(label);
    setOperatorLabel(initialOperatorData.label);
    setOperatorList(initialOperatorList);
  }, []);

  const toggleConditionPopoverActive = useCallback(
    () => {
      setConditionPopoverActive((popoverActive) => !popoverActive);
      setConditionExpanded(!conditionExpanded)
    },
    [conditionExpanded],
  );
  const toggleOperatorPopoverActive = useCallback(
    () => {
      setOperatorPopoverActive((popoverActive) => !popoverActive);
      setOperatorExpanded(!operatorExpanded)
    },
    [operatorExpanded],
  );
  const toggleValuePopoverActive = useCallback(
    () => {
      setValuePopoverActive((popoverActive) => !popoverActive);
    },
    [operatorExpanded],
  );

  const handleConditionChange = useCallback((v) => {
    setCondition(v);
    setConditionPopoverActive(false);
    setConditionExpanded(false);

    const {label, operators} = ProductFilterConditions.find(item => item.value === v[0]);
    setConditionLabel(label);
    const newOperatorList = operators.map(i => ProductFilterOperators[i]);
    setOperatorList(newOperatorList);
    setOperatorLabel(newOperatorList[0].label);
    setOperator([newOperatorList[0].value]);
    switch (v[0]) {
      case 'tag':
        setValueList(shopTags);
        break;
      case 'vendor':
        setValueList(shopVendors);
        break;
      case 'type':
        setValueList(shopTypes);
        break;
      default:
        setValueList([]);
    }
    setValue('');

    value && onChange({ condition: v[0], operator: operator[0], value });
  }, [shopTypes, onChange, operator, shopTags, shopVendors, value]);

  const handleOperatorChange = useCallback((v) => {
    setOperator(v);
    const selectedOperator = operatorList.find(i => i.value === v[0]);
    setOperatorLabel(selectedOperator.label);
    setOperatorPopoverActive(false);
    setOperatorExpanded(false);

    value && onChange({ condition: condition[0], operator: v[0], value });
  }, [condition, onChange, operatorList, value]);
  const handlePopValueChange = useCallback((v) => {
    setValue(v[0]);
    setValuePopoverActive(false);
    setValuePopover(v);
    onChange({ condition: condition[0], operator: operator[0], value: v[0] });
  }, [condition, onChange, operator]);

  const handleValueChange = useCallback((newValue) => {
    setValue(newValue);
    if (!newValue) {
      setValuePopover(['yan_none']);
    }
    const changeList = (arr, v) => {
      const newArr = arr.map(o => Object.assign({}, o));
      let result = [];
      if (v) {
        result = newArr.filter((item) => item.value.toLowerCase().startsWith(v.toLowerCase()) )
      } else {
        result = arr;
      }
      return result;
    }

    let newValueList = [];
    switch (condition[0]) {
      case 'tag':
        newValueList = changeList(shopTags, newValue);
        break;
      case 'vendor':
        newValueList = changeList(shopVendors, newValue);
        break;
      case 'type':
        newValueList = changeList(shopTypes, newValue);
    }
    setValuePopoverActive(newValueList.length !== 0);
    setValueList(newValueList);
    onChange({ condition: condition[0], operator: operator[0], value });
  }, [condition, onChange, operator, shopTags, shopTypes, shopVendors, value]);

  const handleValueFocus = useCallback(() => {
    if ((condition[0] === 'tag' || condition[0] === 'vendor' || condition[0] === 'type') && valueList.length > 0){
      setValuePopoverActive(true);
    }
  }, [condition, valueList]);

  const conditionActivator = (
    <Button
      fullWidth
      textAlign="left"
      disclosure={conditionExpanded ? 'up' : 'down'}
      onClick={toggleConditionPopoverActive}
    >
      {conditionLabel}
    </Button>
  );
  const operatorActivator = (
    <Button
      fullWidth
      textAlign="left"
      disclosure={operatorExpanded ? 'up' : 'down'}
      onClick={toggleOperatorPopoverActive}
    >
      {operatorLabel}
    </Button>
  );
  const valueActivator = (
    <TextField
      label="Condition value"
      size="slim"
      labelHidden
      value={value}
      onChange={handleValueChange}
      autoComplete="off"
      prefix={condition[0] === 'price' && <CurrencySymbol currencyCode={currencyCode}/>}
      suffix={condition[0] === 'weight' && <WeightSymbol weightUnit={weightUnit}/>}
      onFocus={handleValueFocus}
    />
  );

  return (
    <>
      <Popover
        active={conditionPopoverActive}
        activator={conditionActivator}
        autofocusTarget="first-node"
        preferredPosition="above"
        preferredAlignment="left"
        onClose={toggleConditionPopoverActive}
      >
        <OptionList
          allowMultiple={false}
          onChange={handleConditionChange}
          options={ProductFilterConditions}
          selected={condition}
        />
      </Popover>
      <Popover
        active={operatorPopoverActive}
        activator={operatorActivator}
        autofocusTarget="first-node"
        preferredPosition="above"
        preferredAlignment="left"
        onClose={toggleOperatorPopoverActive}
      >
        <OptionList
          allowMultiple={false}
          onChange={handleOperatorChange}
          options={operatorList}
          selected={operator}
        />
      </Popover>
      <Popover
        active={valuePopoverActive}
        activator={valueActivator}
        preferredPosition="above"
        preferredAlignment="left"
        onClose={toggleValuePopoverActive}
      >
        <OptionList
          allowMultiple={false}
          onChange={handlePopValueChange}
          options={valueList}
          selected={valuePopover}
        />
      </Popover>
    </>
  )
}
