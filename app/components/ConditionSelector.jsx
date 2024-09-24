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
                                            initialConditions,
                                            onChange
                                          }) {
  // 初始状态，先判断是否有传入条件，否则创建一个默认的条件选择器
  const [conditions, setConditions] = useState(initialConditions ? initialConditions : [
    createConditionObject(1, shopTags),
  ]);

  /**
   * 创建新的条件选择器对象
   * @param {number} id - 条件的唯一标识符
   * @param {array} tags - 用于初始化的标签列表
   * @returns {object} - 返回新建的条件选择器对象
   */
  function createConditionObject(id, tags) {
    return {
      id,
      condition: ['tag'],  // 默认条件类型为 'tag'
      conditionLabel: 'Tag',  // 对应的条件标签
      operator: ['equal'],  // 默认操作符为 'equal'
      operatorLabel: 'is equal to',  // 操作符的标签
      operatorList: [{ label: 'is equal to', value: 'equal' }],  // 操作符列表
      value: '',  // 初始值为空
      valueList: tags,  // 默认使用 tags 作为值列表
    };
  }

  /**
   * 添加一个新的条件选择器
   */
  const addCondition = () => {
    setConditions([
      ...conditions,
      createConditionObject(conditions.length + 1, shopTags),
    ]);
  };

  /**
   * 更新条件的状态并调用 onChange 回调传递给父组件
   * @param {array} updatedConditions - 更新后的条件数组
   */
  const updateConditions = (updatedConditions) => {
    setConditions(updatedConditions);
    onChange(updatedConditions.map(cond => ({
      condition: cond.condition[0],
      operator: cond.operator[0],
      value: cond.value,
    })));
  };

  /**
   * 删除指定索引的条件选择器
   * @param {number} index - 要删除的条件的索引
   */
  const deleteCondition = (index) => {
    const updatedConditions = conditions.filter((_, idx) => idx !== index);
    updateConditions(updatedConditions);
  };

  /**
   * 统一处理每个条件选择器的变化
   * @param {number} index - 要更新的条件的索引
   * @param {object} updatedCondition - 更新的条件数据
   */
  const handleChange = (index, updatedCondition) => {
    const updatedConditions = conditions.map((cond, idx) =>
      idx === index ? { ...cond, ...updatedCondition } : cond
    );
    updateConditions(updatedConditions);
  };

  return (
    <>
      {conditions.map((cond, index) => (
        <ConditionItem
          key={cond.id}
          conditionData={cond}
          countOfConditions={conditions.length}
          shopTags={shopTags}
          shopVendors={shopVendors}
          shopTypes={shopTypes}
          currencyCode={currencyCode}
          weightUnit={weightUnit}
          onConditionChange={(updatedCondition) => handleChange(index, updatedCondition)}
          onDelete={() => deleteCondition(index)}  // 传递删除事件
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

/**
 * 条件选择器子组件，负责渲染每个条件选择器
 * @param {object} props - 属性参数
 */
function ConditionItem({
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
  // 各个 Popover 的打开/关闭状态
  const [conditionPopoverActive, setConditionPopoverActive] = useState(false);
  const [operatorPopoverActive, setOperatorPopoverActive] = useState(false);
  const [valuePopoverActive, setValuePopoverActive] = useState(false);

  // 解构传入的条件数据
  const { condition, conditionLabel, operator, operatorLabel, value, operatorList, valueList } = conditionData;

  /**
   * 创建用于触发 Popover 的按钮
   * @param {string} label - 按钮标签
   * @param {function} toggleActive - 切换 Popover 状态的回调函数
   * @returns {JSX.Element} - 返回按钮元素
   */
  const createActivator = useCallback((label, toggleActive) => (
    <Button fullWidth textAlign="left" disclosure="down" onClick={toggleActive}>
      {label}
    </Button>
  ), []);

  /**
   * 通用的 Popover 开关函数
   * @param {function} setter - 状态更新函数
   * @returns {function} - 返回用于切换 Popover 的函数
   */
  const togglePopover = (setter) => () => setter((active) => !active);

  /**
   * 处理 condition 改变时的操作
   * @param {array} v - 新的条件值
   */
  const handleConditionChange = useCallback(
    (v) => {
      const currentCondition = v[0];
      const { label, operators } = ProductFilterConditions.find((item) => item.value === currentCondition);
      const newOperatorList = operators.map((i) => ProductFilterOperators[i]);  // 根据条件获取对应操作符
      const newValueList = getValueListByCondition(currentCondition, shopTags, shopVendors, shopTypes);  // 根据条件获取值列表

      // 更新选择器状态并关闭弹窗
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

  /**
   * 处理 operator 改变时的操作
   * @param {array} v - 新的操作符值
   */
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

  /**
   * 处理值改变时的操作
   * @param {string} newValue - 新的值
   */
  const handleValueChange = useCallback(
    (newValue) => {
      const newValueList = getValueListByCondition(condition[0], shopTags, shopVendors, shopTypes, newValue);
      setValuePopoverActive(newValueList.length > 0);
      onConditionChange({ value: newValue, valueList: newValueList });
    },
    [condition, shopTags, shopVendors, shopTypes, onConditionChange]
  );

  /**
   * 获取焦点时显示值的弹窗
   */
  const handleValueFocus = useCallback(() => {
    if (valueList.length > 0) setValuePopoverActive(true);
  }, [valueList]);

  return (
    <InlineGrid columns={countOfConditions > 1 ? "1fr 1fr 1fr auto" : "1fr 1fr 1fr"} gap="200">
      {/* Condition 下拉菜单 */}
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

      {/* Operator 下拉菜单 */}
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

      {/* Value 输入框 */}
      <Popover
        active={valuePopoverActive}
        activator={
          <TextField
            labelHidden
            value={value}
            onChange={handleValueChange}
            autoComplete="off"
            prefix={condition[0] === 'price' && <CurrencySymbol currencyCode={currencyCode} />}
            suffix={condition[0] === 'weight' && <WeightSymbol weightUnit={weightUnit} />}
            onFocus={handleValueFocus}
          />
        }
        preferredPosition="above"
        preferredAlignment="left"
        onClose={togglePopover(setValuePopoverActive)}
      >
        <OptionList allowMultiple={false} onChange={(v) => onConditionChange({ value: v[0] })} options={valueList} selected={[value]} />
      </Popover>

      {/* 删除按钮 */}
      {countOfConditions > 1 && (
        <Button icon={DeleteIcon} onClick={onDelete} accessibilityLabel="Delete condition" />
      )}
    </InlineGrid>
  );
}

/**
 * 根据当前的 condition 返回相应的值列表
 * @param {string} condition - 当前条件类型
 * @param {array} shopTags - 商品标签列表
 * @param {array} shopVendors - 商品供应商列表
 * @param {array} shopTypes - 商品类型列表
 * @param {string} [searchValue] - 可选的过滤值
 * @returns {array} - 返回过滤后的值列表
 */
function getValueListByCondition(condition, shopTags, shopVendors, shopTypes, searchValue = '') {
  const valueLists = {
    tag: shopTags,
    vendor: shopVendors,
    type: shopTypes,
  };
  const list = valueLists[condition] || [];
  return searchValue ? list.filter(item => item.value.toLowerCase().startsWith(searchValue.toLowerCase())) : list;
}
