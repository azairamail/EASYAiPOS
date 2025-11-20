import { GoogleGenAI } from "@google/genai";
import { Order, MenuItem, InventoryItem } from '../types';

// Safely initialize GenAI
const getGenAI = () => {
  if (!process.env.API_KEY) {
    console.warn("Gemini API Key is missing!");
    return null;
  }
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

export const getMenuDescription = async (itemName: string, category: string): Promise<string> => {
  const ai = getGenAI();
  if (!ai) return "Delicious food item.";

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Write a short, appetizing, 1-sentence description for a restaurant menu item. 
      Item Name: ${itemName}
      Category: ${category}
      Language: English (but culturally relevant for a Bangladeshi restaurant if applicable).`
    });
    return response.text.trim();
  } catch (error) {
    console.error("Gemini Menu Description Error:", error);
    return "Freshly prepared delicious dish.";
  }
};

export const getBusinessInsights = async (orders: Order[], inventory: InventoryItem[]): Promise<string> => {
  const ai = getGenAI();
  if (!ai) return "AI Insights unavailable without API Key.";

  // Prepare data summary
  const totalSales = orders.reduce((acc, o) => acc + o.totalAmount, 0);
  const topItems = orders.flatMap(o => o.items).map(i => i.name);
  const lowStock = inventory.filter(i => i.quantity < i.threshold).map(i => i.name);

  const prompt = `
    Analyze this restaurant data and provide 3 strategic insights in simple bullet points.
    
    Data:
    - Total Sales Today: ${totalSales} BDT
    - Total Orders: ${orders.length}
    - Popular Items Recently: ${topItems.slice(0, 5).join(', ')}
    - Low Stock Alerts: ${lowStock.length > 0 ? lowStock.join(', ') : 'None'}

    Focus on: 1. Sales performance 2. Inventory warnings 3. Marketing idea based on items sold.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text;
  } catch (error) {
    console.error("Gemini Insights Error:", error);
    return "Could not generate insights at this time.";
  }
};