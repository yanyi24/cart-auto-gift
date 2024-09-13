import shopify from "../shopify.server.js";
import {json} from "@remix-run/node";

async function collectionHasProduct({url, admin}) {

  const collectionId= url.searchParams.get('collectionId');
  const productId = url.searchParams.get('productId');

  if (!collectionId || !productId || isNaN(Number(collectionId)) || isNaN(Number(productId))) {
    return json({success: false, message: "Missing or invalid parameters"})
  }


  const response = await admin.graphql(`
    query collectionHasProduct($collectionId: ID!, $productId: ID!) {
      collection(id: $collectionId) {
        hasProduct(id: $productId)
      }
    }`,
    {
      variables: {
        collectionId: `gid://shopify/Collection/${collectionId}`,
        productId: `gid://shopify/Product/${productId}`
      }
    });

  const { data } = await response.json();
  return json({ success: true, data: data?.collection?.hasProduct });
}

export const loader = async ({ request }) => {
  const { admin } = await shopify.authenticate.admin(request);

  const url = new URL(request.url);
  const reqType =  url.searchParams.get('reqType');

  if(reqType === 'collectionHasProduct') return await collectionHasProduct({ url, admin })

  return json({ data: null });

};
