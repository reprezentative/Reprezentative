/**
 * Analyzes user questions to determine what data needs to be fetched
 */

export type QuestionIntent = {
  category:
    | "financial"
    | "inventory"
    | "products"
    | "orders"
    | "operations"
    | "analytics"
    | "general";
  timeRange?: "today" | "7d" | "30d" | "month" | "ytd" | "all" | "custom";
  compareRange?: "today" | "7d" | "30d" | "month" | "ytd" | "all"; // For comparisons
  specificity: "aggregate" | "detailed" | "specific";
  entities?: string[]; // Product names, order numbers, etc.
  metrics?: string[]; // revenue, profit, stock, etc.
  comparison?: boolean;
  comparisonType?: "period" | "category" | "product"; // What to compare
};

export function analyzeQuestion(question: string): QuestionIntent {
  const lower = question.toLowerCase();

  // Detect time range
  let timeRange: QuestionIntent["timeRange"] = "30d"; // default
  if (lower.includes("today") || lower.includes("this day")) {
    timeRange = "today";
  } else if (
    lower.includes("last 7 days") ||
    lower.includes("past week") ||
    lower.includes("7 days")
  ) {
    timeRange = "7d";
  } else if (lower.includes("this month") && !lower.includes("last month")) {
    // "this month" = current calendar month
    timeRange = "month";
  } else if (
    lower.includes("last 30 days") ||
    lower.includes("past month") ||
    lower.includes("30 days")
  ) {
    timeRange = "30d";
  } else if (
    lower.includes("year to date") ||
    lower.includes("ytd") ||
    lower.includes("this year")
  ) {
    timeRange = "ytd";
  } else if (
    lower.includes("all time") ||
    lower.includes("ever") ||
    lower.includes("total") ||
    lower.includes("all-time") ||
    lower === "do all time" ||
    lower.includes("all time data") ||
    lower.includes("everything")
  ) {
    timeRange = "all";
  }

  // Detect category - prioritize specific categories over general ones
  let category: QuestionIntent["category"] = "general";
  const financialKeywords = [
    "revenue",
    "profit",
    "expense",
    "cogs",
    "cost",
    "margin",
    "financial",
    "money",
    "earnings",
    "income",
    "spending",
    "expenses",
  ];
  const inventoryKeywords = [
    "inventory",
    "stock",
    "quantity",
    "available",
    "low stock",
    "out of stock",
    "reorder",
    "restock",
  ];
  const productKeywords = [
    "product",
    "item",
    "catalog",
    "sku",
    "price",
    "pricing",
    "show me",
    "tell me about",
  ];
  const orderKeywords = [
    "order",
    "purchase",
    "sale",
    "transaction",
    "customer order",
  ];
  const operationsKeywords = [
    "supplier",
    "purchase order",
    "po",
    "logistics",
    "shipping",
  ];
  const analyticsKeywords = [
    "trend",
    "growth",
    "analysis",
    "report",
  ];

  // Check for financial first (highest priority for revenue/profit/expense questions)
  // Also check for implicit financial questions (month comparisons usually mean financial)
  if (financialKeywords.some((k) => lower.includes(k))) {
    category = "financial";
  } else if ((lower.includes("compare") || lower.includes("vs") || lower.includes("versus")) && 
             (lower.includes("month") || lower.includes("week") || lower.includes("year") || 
              lower.includes("revenue") || lower.includes("profit") || lower.includes("sales"))) {
    // Comparison questions about time periods are usually financial
    category = "financial";
  } else if (inventoryKeywords.some((k) => lower.includes(k))) {
    category = "inventory";
  } else if (productKeywords.some((k) => lower.includes(k))) {
    category = "products";
  } else if (orderKeywords.some((k) => lower.includes(k))) {
    category = "orders";
  } else if (operationsKeywords.some((k) => lower.includes(k))) {
    category = "operations";
  } else if (analyticsKeywords.some((k) => lower.includes(k))) {
    category = "analytics";
  }
  
  // Handle comparisons - if it's a comparison question with financial keywords, use financial
  // Otherwise, if it has "compare", "vs", "versus", use analytics
  if ((lower.includes("compare") || lower.includes("vs") || lower.includes("versus")) && 
      financialKeywords.some((k) => lower.includes(k))) {
    category = "financial"; // Financial comparisons should use financial category
  } else if ((lower.includes("compare") || lower.includes("vs") || lower.includes("versus")) && 
             category === "general") {
    category = "analytics";
  }

  // Detect specificity
  let specificity: QuestionIntent["specificity"] = "aggregate";
  if (
    lower.includes("which") ||
    lower.includes("what products") ||
    lower.includes("list") ||
    lower.includes("show me") ||
    lower.includes("details")
  ) {
    specificity = "detailed";
  }
  if (
    lower.match(/\b(product|order|item)\s+(name|number|id)/i) ||
    lower.match(/^[A-Z0-9-]+/i) // Starts with what looks like an ID
  ) {
    specificity = "specific";
  }

  // Detect metrics
  const metrics: string[] = [];
  if (lower.includes("revenue") || lower.includes("sales")) {
    metrics.push("revenue");
  }
  if (lower.includes("profit")) {
    metrics.push("profit");
  }
  if (lower.includes("expense") || lower.includes("spending")) {
    metrics.push("expenses");
  }
  if (lower.includes("cogs") || lower.includes("cost of goods")) {
    metrics.push("cogs");
  }
  if (lower.includes("margin")) {
    metrics.push("margin");
  }
  if (lower.includes("stock") || lower.includes("inventory")) {
    metrics.push("stock");
  }

  // Detect comparison
  const comparison =
    lower.includes("compare") ||
    lower.includes("vs") ||
    lower.includes("versus") ||
    lower.includes("change") ||
    lower.includes("difference") ||
    lower.includes("growth") ||
    lower.includes("trend");

  // Detect comparison type and ranges
  let compareRange: QuestionIntent["compareRange"] = undefined;
  let comparisonType: QuestionIntent["comparisonType"] = undefined;

  if (comparison || lower.includes("vs") || lower.includes("versus")) {
    // Handle "this month vs last month" or "compare this month to last month"
    if (lower.includes("this month") && (lower.includes("last month") || lower.includes("previous month"))) {
      // Current period is "this month" (current calendar month), comparison is "last month" (previous calendar month)
      compareRange = "month"; // This signals to compare with previous calendar month
      comparisonType = "period";
      // Ensure timeRange is set to current period
      if (!timeRange || timeRange === "month") {
        timeRange = "month";
      }
    } else if (
      lower.includes("last month") ||
      lower.includes("previous month") ||
      lower.includes("month before")
    ) {
      compareRange = "30d";
      comparisonType = "period";
    } else if (
      lower.includes("last week") ||
      lower.includes("previous week")
    ) {
      compareRange = "7d";
      comparisonType = "period";
    } else if (
      lower.includes("last year") ||
      lower.includes("previous year")
    ) {
      compareRange = "ytd";
      comparisonType = "period";
    } else if (lower.includes("by category") || lower.includes("per category")) {
      comparisonType = "category";
    } else if (lower.includes("by product") || lower.includes("per product")) {
      comparisonType = "product";
    } else if (comparison) {
      // Generic comparison - compare current period with previous period of same length
      comparisonType = "period";
      // If timeRange is set, use previous period of same length
      if (timeRange === "30d") {
        compareRange = "30d"; // Previous 30d
      } else if (timeRange === "7d") {
        compareRange = "7d"; // Previous 7d
      }
    }
  }

  // Extract specific entities (product names, order numbers)
  const entities: string[] = [];
  
  // Try to extract product names (common patterns)
  const productPatterns = [
    /(?:product|item)\s+(?:called|named|is)\s+["']?([^"'\n]+)["']?/i,
    /(?:show|tell|about|for|find|search)\s+(?:me\s+)?(?:the\s+)?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+(?:product|item|hoodie|shirt|jacket|pants|shorts|sweatshirt)/i,
    /(?:show\s+me|tell\s+me\s+about|what\s+is|details\s+for|info\s+on)\s+(?:the\s+)?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i,
    /(?:the\s+)?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+(?:product|item|hoodie|shirt|jacket|pants|shorts|sweatshirt)/i,
    /(?:show|tell|about)\s+(?:me\s+)?["']([^"']+)["']/i, // Quoted product names
  ];
  
  for (const pattern of productPatterns) {
    const match = question.match(pattern); // Use original case for better matching
    if (match && match[1]) {
      const extracted = match[1].trim();
      // Filter out very short or common words
      if (extracted.length >= 3 && !["the", "and", "for", "with"].includes(extracted.toLowerCase())) {
        entities.push(extracted);
      }
    }
  }
  
  // If "show me" or product-like question but no entity extracted, try to find capitalized words
  if ((lower.includes("show me") || lower.includes("tell me about") || lower.includes("what is") || 
       lower.includes("find") || lower.includes("search")) && entities.length === 0) {
    // Look for capitalized words (potential product names)
    const capitalizedWords = question.match(/\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\b/g);
    if (capitalizedWords && capitalizedWords.length > 0) {
      // Filter out common words and take the first substantial match
      const commonWords = ["The", "Show", "Me", "Tell", "About", "What", "Is", "Are", "This", "That", 
                          "Find", "Search", "Product", "Item", "Details", "Info"];
      const filtered = capitalizedWords.filter(w => 
        !commonWords.includes(w) && w.length >= 3
      );
      if (filtered.length > 0) {
        entities.push(filtered[0]);
      }
    }
    
    // Also try to extract words after "show me", "tell me about", etc.
    const afterPhrase = question.match(/(?:show\s+me|tell\s+me\s+about|what\s+is|find|search)\s+(?:the\s+)?([A-Za-z]+(?:\s+[A-Za-z]+)*)/i);
    if (afterPhrase && afterPhrase[1]) {
      const extracted = afterPhrase[1].trim();
      if (extracted.length >= 3 && !entities.includes(extracted)) {
        entities.push(extracted);
      }
    }
  }

  // Extract order numbers (patterns like RZ-1234, PO-123, #123, order 123)
  const orderPatterns = [
    /(?:order|po|order\s+number)[\s#-]*([A-Z]{2,3}-?\d{3,})/i, // RZ-1234, PO-123
    /(?:order|po)[\s#-]*([A-Z0-9-]{4,})/i, // Generic order format
    /#([0-9]{3,})/, // #1234
    /\b([A-Z]{2,3}-?\d{3,})\b/, // Standalone order numbers like RZ-1234
  ];
  
  for (const pattern of orderPatterns) {
    const match = question.match(pattern);
    if (match && match[1]) {
      const orderNum = match[1].trim().toUpperCase();
      // Validate it looks like an order number (has letters and numbers)
      if (/[A-Z]/.test(orderNum) && /[0-9]/.test(orderNum)) {
        entities.push(orderNum);
      }
    }
  }

  return {
    category,
    timeRange,
    compareRange,
    specificity,
    entities: entities.length > 0 ? entities : undefined,
    metrics: metrics.length > 0 ? metrics : undefined,
    comparison,
    comparisonType,
  };
}

