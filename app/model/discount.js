import db from '../db.server.js';

export async function createDiscount(input){

  try {
    const result = await db.discount.create({
      data: input
    })
    return { success: true, message: 'Discount created successfully', data: result?.id };
  } catch (error) {
    console.error('Error creating discount:', error);
    return { success: false, message: 'Failed to create discount' };
  }
}

export async function deleteDiscount(id, discountId) {
  if ((id === undefined && discountId === undefined) || isNaN(Number(id))) {
    return { success: false, message: 'Invalid ID' };
  }

  try {
    await db.discount.delete({
      where: discountId ? {discountId} : { id }
    });

    return { success: true, message: 'Discount deleted successfully' };
  } catch (error) {
    console.error('Error deleting discount:', error);
    return { success: false, message: 'Failed to delete discount' };
  }
}

export async function getDiscounts(query) {
  const {
    id,
    title,
    shop,
    page = 1,
    pageSize = 30,
    sortBy = 'updatedAt',
    sortOrder = 'desc',
  } = query;

  const sortParams = { [sortBy]: sortOrder };
  const OR = [];

  if (id) OR.push({ id: Number(id) });
  if (title) OR.push({ title: { contains: title } });

  const whereParams = { shop, ...(OR.length && { OR }) };


  try {
    const surveys = await db.discount.findMany({
      where: whereParams,
      orderBy: sortParams,
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    const totalSurveys = await db.discount.count({ where: whereParams });
    const totalPages = Math.ceil(totalSurveys / pageSize);

    return {
      success: true,
      data: surveys,
      page,
      totalPages,
      totalSurveys
    };
  } catch (error) {
    console.error('Error fetching surveys by shop:', error);
    return { success: false, message: 'Failed to fetch surveys by shop' };
  }
}
