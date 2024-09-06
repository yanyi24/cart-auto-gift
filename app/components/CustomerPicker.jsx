import React, { useState, useEffect } from "react";
import { gql } from "graphql-request";
import { useInfiniteQuery } from "react-query";


import { fetchGraphQL } from "./authenticatedGraphQL";

// Use GraphQL Admin API to load the customers
const CUSTOMER_PICKER_QUERY = gql`
  query GetCustomers($first: Int!, $searchQuery: String = "", $after: String) {
    customers(
      first: $first
      query: $searchQuery
      after: $after
      sortKey: NAME
    ) {
      edges {
        cursor
        node {
          id
          displayName
          email
        }
      }
      pageInfo {
        hasNextPage
      }
    }
  }
`;

const PAGE_SIZE = 20;

export default function CustomerPicker({
                                         isOpen,
                                         onCancel,
                                         onSelect,
                                         searchQuery,
                                         setSearchQuery,
                                         initialSelectedItems,
                                       }) {
  const [selectedItems, setSelectedItems] = useState();
  let customers = [];
  let customerNodes = [];

  useEffect(() => {
    setSelectedItems(initialSelectedItems);
  }, [initialSelectedItems]);

  // The request to fetch customers specifies the page, search query, and page size
  const fetchCustomers = async ({ pageParam }) =>
    fetchGraphQL(CUSTOMER_PICKER_QUERY, {
      first: PAGE_SIZE,
      searchQuery: searchQuery,
      after: pageParam,
    });

  // This uses `useInfiniteQuery` from `react-query` to provide infinit loading
  const {
    data,
    error,
    isLoading: dataIsLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery("GetCustomers", fetchCustomers, {
    getNextPageParam: (lastPage, pages) => {
      const edges = lastPage.data.customers.edges;
      return edges.length > 0 ? edges[edges.length - 1].cursor : null;
    },
  });

  // Format the API response for the picker
  if (!dataIsLoading && !error) {
    customerNodes = data.pages.reduce(
      (nodes, page) => [
        ...nodes,
        ...page.data.customers.edges.map(({ node }) => node),
      ],
      []
    );
    customers = customerNodes.map((node) => ({
      id: node.id,
      name: `${node.email} ${node.displayName}`,
    }));
  }

  return (
    <div>jajjajaj</div>
  );
}
