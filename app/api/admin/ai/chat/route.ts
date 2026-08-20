import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";
import { deepseek } from "@/lib/deepseek";
import { analyzeQuestion } from "@/lib/ai-query-analyzer";
import {
  fetchFinancialData,
  fetchInventoryData,
  fetchProductData,
  fetchOrderData,
  fetchOperationsData,
  type TimeRange,
} from "@/lib/ai-data-fetchers";

export async function GET(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const userId = auth.userId;

  try {
    const searchParams = req.nextUrl.searchParams;
    const range = searchParams.get("range"); // "7d" | "30d" | null
    const sessionId = searchParams.get("sessionId");

    // If a specific sessionId is requested, return that session's messages —
    // but only if the session belongs to the requesting admin (prevents IDOR).
    if (sessionId) {
      const owned = await prisma.aIChatSession.findFirst({
        where: { id: sessionId, userId: userId ?? null },
        select: { id: true },
      });

      if (!owned) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }

      const messages = await prisma.aIChatMessage.findMany({
        where: { sessionId },
        orderBy: { createdAt: "asc" },
        take: 200,
      });

      return NextResponse.json(
        {
          messages: messages.map((m) => ({
            id: m.id,
            role: m.role === "assistant" ? "assistant" : "user",
            content: m.content,
            createdAt: m.createdAt.toISOString(),
          })),
        },
        { status: 200 },
      );
    }

    // Otherwise, return a list of sessions for the current user (or anon).
    const whereSession: any = userId ? { userId } : { userId: null };

    if (range === "7d" || range === "30d") {
      const days = range === "7d" ? 7 : 30;
      const from = new Date();
      from.setDate(from.getDate() - (days - 1));
      whereSession.updatedAt = { gte: from };
    }

    const sessions = await prisma.aIChatSession.findMany({
      where: whereSession,
      orderBy: { updatedAt: "desc" },
      take: 50,
      include: {
        messages: {
          select: { content: true, role: true, createdAt: true },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
        _count: { select: { messages: true } },
      },
    });

    return NextResponse.json(
      {
        sessions: sessions.map((s) => ({
          id: s.id,
          title:
            s.title ||
            (s.messages[0]
              ? s.messages[0].content.slice(0, 60)
              : "Conversation"),
          lastMessageAt: s.updatedAt.toISOString(),
          messageCount: s._count.messages,
          lastSnippet: s.messages[0]?.content.slice(0, 80) ?? "",
        })),
      },
      { status: 200 },
    );
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("AI chat history error:", error);
    }
    return NextResponse.json(
      { error: "Failed to load AI chat history" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const userId = auth.userId;

  try {
    const body = await req.json();
    const { message, sessionId, reset } = body as {
      message?: string;
      sessionId?: string;
      reset?: boolean;
    };

    if (!message || !message.trim()) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 },
      );
    }

    // Respect the System Settings toggle — don't spend on the LLM if disabled.
    const settingsRow = await prisma.setting.findUnique({
      where: { key: "general" },
      select: { value: true },
    });
    if ((settingsRow?.value as any)?.enableAiAssistant === false) {
      return NextResponse.json(
        { error: "The AI Assistant is disabled in System Settings." },
        { status: 403 },
      );
    }

    // Analyze the question to determine what data to fetch
    const intent = analyzeQuestion(message);
    let timeRange: TimeRange = (intent.timeRange as TimeRange) ?? "30d";
    const compareRange: TimeRange | null = intent.compareRange
      ? (intent.compareRange as TimeRange)
      : null;

    // Debug logging
    if (process.env.NODE_ENV === "development") {
      console.log("AI Query Analysis:", {
        message,
        category: intent.category,
        timeRange,
        compareRange,
        comparison: intent.comparison,
        entities: intent.entities,
      });
    }

    // Fetch data based on question intent
    let relevantData: any = null;
    let dataContext = "";

    try {
      switch (intent.category) {
        case "financial":
          let financialData = await fetchFinancialData(timeRange);
          let comparisonData = null;
          
          // If data shows $0.00 and user asked about expenses/revenue, try "all time" as fallback
          if ((financialData.revenue === 0 && financialData.expenses === 0) && 
              (message.toLowerCase().includes("expense") || message.toLowerCase().includes("revenue") || 
               message.toLowerCase().includes("all time") || message.toLowerCase().includes("total"))) {
            // Try fetching all time data
            const allTimeData = await fetchFinancialData("all");
            if (allTimeData.revenue > 0 || allTimeData.expenses > 0) {
              financialData = allTimeData;
              timeRange = "all" as TimeRange;
            }
          }
          
          // Fetch comparison data if requested
          if (intent.comparison && compareRange) {
            // If compareRange equals timeRange, fetch previous period of same length
            if (compareRange === timeRange) {
              comparisonData = await fetchFinancialData(compareRange, true); // previousPeriod = true
            } else {
              comparisonData = await fetchFinancialData(compareRange);
            }
          }
          
          relevantData = { current: financialData, comparison: comparisonData };
          
          dataContext = `FINANCIAL DATA FOR ${timeRange.toUpperCase()} PERIOD:\n` +
            `REVENUE: $${financialData.revenue.toFixed(2)}\n` +
            `ORDERS COUNT: ${financialData.orders}\n` +
            `AVERAGE ORDER VALUE: $${financialData.aov.toFixed(2)}\n` +
            `COGS: $${financialData.cogs.toFixed(2)}\n` +
            `GROSS PROFIT: $${financialData.grossProfit.toFixed(2)} (${financialData.grossMargin.toFixed(1)}% margin)\n` +
            `TOTAL EXPENSES: $${financialData.expenses.toFixed(2)}\n` +
            `NET PROFIT: $${financialData.netProfit.toFixed(2)} (${financialData.netMargin.toFixed(1)}% margin)\n` +
            `CUSTOMERS: ${financialData.customers.total} total, ${financialData.customers.active} active, ${financialData.customers.repeat} repeat (${financialData.customers.repeatRate.toFixed(1)}% rate)\n` +
            (financialData.expensesByCategory.length > 0
              ? `\nEXPENSES BY CATEGORY:\n${financialData.expensesByCategory
                  .map((e: any) => `  ${e.category}: $${e.amount.toFixed(2)}`)
                  .join("\n")}\n`
              : financialData.expenses === 0 
                ? `\nEXPENSES BY CATEGORY: No expenses recorded in ${timeRange} period.\n`
                : `\nEXPENSES BY CATEGORY: Category breakdown not available.\n`) +
            (comparisonData
              ? `\nCOMPARISON DATA FOR ${(compareRange ?? "").toUpperCase()} PERIOD:\n` +
                `REVENUE: $${comparisonData.revenue.toFixed(2)} vs CURRENT: $${financialData.revenue.toFixed(2)} (${financialData.revenue > comparisonData.revenue ? "+" : ""}${((financialData.revenue - comparisonData.revenue) / (comparisonData.revenue || 1) * 100).toFixed(1)}% change)\n` +
                `ORDERS: ${comparisonData.orders} vs CURRENT: ${financialData.orders} (${financialData.orders > comparisonData.orders ? "+" : ""}${financialData.orders - comparisonData.orders} change)\n` +
                `NET PROFIT: $${comparisonData.netProfit.toFixed(2)} vs CURRENT: $${financialData.netProfit.toFixed(2)} (${financialData.netProfit > comparisonData.netProfit ? "+" : ""}${((financialData.netProfit - comparisonData.netProfit) / (Math.abs(comparisonData.netProfit) || 1) * 100).toFixed(1)}% change)\n`
              : "") +
            (financialData.itemsWithoutCOGS > 0
              ? `\nNote: ${financialData.itemsWithoutCOGS} order items don't have COGS data yet.\n`
              : "");
          break;

        case "inventory":
          relevantData = await fetchInventoryData();
          const lowStockCritical = relevantData.lowStockItems.filter(
            (item: any) => item.available <= 5,
          );
          dataContext = `INVENTORY DATA:\n` +
            `TOTAL PRODUCTS: ${relevantData.totalProducts}\n` +
            `TOTAL VARIANTS: ${relevantData.totalVariants}\n` +
            `LOW STOCK ITEMS (≤10 units): ${relevantData.lowStockCount}\n` +
            `TOTAL INVENTORY VALUE: $${relevantData.totalStockValue.toFixed(2)}\n` +
            (lowStockCritical.length > 0
              ? `CRITICAL LOW STOCK (≤5 available): ${lowStockCritical.length} items\n`
              : "") +
            (relevantData.lowStockItems.length > 0
              ? `\nLOW STOCK DETAILS:\n${relevantData.lowStockItems
                  .slice(0, 15)
                  .map(
                    (item: any) =>
                      `  ${item.productName} (${item.size}/${item.color}): ${item.available} available (${item.stock} stock, ${item.reserved} reserved)${item.available <= 5 ? " [CRITICAL]" : ""}`,
                  )
                  .join("\n")}\n`
              : `\nLOW STOCK ITEMS: None (all products have sufficient stock)\n`) +
            (relevantData.products && relevantData.products.length > 0
              ? `\nALL PRODUCTS INVENTORY:\n${relevantData.products
                  .slice(0, 10)
                  .map(
                    (p: any) =>
                      `  ${p.name}: ${p.variants.length} variants, total available: ${p.variants.reduce((sum: number, v: any) => sum + v.available, 0)} units`,
                  )
                  .join("\n")}\n`
              : "");
          break;

        case "products":
          // Extract product name from entities if available
          const productName = intent.entities?.[0];
          relevantData = await fetchProductData(productName);
          
          if (productName && relevantData.length === 0) {
            // Try to get all products to suggest alternatives
            const allProducts = await fetchProductData();
            const suggestions = allProducts.slice(0, 5).map((p: any) => p.name);
            
            dataContext = `PRODUCT SEARCH:\n` +
              `No products found matching "${productName}".\n` +
              (suggestions.length > 0
                ? `Available products in system (${allProducts.length} total). Did you mean one of these?\n${suggestions.map((s: string) => `  - ${s}`).join("\n")}\n`
                : `No products found in the system.\n`);
          } else {
            const product = relevantData[0];
            dataContext = `PRODUCT DATA${productName ? ` (search: "${productName}")` : ""}:\n` +
              `TOTAL PRODUCTS FOUND: ${relevantData.length}\n` +
              (relevantData.length > 0
                ? `\nPRODUCT DETAILS:\n` +
                  relevantData
                    .slice(0, 10)
                    .map(
                      (p: any) =>
                        `PRODUCT NAME: ${p.name}\n` +
                        `PRICE: $${p.price.toFixed(2)}\n` +
                        `CATEGORY: ${p.category}\n` +
                        `TOTAL STOCK: ${p.totalStock} units\n` +
                        `RESERVED: ${p.totalReserved} units\n` +
                        `AVAILABLE: ${p.totalAvailable} units\n` +
                        `VARIANTS COUNT: ${p.variants.length}\n` +
                        (p.cogs 
                          ? `COGS: $${p.cogs.totalCOGS.toFixed(2)}\n` +
                            `GROSS PROFIT: $${p.cogs.grossProfit.toFixed(2)}\n` +
                            `MARGIN: ${p.cogs.grossMargin.toFixed(1)}%\n`
                          : `COGS: No COGS data available\n`) +
                        (p.variants.length > 0
                          ? `VARIANTS:\n${p.variants
                              .slice(0, 8)
                              .map(
                                (v: any) =>
                                  `  ${v.size}/${v.color}: ${v.available} available (${v.stock} stock, ${v.reserved} reserved)${v.isLowStock ? " [LOW STOCK]" : ""}`,
                              )
                              .join("\n")}\n`
                          : "") +
                        `---\n`,
                    )
                    .join("\n")
                : `No products found in the system.\n`);
          }
          break;

        case "orders":
          const orderData = await fetchOrderData(timeRange);
          relevantData = orderData;
          
          // Check if looking for specific order
          const orderNumber = intent.entities?.find((e) =>
            /^[A-Z0-9-]+$/i.test(e),
          );
          
          if (orderNumber) {
            // Search across all time if specific order requested
            const allOrders = await fetchOrderData("all");
            const foundOrder = allOrders.orders.find((o: any) =>
              o.orderNumber.toUpperCase().includes(orderNumber.toUpperCase()),
            );
            
            dataContext = `ORDER SEARCH:\n` +
              `Searching for order: ${orderNumber}\n` +
              (foundOrder
                ? `Found: ${foundOrder.orderNumber} - $${foundOrder.total.toFixed(2)} (${foundOrder.itemCount} items, ${foundOrder.status}, ${new Date(foundOrder.createdAt).toLocaleDateString()})\n`
                : `Order "${orderNumber}" not found in system.\n` +
                  (allOrders.orders.length > 0
                    ? `Recent orders in system:\n${allOrders.orders
                        .slice(0, 5)
                        .map(
                          (o: any) =>
                            `  - ${o.orderNumber}: $${o.total.toFixed(2)} (${o.status})`,
                        )
                        .join("\n")}\n`
                    : ""));
          } else {
            dataContext = `ORDER DATA (${timeRange}):\n` +
              `Total Orders: ${orderData.totalOrders}\n` +
              (orderData.orders.length > 0
                ? `Recent Orders:\n${orderData.orders
                    .slice(0, 10)
                    .map(
                      (o: any) =>
                        `  - ${o.orderNumber}: $${o.total.toFixed(2)} (${o.itemCount} items, ${o.status}, ${new Date(o.createdAt).toLocaleDateString()})`,
                    )
                    .join("\n")}\n`
                : `No orders found in ${timeRange} period.\n`);
          }
          break;

        case "analytics":
          // For analytics, fetch multiple data sources for comparison/trends
          const [analyticsFinancial, analyticsInventory, analyticsProducts] =
            await Promise.all([
              fetchFinancialData(timeRange),
              fetchInventoryData(),
              fetchProductData(),
            ]);
          
          // If comparison requested, fetch previous period
          let analyticsComparison = null;
          if (intent.comparison && compareRange) {
            // If compareRange equals timeRange, fetch previous period of same length
            if (compareRange === timeRange) {
              analyticsComparison = await fetchFinancialData(compareRange, true); // previousPeriod = true
            } else {
              analyticsComparison = await fetchFinancialData(compareRange);
            }
          }
          
          relevantData = {
            financial: analyticsFinancial,
            inventory: analyticsInventory,
            products: analyticsProducts,
            comparison: analyticsComparison,
          };
          
          dataContext = `ANALYTICS DATA (${timeRange}):\n` +
            `FINANCIAL:\n` +
            `  Revenue: $${analyticsFinancial.revenue.toFixed(2)}\n` +
            `  Orders: ${analyticsFinancial.orders}\n` +
            `  AOV: $${analyticsFinancial.aov.toFixed(2)}\n` +
            `  Gross Profit: $${analyticsFinancial.grossProfit.toFixed(2)} (${analyticsFinancial.grossMargin.toFixed(1)}% margin)\n` +
            `  Net Profit: $${analyticsFinancial.netProfit.toFixed(2)} (${analyticsFinancial.netMargin.toFixed(1)}% margin)\n` +
            `  Active Customers: ${analyticsFinancial.customers.active}\n` +
            `  Repeat Rate: ${analyticsFinancial.customers.repeatRate.toFixed(1)}%\n` +
            `INVENTORY:\n` +
            `  Total Products: ${analyticsInventory.totalProducts}\n` +
            `  Low Stock Items: ${analyticsInventory.lowStockCount}\n` +
            `  Inventory Value: $${analyticsInventory.totalStockValue.toFixed(2)}\n` +
            `PRODUCTS:\n` +
            `  Total Products: ${analyticsProducts.length}\n` +
            `  Products with COGS: ${analyticsProducts.filter((p: any) => p.cogs).length}\n` +
            (analyticsComparison
              ? `\nCOMPARISON (${compareRange}):\n` +
                `  Revenue: $${analyticsComparison.revenue.toFixed(2)} vs $${analyticsFinancial.revenue.toFixed(2)} (${((analyticsFinancial.revenue - analyticsComparison.revenue) / (analyticsComparison.revenue || 1) * 100).toFixed(1)}% change)\n` +
                `  Orders: ${analyticsComparison.orders} vs ${analyticsFinancial.orders} (${analyticsFinancial.orders - analyticsComparison.orders > 0 ? "+" : ""}${analyticsFinancial.orders - analyticsComparison.orders})\n` +
                `  Net Profit: $${analyticsComparison.netProfit.toFixed(2)} vs $${analyticsFinancial.netProfit.toFixed(2)}\n`
              : "");
          break;

        case "operations":
          relevantData = await fetchOperationsData();
          dataContext = `OPERATIONS DATA:\n` +
            `Suppliers: ${relevantData.totalSuppliers}\n` +
            `Active Purchase Orders: ${relevantData.activePOs}\n` +
            (relevantData.suppliers.length > 0
              ? `Suppliers:\n${relevantData.suppliers
                  .slice(0, 5)
                  .map(
                    (s: any) =>
                      `  - ${s.name} (${s.country}) - Quality: ${s.qualityRating ?? "N/A"}, On-time: ${s.onTimeRate ? `${s.onTimeRate}%` : "N/A"}`,
                  )
                  .join("\n")}\n`
              : "");
          break;

        default:
          // For general questions, try to infer intent from the question
          // If question mentions revenue/profit/expenses, use financial
          // If question mentions products/items, use products
          // Otherwise, provide minimal overview
          const lowerMessage = message.toLowerCase();
          if (lowerMessage.includes("revenue") || lowerMessage.includes("profit") || 
              lowerMessage.includes("expense") || lowerMessage.includes("money") ||
              lowerMessage.includes("earnings") || lowerMessage.includes("income")) {
            // Treat as financial
            const financialData = await fetchFinancialData(timeRange);
            relevantData = financialData;
            dataContext = `FINANCIAL DATA (${timeRange}):\n` +
              `Revenue: $${financialData.revenue.toFixed(2)}\n` +
              `Orders: ${financialData.orders}\n` +
              `Net Profit: $${financialData.netProfit.toFixed(2)}\n` +
              `Expenses: $${financialData.expenses.toFixed(2)}\n` +
              (financialData.expensesByCategory.length > 0
                ? `Expenses by Category:\n${financialData.expensesByCategory
                    .map((e: any) => `  - ${e.category}: $${e.amount.toFixed(2)}`)
                    .join("\n")}\n`
                : "");
          } else if (lowerMessage.includes("product") || lowerMessage.includes("item") ||
                     lowerMessage.includes("show me") || lowerMessage.includes("tell me about")) {
            // Treat as products
            const productName = intent.entities?.[0];
            relevantData = await fetchProductData(productName);
            dataContext = `PRODUCT DATA${productName ? ` (search: "${productName}")` : ""}:\n` +
              `Total Products Found: ${relevantData.length}\n` +
              (relevantData.length > 0
                ? `Products:\n${relevantData
                    .slice(0, 10)
                    .map(
                      (p: any) =>
                        `  - ${p.name} ($${p.price.toFixed(2)}) - Category: ${p.category}, Total Stock: ${p.totalAvailable} available`,
                    )
                    .join("\n")}\n`
                : `No products found.\n`);
          } else {
            // Minimal overview only
            const basicFinancial = await fetchFinancialData("30d");
            relevantData = basicFinancial;
            dataContext = `SYSTEM OVERVIEW (30d):\n` +
              `Revenue: $${basicFinancial.revenue.toFixed(2)}\n` +
              `Orders: ${basicFinancial.orders}\n` +
              `Net Profit: $${basicFinancial.netProfit.toFixed(2)}\n`;
          }
      }
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.error("Error fetching data for AI:", error);
      }
      // Set error context if fetch fails
      dataContext = `ERROR: Unable to fetch data for this question. The system may be experiencing issues or the requested data may not be available.\n\nQuestion category detected: ${intent.category}\nTime range: ${timeRange}\n\nPlease try rephrasing your question or contact support if the issue persists.`;
      relevantData = null;
    }

    // Find or create a chat session. Scope the lookup to the requesting admin
    // so a supplied sessionId can never append to someone else's session.
    let chatSession =
      !reset && sessionId
        ? await prisma.aIChatSession.findFirst({
            where: { id: sessionId, userId: userId ?? null },
          })
        : null;

    if (!chatSession) {
      chatSession = await prisma.aIChatSession.create({
        data: {
          userId,
          title: message.slice(0, 80),
        },
      });
    }

    // Save user message into this session
    await prisma.aIChatMessage.create({
      data: {
        userId,
        sessionId: chatSession.id,
        role: "user",
        content: message,
      },
    });

    // Load recent history (last 10 messages) for this session - reduced to prevent confusion
    const history = await prisma.aIChatMessage.findMany({
      where: { sessionId: chatSession.id },
      orderBy: { createdAt: "asc" },
      take: 10,
    });

    // Validate data and provide helpful context
    const hasData = dataContext && !dataContext.includes("ERROR");
    const isEmpty = dataContext && 
      (dataContext.includes("$0.00") || 
       dataContext.includes("0 orders") ||
       dataContext.includes("No products") ||
       dataContext.includes("No orders"));

    // Determine what the question is asking about
    const lowerMessage = message.toLowerCase();
    const isRevenueQuestion = lowerMessage.includes("revenue") || lowerMessage.includes("sales") || lowerMessage.includes("income");
    const isExpenseQuestion = lowerMessage.includes("expense") || lowerMessage.includes("spending") || lowerMessage.includes("cost");
    const isProductQuestion = lowerMessage.includes("product") || lowerMessage.includes("item") || lowerMessage.includes("show me") || lowerMessage.includes("tell me about");
    const isInventoryQuestion = lowerMessage.includes("inventory") || lowerMessage.includes("stock") || lowerMessage.includes("low stock") || lowerMessage.includes("restock");
    
    // Build enhanced system prompt with explicit topic restrictions
    let systemContent = `You are an AI business analyst assistant. Answer the user's question using ONLY the exact numbers and data provided below.

CRITICAL RULES - FOLLOW THESE EXACTLY:
1. The user asked: "${message}"
2. ${isRevenueQuestion ? "THIS QUESTION IS ABOUT REVENUE/SALES. You MUST answer with the EXACT revenue number from the data. DO NOT mention inventory, products, or expenses unless the question asks for them." : ""}
3. ${isExpenseQuestion ? "THIS QUESTION IS ABOUT EXPENSES. You MUST answer with the EXACT expense numbers from the data. If the data shows 'EXPENSES BY CATEGORY', list each category and its amount. DO NOT mention inventory, revenue, or products unless the question asks for them." : ""}
4. ${isProductQuestion ? "THIS QUESTION IS ABOUT PRODUCTS. You MUST answer with the EXACT product information from the data. Include price, variants, stock levels, COGS if available. DO NOT mention inventory, revenue, or expenses unless the question asks for them." : ""}
5. ${isInventoryQuestion ? "THIS QUESTION IS ABOUT INVENTORY. You MUST answer with the EXACT inventory numbers from the data. Include total products, variants, low stock items, inventory value." : ""}
6. ${!isInventoryQuestion ? "DO NOT mention inventory, restocking, or stock levels unless the question specifically asks about them." : ""}
7. Use ONLY the data shown in the "DATA" section below - copy the exact numbers
8. If the data shows "REVENUE: $X.XX", say "Revenue is $X.XX"
9. If the data shows "EXPENSES BY CATEGORY" with a list, list each category and amount
10. If the data shows "TOTAL PRODUCTS: X", say "You have X products"
11. Use plain text only - NO markdown formatting (no asterisks, bullets, symbols, dashes for lists)
12. Write in complete sentences
13. If data shows $0.00 or 0, say that clearly - don't make up numbers

${hasData ? `\nEXACT DATA FOR THIS QUESTION:\n${dataContext}\n` : "\nNote: Limited data available.\n"}

${isEmpty ? "\nThe data shows mostly zeros. This suggests the system is new or data hasn't been entered yet.\n" : ""}

USER QUESTION: "${message}"

Answer this question using ONLY the exact numbers from the data above. Copy the numbers exactly as shown. If the data shows "REVENUE: $1,234.56", say "Revenue is $1,234.56". If the data shows "EXPENSES BY CATEGORY" with a list, list each category and amount. DO NOT talk about topics not in the question.`;

    // Build messages - put system prompt first, then only recent relevant history
    // Limit history to prevent confusion from previous unrelated questions
    const recentHistory = history.slice(-4); // Only last 4 messages to maintain context without confusion
    
    const messages = [
      {
        role: "system" as const,
        content: systemContent,
      },
      ...recentHistory.map((m) => ({
        role: m.role === "assistant" ? ("assistant" as const) : ("user" as const),
        content: m.content,
      })),
      {
        role: "user" as const,
        content: message,
      },
    ];

    const response = await deepseek.chat({
      messages,
      max_tokens: 1000,
      temperature: 0.3, // Lower temperature for more focused, less creative responses
    });

    let reply =
      response.choices[0]?.message?.content?.trim() ??
      "I was unable to generate a response.";

    // Remove markdown formatting
    reply = reply
      .replace(/\*\*([^*]+)\*\*/g, "$1") // Remove **bold**
      .replace(/\*([^*]+)\*/g, "$1") // Remove *italic*
      .replace(/^[-*+]\s+/gm, "") // Remove bullet points
      .replace(/^\d+\.\s+/gm, "") // Remove numbered lists
      .replace(/`([^`]+)`/g, "$1") // Remove code backticks
      .replace(/#{1,6}\s+/g, "") // Remove markdown headers
      .replace(/\n{3,}/g, "\n\n") // Normalize multiple newlines
      .trim();

    // Validate response is on-topic (basic check)
    const replyLower = reply.toLowerCase();
    const messageLower = message.toLowerCase();
    
    // If question is about revenue/expenses but response talks about inventory/restocking, it's wrong
    if ((messageLower.includes("revenue") || messageLower.includes("expense") || messageLower.includes("profit")) &&
        (replyLower.includes("restock") || replyLower.includes("inventory manager") || replyLower.includes("low stock items"))) {
      // Response is off-topic - regenerate with stricter prompt
      if (process.env.NODE_ENV === "development") {
        console.warn("AI response was off-topic, attempting correction...");
      }
      
      // Try once more with even stricter prompt
      const strictPrompt = `${systemContent}\n\nIMPORTANT: Your previous response was off-topic. The question is about ${isRevenueQuestion ? "REVENUE" : isExpenseQuestion ? "EXPENSES" : "FINANCIAL DATA"}. Answer ONLY with ${isRevenueQuestion ? "revenue" : isExpenseQuestion ? "expense" : "financial"} data from above. DO NOT mention inventory, restocking, or stock levels.`;
      
      const retryResponse = await deepseek.chat({
        messages: [
          { role: "system" as const, content: strictPrompt },
          { role: "user" as const, content: message },
        ],
        max_tokens: 500,
        temperature: 0.2, // Even lower temperature
      });
      
      reply = retryResponse.choices[0]?.message?.content?.trim() ?? reply;
      
      // Remove markdown again
      reply = reply
        .replace(/\*\*([^*]+)\*\*/g, "$1")
        .replace(/\*([^*]+)\*/g, "$1")
        .replace(/^[-*+]\s+/gm, "")
        .replace(/^\d+\.\s+/gm, "")
        .replace(/`([^`]+)`/g, "$1")
        .replace(/#{1,6}\s+/g, "")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
    }

    await prisma.aIChatMessage.create({
      data: {
        userId,
        sessionId: chatSession.id,
        role: "assistant",
        content: reply,
      },
    });

    // Log external API usage for cost tracking
    try {
      const promptTokens = response.usage?.prompt_tokens ?? null;
      const completionTokens = response.usage?.completion_tokens ?? null;
      const totalTokens =
        (promptTokens ?? 0) + (completionTokens ?? 0) || null;

      // DeepSeek publishes separate pricing per 1M input and output tokens.
      // We use env vars so owners can keep this in sync with the official page.
      const inputPer1mRaw = process.env.DEEPSEEK_INPUT_PRICE_PER_1M_USD;
      const outputPer1mRaw = process.env.DEEPSEEK_OUTPUT_PRICE_PER_1M_USD;

      let estimatedCost: number | null = null;
      if (
        promptTokens != null &&
        completionTokens != null &&
        inputPer1mRaw &&
        outputPer1mRaw
      ) {
        const inputPer1m = parseFloat(inputPer1mRaw);
        const outputPer1m = parseFloat(outputPer1mRaw);

        if (
          !Number.isNaN(inputPer1m) &&
          !Number.isNaN(outputPer1m) &&
          inputPer1m >= 0 &&
          outputPer1m >= 0
        ) {
          const inputRatePerToken = inputPer1m / 1_000_000;
          const outputRatePerToken = outputPer1m / 1_000_000;

          estimatedCost =
            promptTokens * inputRatePerToken +
            completionTokens * outputRatePerToken;
        }
      }

      await prisma.apiCall.create({
        data: {
          service: "deepseek",
          platform: "AI",
          operation: "chat",
          units: totalTokens ?? undefined,
          unitType: "tokens",
          estimatedCost: estimatedCost ?? undefined,
          currency: "USD",
          meta: {
            source: "admin-ai-assistant",
            model: response.model,
          },
        },
      });
    } catch (e) {
      if (process.env.NODE_ENV === "development") {
        console.error("Failed to log DeepSeek API call:", e);
      }
    }

    return NextResponse.json(
      { reply, sessionId: chatSession.id },
      { status: 200 },
    );
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("AI chat error:", error);
    }
    return NextResponse.json(
      { error: "Failed to process AI chat" },
      { status: 500 },
    );
  }
}

