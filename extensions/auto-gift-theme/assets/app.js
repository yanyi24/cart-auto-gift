class CartWatcher {

  init() {
    this.emitCartChanges().then(() => {
      this.observeCartChanges();
    });
  }

  async fetchCart() {
    const response = await fetch('/cart.js');
    return response.json();
  }

  storeCart(cart) {
    localStorage.setItem('cart', JSON.stringify(cart));
  }

  storedCart() {
    return JSON.parse(localStorage.getItem('cart')) || { items: [] };
  }

  findCartChanges(oldCart, newCart) {
    const onlyInLeft = (l, r) => l.filter(li => !r.some(ri => li.key === ri.key));
    let result = {
      added: onlyInLeft(newCart.items, oldCart.items),
      removed: onlyInLeft(oldCart.items, newCart.items),
    };

    oldCart.items.forEach(oi => {
      const ni = newCart.items.find(i => i.key === oi.key && i.quantity !== oi.quantity);
      if (!ni) return;
      let quantity = ni.quantity - oi.quantity;
      let item = { ...ni };
      item.quantity = Math.abs(quantity);
      quantity > 0
        ? result.added.push(item)
        : result.removed.push(item)
    });
    return result;
  }

  async emitCartChanges() {
    const newCart = await this.fetchCart();
    const oldCart = this.storedCart();
    const changes = this.findCartChanges(oldCart, newCart);
    const event = new CustomEvent("cart_changed", { detail: {changes, currentCart: newCart} });
    window.dispatchEvent(event);

    this.storeCart(newCart);
  }

  observeCartChanges() {
    const cartObserver = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        const isValidRequestType = ['xmlhttprequest', 'fetch'].includes(entry.initiatorType);
        const isCartChangeRequest = /\/cart\//.test(entry.name);
        if (isValidRequestType && isCartChangeRequest) {
          this.emitCartChanges().then(r => {});
        }
      });
    });
    cartObserver.observe({ entryTypes: ["resource"] });
  }
}

const myCartWatcher = new CartWatcher;
myCartWatcher.init();
window.addEventListener("cart_changed", e => {
  const { changes, currentCart } = event.detail;
  const {added, removed} = changes;
  console.log('Cart changes:', changes);
  console.log('Current cart:', currentCart);
});


async function fetchData(url, data={}) {
  try {
    const response = await fetch(url, {
      method: 'POST',
      redirect: 'manual',
      body: JSON.stringify(data),
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    throw error;
  }
}

document.getElementById('test').addEventListener('click', async () => {
  const res = await fetchData('/apps/api/graphql?reqType=productsInCollections', {
    collectionIds: [483853500706, 483853566242],
    first: 2,
    handles: ['gift-card','the-minimal-snowboard']
  });
  console.log({ productsInCollections: res})

})
document.getElementById('test2').addEventListener('click', async () => {
  const res = await fetchData('/apps/api/graphql?reqType=productsHasTags', {
    tags: ['Snowboard', 'Accessory'],
    first: 10,
    handles: ['the-collection-snowboard-liquid','the-minimal-snowboard', 'the-3p-fulfilled-snowboard']
  });
  console.log({ productsHasTags: res})

})
