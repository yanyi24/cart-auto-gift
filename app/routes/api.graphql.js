import {authenticate} from "../shopify.server.js";
import {json} from "@remix-run/node";
import {CONDITIONS} from "../utils.js";


// export const loader = async ({ request }) => {
//   const {admin} = await authenticate.public.appProxy(request);
//   const url = new URL(request.url);
//   const reqType =  url.searchParams.get('reqType');
//   return json({ data: null });
// };

export const action = async ({ request }) => {
  const {admin} = await authenticate.public.appProxy(request);
  const url = new URL(request.url);
  const reqType =  url.searchParams.get('reqType');

  const requestBody = JSON.parse(await streamToString(request.body));

  if(reqType === 'productsInCollections') return await productsInCollections({ requestBody, admin })
  if(reqType === 'productsHasTags') return await productsHasTags({ requestBody, admin })
}

async function productsInCollections({ requestBody, admin }) {
  let { collectionIds, handles, first, condition } = requestBody;
  condition = condition || CONDITIONS.any;

  if (!Array.isArray(collectionIds) || !Array.isArray(handles) || isNaN(Number(first)) || !CONDITIONS.value.includes(condition)) {
    return json({ success: false, message: "Missing or invalid parameters" });
  }

  if (collectionIds.some(id => isNaN(Number(id)))) {
    return json({ success: false, message: "Invalid collection ID" });
  }

  // 单个查询函数
  const singleRes = async (collectionId, handles, first) => {
    const response = await admin.graphql(
        `
        #graphql
        query collectionHasProducts($first: Int!, $query: String!, $collectionId: ID!) {
          products(first: $first, query: $query) {
            nodes {
              handle
              inCollection(id: $collectionId)
            }
          }
        }
      `,
      {
        variables: {
          collectionId: `gid://shopify/Collection/${collectionId}`,
          first: Number(first),
          query: `handle:${handles}`
        }
      }
    );

    const { data } = await response.json();
    return data?.products?.nodes || [];
  };

  try {
    // 并行处理所有 collectionIds
    const allResults = await Promise.all(
      collectionIds.map(collectionId => singleRes(collectionId, handles, first))
    );

    // 归组数据：根据 handle 归组
    const groupedResults = {};

    allResults.flat().forEach(product => {
      if (condition === CONDITIONS.all) {
        if (groupedResults[product.handle] === undefined) {
          groupedResults[product.handle] = true;
        }

        if (!product.inCollection) {
          groupedResults[product.handle] = false;
        }
      } else if (condition === CONDITIONS.any) {
        if (groupedResults[product.handle] === undefined) {
          groupedResults[product.handle] = false;
        }
        if (product.inCollection) {
          groupedResults[product.handle] = true;
        }
      }

    });

    return json({ success: true, data: groupedResults });
  } catch (error) {
    return json({ success: false, message: "An error occurred", error: error.message });
  }
}


async function productsHasTags({ requestBody, admin }) {
  let { tags, handles, first, condition } = requestBody;
  condition = condition || CONDITIONS.any;
  // 参数验证
  if (!Array.isArray(tags) || !Array.isArray(handles) || isNaN(Number(first)) || !CONDITIONS.value.includes(condition)) {
    return json({ success: false, message: "Missing or invalid parameters" });
  }

  try {
    const response = await admin.graphql(
        `
        #graphql
        query collectionHasProducts($first: Int!, $query: String!) {
          products(first: $first, query: $query) {
            nodes {
              handle
              tags
            }
          }
        }
      `,
      {
        variables: {
          first: Number(first),
          query: `handle:${handles}`
        }
      }
    );

    const { data } = await response.json();
    const nodes = data?.products?.nodes || [];

    const result = {};
    nodes.forEach(node => {
      if (node.tags.length === 0) {
        result[node.handle] = false;
      }
      if (condition === CONDITIONS.all) {
        if (result[node.handle] === undefined) {
          result[node.handle] = false;
        }
        if (tags.every(tag => node.tags.includes(tag))) {
          result[node.handle] = true;
        }
      } else if (condition === CONDITIONS.any){

        node.tags.forEach(tag => {
          if (result[node.handle] === undefined) {
            result[node.handle] = false;
          }
          result[node.handle] = true;
          if (tags.includes(tag)) {
            result[node.handle] = true;
          }
        })
      }
    })
    return json({ success: true, data: result });
  } catch (error) {
    return json({ success: false, message: "An error occurred", error: error.message });
  }
}

async function streamToString(stream) {
  const reader = stream.getReader();
  const utf8Decoder = new TextDecoder();
  let result = '';
  let done = false;

  while (!done) {
    const { value, done: doneReading } = await reader.read();
    done = doneReading;
    if (value) {
      result += utf8Decoder.decode(value, { stream: true });
    }
  }

  result += utf8Decoder.decode(); // flush the last chunk
  return result;
}

function a(){
  const q1 = `
  query queryDiscounts {
  discountNodes(first: 1,
    query:"status:'ACTIVE' AND combines_with:'PRODUCT_DISCOUNTS' AND combines_with:'SHIPPING_DISCOUNTS' AND combines_with:'ORDER_DISCOUNTS'") {
    edges {
      node {
        id
        discount {
          ... on DiscountAutomaticApp {
            appDiscountType {
              title
              targetType
              app {
                title
              }
            }
            endsAt
            title
            status
            startsAt
            endsAt
            asyncUsageCount
            discountClass
            updatedAt
          }
        }
        metafield(key: "amount-configuration", namespace: "$app:auto-gift") {
          value
        }
      }
    }
    pageInfo {
      endCursor
      hasNextPage
      hasPreviousPage
      startCursor
    }
  }
}
  `;

}
