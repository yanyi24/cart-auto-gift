export function removeGidStr(gid) {
  return Number(gid.split('/').pop());
}

export function addGidStr(type, id) {
  return `gid://shopify/${type}/${id}`;
}
