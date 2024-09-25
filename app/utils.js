export function removeGidStr(gid) {
  return Number(gid.split('/').pop());
}

export function addGidStr(type, id) {
  return `gid://shopify/${type}/${id}`;
}

export const ProductFilterConditions = [
  { label: 'Title',           value: 'title',   operators: [0, 1, 2, 3, 4, 5] },
  { label: 'Type',            value: 'type',    operators: [0, 1, 2, 3, 4, 5] },
  { label: 'Vendor',          value: 'vendor',  operators: [0, 1, 2, 3, 4, 5] },
  { label: 'Tag',             value: 'tag',     operators: [0],               },
  { label: 'Price',           value: 'price',   operators: [0, 1, 6, 7]       },
  { label: 'Weight',          value: 'weight',  operators: [0, 1, 6, 7]       },
  { label: "Variant's title", value: 'v_title', operators: [0, 1, 2, 3, 4, 5] },
];

export const ProductFilterOperators = [
  { label: 'is equal to',      value: 'equal'            },
  { label: 'is not equal to',  value: 'not_equal'        },
  { label: 'starts with',      value: 'starts_with'      },
  { label: 'ends with',        value: 'ends_with'        },
  { label: 'contains',         value: 'contains'         },
  { label: 'does not contain', value: 'not_contain' },
  { label: 'is greater than',  value: 'greater_than'     },
  { label: 'is less than',     value: 'less_than'        },
]
export async function resourcePicker({ type, selectionIds }) {
  return await window.shopify.resourcePicker({
    type,
    action: 'add',
    multiple: true,
    selectionIds,
    filter: {
      draft: false
    }
  });
}
