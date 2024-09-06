import {useEffect, useState} from 'react';

export default function CurrencySymbol({currencyCode = 'USD'}) {
  const [currencySymbol, setCurrencySymbol] = useState('');

  useEffect(() => {
    // 使用 Intl.NumberFormat 提取货币符号
    const formatter = new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });

    // 使用格式化器将数值0格式化，提取货币符号
    const parts = formatter.formatToParts(0);
    const symbolPart = parts.find(part => part.type === 'currency');
    if (symbolPart) {
      setCurrencySymbol(symbolPart.value);
    }
  }, [currencyCode]);

  return currencySymbol;
}
