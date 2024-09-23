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
  const [conditionPopoverActive, setConditionPopoverActive] = useState(false);
  const [condition, setCondition] = useState(initialCondition);
  const [conditionLabel, setConditionLabel] = useState('Tag');

  const [operatorExpanded, setOperatorExpanded] = useState(false);
  const [operatorPopoverActive, setOperatorPopoverActive] = useState(false);
  const [operator, setOperator] = useState(initialOperator);
  const [operatorLabel, setOperatorLabel] = useState('is equal to');
  const [operatorList, setOperatorList] = useState([{ label: 'is equal to', value: 'equal'}]);

  const [valuePopoverActive, setValuePopoverActive] = useState(false);
  const [valuePopover, setValuePopover] = useState([initialValue]);

  const [value, setValue] = useState(initialValue);
  const [valueList, setValueList] = useState(shopTags);


  // 统一处理 onChange
  const handleChange = (condition, operator, value) => {
    if (value) {
      onChange({ condition, operator, value });
    }
  };
  const createActivator = (expanded, label, toggleActive) => {
    return (
      <Button
        fullWidth
        textAlign="left"
        disclosure={expanded ? 'up' : 'down'}
        onClick={toggleActive}
      >
        {label}
      </Button>
    )
  }

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
      setConditionPopoverActive((active) => !active);
      setConditionExpanded(!conditionExpanded)
    },
    [conditionExpanded],
  );
  const handleConditionChange = useCallback((v) => {
    const currentCondition = v[0];
    const {label, operators} = ProductFilterConditions.find(item => item.value === currentCondition);

    setCondition(v);
    setConditionPopoverActive(false);
    setConditionExpanded(false);
    setConditionLabel(label);

    const newOperatorList = operators.map(i => ProductFilterOperators[i]);
    setOperatorList(newOperatorList);
    setOperatorLabel(newOperatorList[0].label);
    setOperator([newOperatorList[0].value]);
    setValueList(currentCondition === 'tag' ? shopTags : currentCondition === 'vendor' ? shopVendors : shopTypes);
    setValue('');

    handleChange(currentCondition, operator[0], value);
  }, [shopTypes, operator, shopTags, shopVendors, value]);

  const toggleOperatorPopoverActive = useCallback(
    () => {
      setOperatorPopoverActive((active) => !active);
      setOperatorExpanded(!operatorExpanded)
    },
    [operatorExpanded],
  );
  const handleOperatorChange = useCallback((v) => {
    setOperator(v);

    const selectedOperator = operatorList.find(i => i.value === v[0]);
    setOperatorLabel(selectedOperator.label);
    setOperatorPopoverActive(false);
    setOperatorExpanded(false);

    handleChange(condition[0], v[0], value);
  }, [condition, operatorList, value]);

  const toggleValuePopoverActive = useCallback(
    () => {
      setValuePopoverActive((active) => !active);
    },
    [operatorExpanded],
  );


  const handlePopValueChange = useCallback((v) => {
    setValue(v[0]);
    setValuePopoverActive(false);
    setValuePopover(v);
    handleChange(condition[0], operator[0], v[0]);
  }, [condition, operator]);

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
    handleChange(condition[0], operator[0], value);
  }, [condition, operator, shopTags, shopTypes, shopVendors, value]);

  const handleValueFocus = useCallback(() => {
    if ((condition[0] === 'tag' || condition[0] === 'vendor' || condition[0] === 'type') && valueList.length > 0){
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
      prefix={condition[0] === 'price' && <CurrencySymbol currencyCode={currencyCode}/>}
      suffix={condition[0] === 'weight' && <WeightSymbol weightUnit={weightUnit}/>}
      onFocus={handleValueFocus}
    />
  );

  return (
    <>
      <Popover
        active={conditionPopoverActive}
        activator={createActivator(conditionExpanded, conditionLabel, toggleConditionPopoverActive)}
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
        activator={createActivator(operatorExpanded, operatorLabel, toggleOperatorPopoverActive)}
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

