import prisma from "../lib/prisma";

/**
 * One parsed item from the uploaded Excel file
 */
type ParsedOrderItem = {
  itemType: string;
  itemName: string;
  quantity: number;
  unit?: string;
};

/**
 * Input type for processing one uploaded order file
 */
type ProcessOrderUploadInput = {
  year: number;
  month: number;
  fileName: string;
  fileHash?: string;
  accountName: string;
  orderSheetNo: number;
  items: ParsedOrderItem[];
};

/**
 * Process one uploaded Excel order
 * - checks duplicate order
 * - creates customer if not found
 * - creates customer order
 * - creates order items
 * - inventory deduction can be added later
 */
export async function processOrderUpload(input: ProcessOrderUploadInput) {
  const {
    year,
    month,
    fileName,
    fileHash,
    accountName,
    orderSheetNo,
    items,
  } = input;

  return prisma.$transaction(async (tx) => {
    /**
     * Step 1: Check duplicate
     * ORDER SHEET NO resets every year,
     * so (orderYear + orderSheetNo) is the main duplicate key.
     */
    const existingOrder = await tx.customerOrder.findUnique({
      where: {
        orderYear_orderSheetNo: {
          orderYear: year,
          orderSheetNo,
        },
      },
    });

    if (existingOrder) {
      throw new Error(
        `Duplicate upload detected: order sheet no ${orderSheetNo} already exists for year ${year}.`
      );
    }

    /**
     * Step 2: Find customer by accountName
     * If not found, create one automatically.
     */
    let customer = await tx.customer.findUnique({
      where: {
        accountName,
      },
    });

    if (!customer) {
      customer = await tx.customer.create({
        data: {
          accountName,
        },
      });
    }

    /**
     * Step 3: Create customer order
     */
    const order = await tx.customerOrder.create({
      data: {
        customerId: customer.id,
        orderYear: year,
        orderMonth: month,
        orderSheetNo,
        fileName,
        fileHash,
      },
    });

    /**
     * Step 4: Create order items
     */
    if (items.length > 0) {
      await tx.orderItem.createMany({
        data: items.map((item) => ({
          customerOrderId: order.id,
          itemType: item.itemType,
          itemName: item.itemName,
          quantity: item.quantity,
          unit: item.unit,
        })),
      });
    }

    /**
     * Step 5: Deduct inventory
     * Add your inventory deduction logic here later.
     *
     * Example idea:
     * - find inventory item by itemName
     * - decrement stock quantity
     * - save transaction log
     */

    return {
      customer,
      order,
    };
  });
}