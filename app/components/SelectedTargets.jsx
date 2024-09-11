import {Box, Button, InlineStack, Text, Thumbnail} from "@shopify/polaris";
import {ImageIcon, XSmallIcon} from "@shopify/polaris-icons";
import {useI18n} from "@shopify/react-i18n";

export default function SelectedTargets({products, collections, onRemove, onEdit, currencyCode}) {
  const [i18n] = useI18n();
  const Item = ({ title, img, alt, tips, isLast, onRemove, onEdit }) => (
    <Box borderBlockEndWidth={isLast ? '0' : '025'} padding="300" borderColor="border-brand">
      <InlineStack blockAlign="center" align="space-between">
        <InlineStack gap="300">
          <Thumbnail source={img} alt={alt} />
          <Box>
            <Text as="p">{title}</Text>
            <Text as="p">{tips}</Text>
          </Box>
        </InlineStack>
        <InlineStack gap="400">
          {onEdit && <Button variant="plain" onClick={onEdit}>Edit</Button>}
          <Button variant="plain" icon={XSmallIcon} onClick={onRemove} />
        </InlineStack>
      </InlineStack>
    </Box>
  );
  const renderProducts = () => products?.length ? (
    <Box borderWidth="025" borderRadius="200" borderColor="border-brand">
      {products.map((product, idx) => {
        const { totalVariants, variants, title, hasOnlyDefaultVariant, images, id } = product;
        const tips = hasOnlyDefaultVariant
          ? i18n.formatCurrency(variants[0].price, { currency: currencyCode })
          : `(${variants.length} of ${totalVariants} variants selected)`;
        const img = images?.[0]?.originalSrc || ImageIcon;
        const alt = images?.[0]?.altText || title;

        return (
          <Item
            key={id}
            id={id}
            title={title}
            img={img}
            alt={alt}
            tips={tips}
            isLast={idx === products.length - 1}
            onRemove={() => onRemove(id)}
            onEdit={(!hasOnlyDefaultVariant && onEdit) ? () => onEdit(id) : null}
          />
        );
      })}
    </Box>
  ) : null;

  const renderCollections = () =>
    collections?.length ? (
      <Box borderWidth="025" borderRadius="200" borderColor="border-brand">
        {collections.map((collection, idx) => {
          const { productsCount, title, image, id } = collection;
          const tips = productsCount > 1 ? `${productsCount} products` : `${productsCount} product`;
          const img = image?.originalSrc || ImageIcon;

          return (
            <Item
              key={id}
              id={id}
              title={title}
              img={img}
              alt={title}
              tips={tips}
              isLast={idx === collections.length - 1}
              onRemove={() => onRemove(id)}
            />
          );
        })}
      </Box>
    ) : null;

  return (
    <>
      {renderProducts()}
      {renderCollections()}
    </>
  )
}
