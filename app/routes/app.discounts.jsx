import {Card, EmptyState, Layout, Page} from "@shopify/polaris";
import {useState} from "react";
import {useLoaderData, useNavigate} from "@remix-run/react";
import {json} from "@remix-run/node";


export const loader = async ({ request, params}) => {
  return json({
    discounts: [],
  })
}
const EmptySurveyState = ({ onAction }) => (
  <EmptyState
    heading="Create a auto gift discount"
    action={{
      content: 'Create discount',
      onAction,
    }}
    image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
  ></EmptyState>
);

export default function AppDiscounts() {
  const navigate = useNavigate();
  const {discounts} = useLoaderData();
  console.log({discounts})
  return (
    <Page
      title="Discounts"
      primaryAction={{
        content: 'Create discount',
        url: '/app/discounts/new'
      }}
    >
      <Layout>
        <Layout.Section>
          <Card>
            {discounts.length ? null : (
              <EmptySurveyState onAction={() => navigate('/app/discount/new')} />
            ) }
          </Card>
        </Layout.Section>
      </Layout>

    </Page>
  );
}
