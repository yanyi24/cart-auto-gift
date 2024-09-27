// @ts-check
import { DiscountApplicationStrategy } from "../generated/api";

/**
 * @typedef {import("../generated/api").RunInput} RunInput
 * @typedef {import("../generated/api").FunctionRunResult} FunctionRunResult
 */

/**
 * @type {FunctionRunResult}
 */
const EMPTY_DISCOUNT = {
  discountApplicationStrategy: DiscountApplicationStrategy.First,
  discounts: [],
};
const CONDITIONS = {
  any: 'ANY',
  all: 'ALL'
}
const BUYS_TYPES = {
  products: 'ALL_PRODUCTS',
  product: 'PRODUCT',
  collection: 'COLLECTION',
  filter: 'FILTER'
}
const RULES = {
  quantity: 'QUANTITY',
  unique: 'UNIQUE',
  amount: 'AMOUNT'
}

const DISCOUNTED = {
  free: 'FREE',
  percentage: 'PERCENTAGE',
  fixed_amount: 'FIXED_AMOUNT'
}
/**
 * @param {RunInput} input
 * @returns {FunctionRunResult}
 */
export function run(input) {
  // 解析配置，获取配置中的买入规则、规则类型和条件
  const configuration = JSON.parse(input?.discountNode?.metafield?.value ?? "{}");
  const cartLines = input?.cart?.lines || [];
  const currencyRate = Number(input?.presentmentCurrency) || 1;
  const { buys, rule, conditions } = configuration;

  // 如果配置中的必要字段不存在，则返回空折扣
  if (!buys || !rule || !conditions) {
    return EMPTY_DISCOUNT;
  }

  // 获取折扣值的函数，根据不同的折扣类型返回相应的折扣
  const getDiscountValue = (condition) => {
    if (condition.discounted === DISCOUNTED.free) {
      return { percentage: { value: '100' } }; // 全免折扣
    } else if (condition.discounted === DISCOUNTED.percentage) {
      return { percentage: { value: condition.discountedPercentage } }; // 百分比折扣
    } else if (condition.discounted === DISCOUNTED.fixed_amount) {
      return { fixedAmount: { amount: condition.discountedEachOff, appliesToEachItem: true } }; // 每件商品固定折扣
    }
    return {};
  };

  // 获取符合条件的购物车商品
  const getTargets = (cartLines, getsIds) => {
    return cartLines
      .filter(line => getsIds.includes(removeGidStr(line.merchandise.id)) && line.quantity === 1) // 筛选符合条件的商品且数量为1
      .map(line => ({ cartLine: { id: line.id } })); // 生成目标商品的对象
  };

  // 应用折扣的函数，返回包含目标商品和折扣值的对象
  /**
   * @param {any} condition
   * @param {CartLine[]} cartLines
   * @returns {FunctionRunResult}
   */
  const applyDiscount = (condition, cartLines) => {
    const getsIds = condition.products.flatMap(p => p.variants); // 获取条件中所有商品变体ID
    const targets = getTargets(cartLines, getsIds); // 筛选符合条件的商品

    if (!targets.length) {
      return EMPTY_DISCOUNT; // 如果没有符合条件的商品，返回空折扣
    }

    return {
      discounts: [{ targets, value: getDiscountValue(condition) }], // 返回目标商品和折扣值
      discountApplicationStrategy: DiscountApplicationStrategy.First, // 设置折扣应用策略
    };
  };

  // 获取规则中的所有礼品变体ID
  const getAllGiftVariants = (conditions) =>
    conditions.flatMap(c => c.products.flatMap(p => p.variants));

  /**
   * @param {CartLine[]} lines
   * @returns {FunctionRunResult}
   */
  const handleRule = (lines) => {
    if (rule === RULES.quantity) {
      // 根据筛选结果找到对应的条件
      const totalQuantity = lines.reduce((total, line) => total + line.quantity, 0);
      const condition = findObjectByValue(conditions, totalQuantity);
      if (!condition.quantity) return EMPTY_DISCOUNT; // 如果条件不满足数量要求，返回空折扣
      return applyDiscount(condition, cartLines); // 应用折扣
    }

    if (rule === RULES.unique) {
      // 根据筛选结果找到对应的条件
      const condition = findObjectByValue(conditions, lines.length);
      if (!condition.quantity) return EMPTY_DISCOUNT; // 如果条件不满足数量要求，返回空折扣
      return applyDiscount(condition, cartLines); // 应用折扣
    }

    if (rule === RULES.amount) {
      // 计算购物车中不包含礼品商品的总金额
      const exceptedGiftsTotalAmount = lines
        .reduce((total, line) => total + Number(line.cost.totalAmount.amount), 0);
      // 根据总金额找到对应的条件
      const condition = findObjectByValue(conditions, exceptedGiftsTotalAmount, 'amount');
      if (!condition.amount) return EMPTY_DISCOUNT; // 如果条件不满足金额要求，返回空折扣
      return applyDiscount(condition, cartLines); // 应用折扣
    }
    return EMPTY_DISCOUNT;
  }

  const allGifts = getAllGiftVariants(conditions); // 获取所有礼品的商品变体ID

  let lines = [];
  if (buys.type === BUYS_TYPES.products) {
    // 筛选出购物车中不包含礼品的商品
    lines = cartLines.filter(line => !allGifts.includes(removeGidStr(line.merchandise.id)));
  }

  if (buys.type === BUYS_TYPES.product) {
    const buysIds = buys.value.flatMap(p => p.variants); // 获取买入规则中的商品变体ID
    // 筛选购物车中包含买入规则商品的商品
    lines = cartLines.filter(line => buysIds.includes(removeGidStr(line.merchandise.id)));
  }
  if (buys.type === BUYS_TYPES.collection) {
    // 筛选购物车中不包含礼品且在给定集合中的商品
    lines = cartLines.filter(line => (line.merchandise.product.inAnyCollection && !allGifts.includes(removeGidStr(line.merchandise.id))));
  }

  if (buys.type === BUYS_TYPES.filter) {
    const allGifts = getAllGiftVariants(conditions);
    // 筛选购物车中不包含礼品且符合条件的商品
    lines = filterCartItems(cartLines, allGifts, buys.value)
  }
   return handleRule(lines);
}

function filterCartItems(cartLines, allGifts, filter) {
  const { conditions, filterType } = filter;
  return cartLines.filter((line) => {
    const variant = line.merchandise;
    const {id, product, weightUnit, weight, title} = variant;
    if (allGifts.includes(removeGidStr(id))) {
      return false;
    }
    const {quantity, cost: {totalAmount: {amount}}} = line;
    const price = Number(amount) / quantity; // 商品单价
    const weightData =
      weightUnit === "GRAM"
        ? weight / 1000
        : weightUnit === "OUNCES"
          ? weight / 35.27396
          : weightUnit === "POUNDS"
            ? weight / 2.20462
            : weight;

    // 遍历每个 condition 并应用操作符
    const results = conditions.map(({condition, operator, value}) => {
      // 获取商品属性
      let productValue;
      switch (condition) {
        case "title":
          productValue = product.title || "";
          break;
        case "type":
          productValue = product.productType || "";
          break;
        case "vendor":
          productValue = product.vendor || "";
          break;
        case "tag":
          return filterType === "all_conditions"
            ? product.hasTags.every(item => item.hasTag)
            : product.hasAnyTag;
        case "price":
          productValue = price;
          break;
        case "weight":
          productValue = weightData;
          break;
        case "v_title":
          productValue = title;
          break;
        default:
          productValue = "";
      }

      // 执行操作符逻辑
      switch (operator) {
        case "equal":
          return productValue === value;
        case "not_equal":
          return productValue !== value;
        case "starts_with":
          return productValue.startsWith(value);
        case "ends_with":
          return productValue.endsWith(value);
        case "contains":
          return productValue.includes(value);
        case "not_contain":
          return !productValue.includes(value);
        case "greater_than":
          return Number(productValue) > Number(value);
        case "less_than":
          return Number(productValue) < Number(value);
        default:
          return false;
      }
    });

    // 根据 filterType 决定返回值
    if (filterType === CONDITIONS.all) {
      return results.every((result) => result === true);
    } else if (filterType === CONDITIONS.any) {
      return results.some((result) => result === true);
    }

    return false;
  });
}


function findObjectByValue(arr, inputValue, type='quantity') {
  let result = {};
  arr.forEach(item => {
    if (item[type] <= inputValue) {
      if (!result[type] || item[type] > result[type]) {
        result = item;
      }
    }
  });

  return result;
}

function removeGidStr(gid) {
  return Number(gid.split('/').pop());
}

