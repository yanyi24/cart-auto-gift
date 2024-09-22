import {Button, OptionList, Popover, TextField} from "@shopify/polaris";
import {ProductFilterConditions, ProductFilterOperators} from "../utils.js";
import CurrencySymbol from "./CurrencySymbol.jsx";
import {useCallback, useEffect, useState} from "react";

export default function ConditionSelector({
                                            initialCondition = ['tag'],
                                            initialOperator = ['equal'],
                                            initialValue = '',
                                            currencyCode,
                                            onChange
                                          }){

  const [conditionExpanded, setConditionExpanded] = useState(false);
  const [operatorExpanded, setOperatorExpanded] = useState(false);
  const [conditionPopoverActive, setConditionPopoverActive] = useState(false);
  const [operatorPopoverActive, setOperatorPopoverActive] = useState(false);
  const [condition, setCondition] = useState(initialCondition);
  const [conditionLabel, setConditionLabel] = useState('Tag');
  const [operator, setOperator] = useState(initialOperator);
  const [operatorLabel, setOperatorLabel] = useState('is equal to');
  const [value, setValue] = useState(initialValue);
  const [operatorList, setOperatorList] = useState([{ label: 'is equal to', value: 'equal'}]);

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

    value && onChange({ condition: v[0], operator: operator[0], value });
  }, [onChange, operator, value]);

  const handleOperatorChange = useCallback((v) => {
    setOperator(v);
    const selectedOperator = operatorList.find(i => i.value === v[0]);
    setOperatorLabel(selectedOperator.label);
    setOperatorPopoverActive(false);
    setOperatorExpanded(false);

    value && onChange({ condition: condition[0], operator: v[0], value });
  }, [condition, onChange, operatorList, value]);

  const handleValueChange = useCallback((newValue) => {
    setValue(newValue);

    onChange({ condition: condition[0], operator: operator[0], value });
  }, [condition, onChange, operator, value]);

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
      <TextField
        label="Condition value"
        labelHidden
        value={value}
        onChange={handleValueChange}
        autoComplete="off"
        prefix={condition[0] === 'price' && <CurrencySymbol currencyCode={currencyCode}/>}
      />
    </>
  )
}
