import {useEffect, useState} from 'react';

export default function WeightSymbol({weightUnit = 'KILOGRAMS'}) {
  const [weightSymbol, setWeightSymbol] = useState('');

  useEffect(() => {
    switch (weightUnit) {
      case "KILOGRAMS":
        setWeightSymbol("kg");
        break;
      case "GRAMS":
        setWeightSymbol("g");
        break;
      case "OUNCES":
        setWeightSymbol("oz");
        break;
      case "POUNDS":
        setWeightSymbol("lb");
        break;
      default:
        setWeightSymbol("");
    }
  }, [weightUnit]);

  return weightSymbol;
}
