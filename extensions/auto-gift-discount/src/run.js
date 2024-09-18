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

/**
 * @param {RunInput} input
 * @returns {FunctionRunResult}
 */
export function run(input) {
  // 解析配置，获取配置中的买入规则、规则类型和条件
  const configuration = JSON.parse(input?.discountNode?.metafield?.value ?? "{}");
  const cartLines = input?.cart?.lines || [];
  const { buys, rule, conditions } = configuration;

  // 如果配置中的必要字段不存在，则返回空折扣
  if (!buys || !rule || !conditions) {
    return EMPTY_DISCOUNT;
  }

  // 获取折扣值的函数，根据不同的折扣类型返回相应的折扣
  const getDiscountValue = (condition) => {
    if (condition.discounted === 'FREE') {
      return { percentage: { value: '100' } }; // 全免折扣
    } else if (condition.discounted === "PERCENTAGE") {
      return { percentage: { value: condition.discountedPercentage } }; // 百分比折扣
    } else if (condition.discounted === "EACH_OFF") {
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

  const handleRule = (lines) => {
    if (rule === 'QUANTITY') {
      // 根据筛选结果找到对应的条件
      const condition = findObjectByValue(conditions, lines.length);
      if (!condition.quantity) return EMPTY_DISCOUNT; // 如果条件不满足数量要求，返回空折扣
      return applyDiscount(condition, cartLines); // 应用折扣
    }

    if (rule === 'AMOUNT') {
      // 计算购物车中不包含礼品商品的总金额
      const exceptedGiftsTotalAmount = lines
        .reduce((total, line) => total + Number(line.cost.totalAmount.amount), 0);
      // 根据总金额找到对应的条件
      const condition = findObjectByValue(conditions, exceptedGiftsTotalAmount, 'amount');
      if (!condition.amount) return EMPTY_DISCOUNT; // 如果条件不满足金额要求，返回空折扣
      return applyDiscount(condition, cartLines); // 应用折扣
    }
  }

  const allGifts = getAllGiftVariants(conditions); // 获取所有礼品的商品变体ID

  if (buys.type === 'ALL_PRODUCTS') {
    // 筛选出购物车中不包含礼品的商品
    const excludedGiftLines = cartLines.filter(line => !allGifts.includes(removeGidStr(line.merchandise.id)));

    // handleRule(excludedGiftLines)
    if (rule === 'QUANTITY') {

      // 根据筛选结果找到对应的条件
      const condition = findObjectByValue(conditions, excludedGiftLines.length);
      if (!condition.quantity) return EMPTY_DISCOUNT; // 如果条件不满足数量要求，返回空折扣
      return applyDiscount(condition, cartLines); // 应用折扣
    }

    if (rule === 'AMOUNT') {
      // 计算购物车中不包含礼品商品的总金额
      const exceptedGiftsTotalAmount = excludedGiftLines
        .reduce((total, line) => total + Number(line.cost.totalAmount.amount), 0);
      // 根据总金额找到对应的条件
      const condition = findObjectByValue(conditions, exceptedGiftsTotalAmount, 'amount');
      if (!condition.amount) return EMPTY_DISCOUNT; // 如果条件不满足金额要求，返回空折扣
      return applyDiscount(condition, cartLines); // 应用折扣
    }
  }

  if (buys.type === 'PRODUCTS') {
    const buysIds = buys.value.flatMap(p => p.variants); // 获取买入规则中的商品变体ID
    // 筛选购物车中包含买入规则商品的商品
    const linesIncludesBuys = cartLines.filter(line => buysIds.includes(removeGidStr(line.merchandise.id)));

    if (rule === 'QUANTITY') {
      // 根据筛选结果找到对应的条件
      const condition = findObjectByValue(conditions, linesIncludesBuys.length);
      if (!condition.quantity) return EMPTY_DISCOUNT; // 如果条件不满足数量要求，返回空折扣
      return applyDiscount(condition, cartLines); // 应用折扣
    }

    if (rule === 'AMOUNT') {
      // 计算购物车中符合买入规则商品的总金额
      const buysTotalAmount = linesIncludesBuys
        .reduce((total, line) => total + Number(line.cost.totalAmount.amount), 0);
      // 根据总金额找到对应的条件
      const condition = findObjectByValue(conditions, buysTotalAmount, 'amount');
      if (!condition.amount) return EMPTY_DISCOUNT; // 如果条件不满足金额要求，返回空折扣
      return applyDiscount(condition, cartLines); // 应用折扣
    }
  }

  if (buys.type === 'COLLECTIONS') {
    const allGifts = getAllGiftVariants(conditions);
    // 筛选购物车中不包含礼品且在给定集合中的商品
    const excludedGiftLines = cartLines.filter(line => (line.product.inCollection && !allGifts.includes(removeGidStr(line.merchandise.id))));

    if (rule === 'QUANTITY') {
      // 根据筛选结果找到对应的条件
      const condition = findObjectByValue(conditions, excludedGiftLines.length);
      if (!condition.quantity) return EMPTY_DISCOUNT; // 如果条件不满足数量要求，返回空折扣
      return applyDiscount(condition, cartLines); // 应用折扣
    }

    if (rule === 'AMOUNT') {
      // 计算购物车中不包含礼品且在给定集合中的商品的总金额
      const buysTotalAmount = excludedGiftLines
        .reduce((total, line) => total + Number(line.cost.totalAmount.amount), 0);

      // 根据总金额找到对应的条件
      const condition = findObjectByValue(conditions, buysTotalAmount, 'amount');
      if (!condition.amount) return EMPTY_DISCOUNT; // 如果条件不满足金额要求，返回空折扣
      return applyDiscount(condition, cartLines); // 应用折扣
    }
  }

  if (buys.type === 'TAGS') {
    const allGifts = getAllGiftVariants(conditions);
    // 筛选购物车中不包含礼品且包含给定tag的商品
    const excludedGiftLines = cartLines.filter(line => (line.product.inTags && !allGifts.includes(removeGidStr(line.merchandise.id))));

    if (rule === 'QUANTITY') {
      // 根据筛选结果找到对应的条件
      const condition = findObjectByValue(conditions, excludedGiftLines.length);
      if (!condition.quantity) return EMPTY_DISCOUNT; // 如果条件不满足数量要求，返回空折扣
      return applyDiscount(condition, cartLines); // 应用折扣
    }

    if (rule === 'AMOUNT') {
      // 计算购物车中不包含礼品且在给定集合中的商品的总金额
      const buysTotalAmount = excludedGiftLines
        .reduce((total, line) => total + Number(line.cost.totalAmount.amount), 0);

      // 根据总金额找到对应的条件
      const condition = findObjectByValue(conditions, buysTotalAmount, 'amount');
      if (!condition.amount) return EMPTY_DISCOUNT; // 如果条件不满足金额要求，返回空折扣
      return applyDiscount(condition, cartLines); // 应用折扣
    }
  }

  return EMPTY_DISCOUNT;
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

