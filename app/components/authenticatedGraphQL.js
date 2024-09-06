export async function fetchGraphQL(query, variables) {
  const graphQLQuery = {query, variables};

  const result = await fetch('shopify:admin/api/graphql.json', {
    method: 'POST',
    body: JSON.stringify(graphQLQuery),
  });

  if (!result.ok) {
    console.error('GraphQL error', result.status);
  }

  return await result.json();
}
