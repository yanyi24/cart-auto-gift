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

  const configuration = JSON.parse(
    input?.discountNode?.metafield?.value ?? "{}",
  );

  const  {buys, triggerType, conditions, discounted} = configuration;
  if (!buys || !triggerType || !conditions || !discounted) {
    return EMPTY_DISCOUNT;
  }
  const xsInCart = [];
  if (buys.type === 'PRODUCTS') {
    const value = buys.value;
    input.cart.lines.forEach(line => {
      const idArr = line.merchandise.id.split('/');
      const id = idArr[idArr.length - 1];
      if (value.includes(id)) {
        xsInCart.push(id);
      }
    });
  }


  const condition = findObjectByValue(conditions, xsInCart.length);
  if (!condition.value) {
    return EMPTY_DISCOUNT;
  }

  const getsIds= condition.gets.map(id => `gid://shopify/ProductVariant/${id}`)


  const targets = input.cart.lines
    .filter((line) => getsIds.includes(line.merchandise.id))
    .map((line) => {
    return /** @type {Target} */ ({
      cartLine: {
        id: line.id,
      },
    });
  });

  if (!targets.length){
    return EMPTY_DISCOUNT;
  }


  return {
    discounts: [
      {
        targets,
        value: {
          percentage: {
            value: '100',
          },
        },
      },
    ],
    discountApplicationStrategy: DiscountApplicationStrategy.First,
  };
}

function findObjectByValue(arr, inputValue) {
  let result = {};
  arr.forEach(item => {
    if (item.value <= inputValue) {
      if (!result.value || item.value > result.value) {
        result = item;
      }
    }
  });

  return result;
}
