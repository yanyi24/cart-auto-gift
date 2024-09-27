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
