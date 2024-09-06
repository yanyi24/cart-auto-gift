import React, { useState } from "React";
import { gql } from "graphql-request";
import { useQuery } from "react-query";
import { unstable_Picker as Picker } from "@shopify/app-bridge-react";

import { fetchGraphQL } from "./authenticatedGraphQL";
import {useEffect} from "react"; // A request to proxy the GraphQL request

const CUSTOMER_SEGMENT_PICKER_QUERY = gql`
  query GetCustomerSegments($first: Int!, $searchQuery: String) {
    segments(query: $searchQuery, first: $first) {
      edges {
        cursor
        node {
          id
          name
        }
      }
    }
  }
`;

export default function CustomerSegmentsPicker({
                                  isOpen,
                                  onCancel,
                                  onSelect,
                                  searchQuery,
                                  setSearchQuery,
                                  initialSelectedItems,
                                }) {
  const [selectedItems, setSelectedItems] = useState();
  let customerSegments = [];
  let customerSegmentNodes = [];

  useEffect(() => {
    setSelectedItems(initialSelectedItems);
  }, [initialSelectedItems]);

  // The request to fetch customers specifies the page, search query, and page size
  const fetchCustomerSegments = async ({ pageParam }) =>
    fetchGraphQL(CUSTOMER_SEGMENT_PICKER_QUERY, {
      first: PAGE_SIZE,
      searchQuery: searchQuery,
    });

  const {
    data,
    error,
    isLoading: dataIsLoading,
  } = useQuery(["GetCustomerSegments", searchQuery], fetchCustomerSegments);

  if (!dataIsLoading && !error) {
    (customerSegmentNodes = data.data.segments.edges.map(({ node }) => node)),
      (customerSegments = customerSegmentNodes.map((node) => ({
        id: node.id,
        name: node.name,
      })));
  }

  return (
    <Picker
      open={isOpen}
      items={customerSegments}
      selectedItems={selectedItems}
      maxSelectable={0}
      searchQuery={searchQuery}
      onCancel={onCancel}
      onSelect={({ selectedItems }) => {
        onSelect(
          selectedItems.map((item) =>
            customerSegmentNodes.find((node) => node.id === item.id)
          )
        );
      }}
      onSearch={(options) => {
        setSearchQuery(options.searchQuery);
      }}
      onLoadMore={() => {
        if (hasNextPage) {
          fetchNextPage();
        }
      }}
      emptySearchLabel={{
        title: "No Customer Segment",
        description: "There is no customer segment for this search",
        withIllustration: true,
      }}
      loading={dataIsLoading}
      searchQueryPlaceholder="Search customer segment"
      primaryActionLabel="Select"
      secondaryActionLabel="Cancel"
      title="Customer Segment Picker"
    />
  );
}
