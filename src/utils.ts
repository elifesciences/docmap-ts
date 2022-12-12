export const formatDate = (date?: Date): string => {
  if (!date) {
    return 'unknown'; // TODO: what if we don't have a published date
  }
  const month = date.getUTCMonth()+1;
  return `${date.getUTCFullYear()}-${month.toString().padStart(2, '0')}-${date.getUTCDate().toString().padStart(2, '0')}`;
};
