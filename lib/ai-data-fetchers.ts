/**
 * Specialized data fetchers for AI Assistant queries
 */

import { prisma } from "@/lib/prisma";

export type TimeRange = "today" | "7d" | "30d" | "month" | "ytd" | "all";

function getDateRange(range: TimeRange, previousPeriod: boolean = false): { start: Date; end: Date } {
  const end = new Date();
  const start = new Date();

  switch (range) {
    case "today":
      if (previousPeriod) {
        // Previous day
        start.setDate(start.getDate() - 1);
        start.setHours(0, 0, 0, 0);
        end.setDate(end.getDate() - 1);
        end.setHours(23, 59, 59, 999);
      } else {
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
      }
      break;
    case "7d":
      if (previousPeriod) {
        // Previous 7 days (days 8-14 ago)
        start.setDate(start.getDate() - 13);
        start.setHours(0, 0, 0, 0);
        end.setDate(end.getDate() - 7);
        end.setHours(23, 59, 59, 999);
      } else {
        start.setDate(start.getDate() - 6);
        start.setHours(0, 0, 0, 0);
      }
      break;
    case "30d":
      if (previousPeriod) {
        // Previous 30 days (days 31-60 ago)
        start.setDate(start.getDate() - 59);
        start.setHours(0, 0, 0, 0);
        end.setDate(end.getDate() - 30);
        end.setHours(23, 59, 59, 999);
      } else {
        start.setDate(start.getDate() - 29);
        start.setHours(0, 0, 0, 0);
      }
      break;
    case "month":
      if (previousPeriod) {
        // Previous calendar month
        start.setMonth(start.getMonth() - 1, 1);
        start.setHours(0, 0, 0, 0);
        // Set end to last day of that month
        const lastDayOfMonth = new Date(start.getFullYear(), start.getMonth() + 1, 0, 23, 59, 59, 999);
        end.setTime(lastDayOfMonth.getTime());
      } else {
        // Current calendar month
        start.setDate(1);
        start.setHours(0, 0, 0, 0);
        // Set end to last day of current month
        const lastDayOfMonth = new Date(start.getFullYear(), start.getMonth() + 1, 0, 23, 59, 59, 999);
        end.setTime(lastDayOfMonth.getTime());
      }
      break;
    case "ytd":
      if (previousPeriod) {
        // Previous year
        start.setFullYear(start.getFullYear() - 1, 0, 1);
        start.setHours(0, 0, 0, 0);
        end.setFullYear(end.getFullYear() - 1, 11, 31);
        end.setHours(23, 59, 59, 999);
      } else {
        start.setMonth(0, 1);
        start.setHours(0, 0, 0, 0);
      }
      break;
    case "all":
      start.setFullYear(2020, 0, 1); // Far back date
      break;
  }

  return { start, end };
}

export async function fetchFinancialData(range: TimeRange, previousPeriod: boolean = false) {
  const { start, end } = getDateRange(range, previousPeriod);

  const [
    revenueData,
    ordersData,
    expensesData,
    cogsData,
    allTimeExpenses,
    customersData,
    repeatCustomersData,
  ] = await Promise.all([
    // Revenue from orders
    prisma.order.aggregate({
      _sum: { total: true, subtotal: true, shipping: true, tax: true },
      _count: { id: true },
      where: {
        status: { notIn: ["CANCELLED", "REFUNDED"] },
        createdAt: { gte: start, lte: end },
      },
    }),
    // Order details
    prisma.order.findMany({
      where: {
        status: { notIn: ["CANCELLED", "REFUNDED"] },
        createdAt: { gte: start, lte: end },
      },
      include: {
        items: {
          include: {
            product: {
              include: {
                cogs: {
                  orderBy: { effectiveDate: "desc" },
                  take: 1,
                },
              },
            },
          },
        },
      },
      take: 100, // Limit for performance
    }),
    // Expenses
    prisma.expense.aggregate({
      _sum: { amount: true },
      _count: { id: true },
      where: { date: { gte: start, lte: end } },
    }),
    // Expenses by category
    prisma.expense.groupBy({
      by: ["category"],
      _sum: { amount: true },
      where: { date: { gte: start, lte: end } },
    }),
    // All-time expenses for context
    prisma.expense.aggregate({
      _sum: { amount: true },
    }),
    // Customer data
    prisma.user.count({ where: { role: "CUSTOMER" } }),
    // Repeat customers
    prisma.order.groupBy({
      by: ["userId"],
      _count: { _all: true },
      where: {
        status: { notIn: ["CANCELLED", "REFUNDED"] },
        createdAt: { gte: start, lte: end },
      },
    }),
  ]);

  // Calculate real COGS from order items
  let totalCOGS = 0;
  let totalRevenue = revenueData._sum.total ?? 0;
  let itemsWithCOGS = 0;
  let itemsWithoutCOGS = 0;

  for (const order of ordersData) {
    for (const item of order.items) {
      const quantity = item.quantity;
      const latestCOGS = item.product.cogs?.[0];
      if (latestCOGS) {
        totalCOGS += latestCOGS.totalCOGS * quantity;
        itemsWithCOGS += quantity;
      } else {
        itemsWithoutCOGS += quantity;
      }
    }
  }

  const grossProfit = totalRevenue - totalCOGS;
  const grossMargin =
    totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;
  const expensesTotal = expensesData._sum.amount ?? 0;
  const netProfit = grossProfit - expensesTotal;
  const netMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

  // Customer metrics
  const totalCustomers = customersData;
  const activeCustomers = repeatCustomersData.length;
  const repeatCustomers = repeatCustomersData.filter(
    (c) => c._count._all >= 2,
  ).length;
  const repeatRate =
    activeCustomers > 0 ? (repeatCustomers / activeCustomers) * 100 : 0;

  return {
    revenue: totalRevenue,
    orders: revenueData._count.id,
    aov: revenueData._count.id > 0 ? totalRevenue / revenueData._count.id : 0,
    subtotal: revenueData._sum.subtotal ?? 0,
    shipping: revenueData._sum.shipping ?? 0,
    tax: revenueData._sum.tax ?? 0,
    cogs: totalCOGS,
    itemsWithCOGS,
    itemsWithoutCOGS,
    grossProfit,
    grossMargin,
    expenses: expensesTotal,
    expensesByCategory: cogsData.map((c) => ({
      category: c.category,
      amount: c._sum.amount ?? 0,
    })),
    netProfit,
    netMargin,
    allTimeExpenses: allTimeExpenses._sum.amount ?? 0,
    customers: {
      total: totalCustomers,
      active: activeCustomers,
      repeat: repeatCustomers,
      repeatRate,
    },
    timeRange: { start, end },
  };
}

export async function fetchInventoryData() {
  const [products, variants, lowStock] = await Promise.all([
    prisma.product.findMany({
      include: {
        variants: {
          include: {
            stockHistory: {
              orderBy: { createdAt: "desc" },
              take: 5,
            },
          },
        },
      },
    }),
    prisma.productVariant.findMany({
      where: {
        OR: [{ stock: { lte: 10 } }, { reserved: { gte: 1 } }],
      },
      include: {
        product: true,
      },
      orderBy: { stock: "asc" },
    }),
    prisma.productVariant.count({
      where: { stock: { lte: 10 } },
    }),
  ]);

  // Totals must reflect ALL variants, not just the low-stock/reserved subset.
  const allVariants = products.flatMap((p) =>
    p.variants.map((v) => ({ stock: v.stock, price: p.price })),
  );
  const totalVariants = allVariants.length;
  const totalStockValue = allVariants.reduce(
    (sum, v) => sum + v.stock * (v.price ?? 0),
    0,
  );

  return {
    totalProducts: products.length,
    totalVariants,
    lowStockCount: lowStock,
    lowStockItems: variants.map((v) => ({
      productName: v.product?.name ?? "Unknown",
      variantId: v.id,
      size: v.size,
      color: v.color,
      stock: v.stock,
      reserved: v.reserved,
      available: v.stock - v.reserved,
    })),
    totalStockValue,
    products: products.map((p) => ({
      id: p.id,
      name: p.name,
      category: p.category,
      variants: p.variants.map((v) => ({
        size: v.size,
        color: v.color,
        stock: v.stock,
        reserved: v.reserved,
        available: v.stock - v.reserved,
      })),
    })),
  };
}

export async function fetchProductData(productName?: string) {
  // Clean and normalize product name for better matching
  const normalizedName = productName?.trim().toLowerCase();
  
  const where = normalizedName
    ? {
        OR: [
          { name: { contains: normalizedName, mode: "insensitive" as const } },
          { slug: { contains: normalizedName, mode: "insensitive" as const } },
          { category: { contains: normalizedName, mode: "insensitive" as const } },
          // Also try matching individual words for better fuzzy matching
          ...(normalizedName.includes(" ") 
            ? normalizedName.split(" ").filter(w => w.length >= 3).map(word => ({
                name: { contains: word, mode: "insensitive" as const },
              }))
            : []),
        ],
      }
    : {};

  const products = await prisma.product.findMany({
    where,
    include: {
      variants: {
        orderBy: { stock: "desc" },
      },
      cogs: {
        orderBy: { effectiveDate: "desc" },
        take: 1,
      },
    },
    orderBy: productName
      ? [
          // Prioritize exact matches, then name matches, then category matches
          { name: "asc" as const },
          { createdAt: "desc" as const },
        ]
      : [{ createdAt: "desc" as const }],
    take: normalizedName ? 10 : 20, // More results for better matching
  });
  
  // If we have a search term and results, try to rank by relevance
  if (normalizedName && products.length > 0) {
    products.sort((a, b) => {
      const aName = a.name.toLowerCase();
      const bName = b.name.toLowerCase();
      
      // Exact match gets highest priority
      if (aName === normalizedName) return -1;
      if (bName === normalizedName) return 1;
      
      // Starts with search term
      if (aName.startsWith(normalizedName)) return -1;
      if (bName.startsWith(normalizedName)) return 1;
      
      // Contains search term
      if (aName.includes(normalizedName)) return -1;
      if (bName.includes(normalizedName)) return 1;
      
      return 0;
    });
  }

  return products.map((p) => {
    const totalStock = p.variants.reduce((sum, v) => sum + v.stock, 0);
    const totalReserved = p.variants.reduce((sum, v) => sum + v.reserved, 0);
    const totalAvailable = totalStock - totalReserved;
    
    return {
      id: p.id,
      name: p.name,
      slug: p.slug,
      price: p.price,
      compareAtPrice: p.compareAtPrice,
      category: p.category,
      inStock: p.inStock,
      featured: p.featured,
      isNew: p.isNew,
      description: p.description,
      totalStock,
      totalReserved,
      totalAvailable,
      cogs: p.cogs[0]
        ? {
            totalCOGS: p.cogs[0].totalCOGS,
            fabricCost: p.cogs[0].fabricCost,
            laborCost: p.cogs[0].laborCost,
            grossMargin:
              p.price > 0
                ? ((p.price - p.cogs[0].totalCOGS) / p.price) * 100
                : 0,
            grossProfit: p.price - p.cogs[0].totalCOGS,
          }
        : null,
      variants: p.variants.map((v) => ({
        id: v.id,
        size: v.size,
        color: v.color,
        stock: v.stock,
        reserved: v.reserved,
        available: v.stock - v.reserved,
        isLowStock: v.stock <= 10,
      })),
    };
  });
}

export async function fetchOrderData(range: TimeRange) {
  const { start, end } = getDateRange(range);

  const orders = await prisma.order.findMany({
    where: {
      createdAt: { gte: start, lte: end },
    },
    include: {
      items: {
        include: {
          product: true,
        },
      },
      user: {
        select: {
          email: true,
          name: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return {
    orders: orders.map((o) => ({
      orderNumber: o.orderNumber,
      status: o.status,
      total: o.total,
      subtotal: o.subtotal,
      shipping: o.shipping,
      tax: o.tax,
      discount: o.discount,
      createdAt: o.createdAt,
      itemCount: o.items.length,
      items: o.items.map((i) => ({
        productName: i.name,
        quantity: i.quantity,
        price: i.price,
      })),
    })),
    totalOrders: orders.length,
  };
}

export async function fetchOperationsData() {
  try {
    const [suppliers, purchaseOrders, activePOs] = await Promise.all([
      prisma.supplier.findMany({
        where: { isActive: true },
        include: {
          _count: {
            select: { purchaseOrders: true },
          },
        },
      }),
      prisma.purchaseOrder.findMany({
        include: {
          supplier: true,
          items: {
            include: {
              variant: {
                include: {
                  product: true,
                },
              },
            },
          },
        },
        orderBy: { issueDate: "desc" },
        take: 20,
      }),
      prisma.purchaseOrder.count({
        where: {
          status: { notIn: ["RECEIVED", "CANCELLED"] },
        },
      }),
    ]);

    return {
      suppliers: suppliers.map((s) => ({
        name: s.name,
        country: s.country,
        qualityRating: s.qualityRating,
        onTimeRate: s.onTimeRate,
        poCount: s._count?.purchaseOrders ?? 0,
      })),
      purchaseOrders: purchaseOrders.map((po) => ({
        poNumber: po.poNumber,
        supplier: po.supplier.name,
        status: po.status,
        total: po.total,
        issueDate: po.issueDate,
        expectedDate: po.expectedDate,
        itemCount: po.items.length,
      })),
      activePOs,
      totalSuppliers: suppliers.length,
    };
  } catch (error) {
    // Return empty data structure if fetch fails
    return {
      suppliers: [],
      purchaseOrders: [],
      activePOs: 0,
      totalSuppliers: 0,
    };
  }
}

