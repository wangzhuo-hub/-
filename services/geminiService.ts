import { GoogleGenAI } from "@google/genai";
import { Park, SurveyRecord } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const GeminiService = {
  /**
   * Generates a high-level market summary based on all parks and their latest statistics.
   */
  generateMarketOverview: async (parks: Park[], surveys: SurveyRecord[]) => {
    // Prepare data context
    const dataContext = parks.map(p => {
        const parkSurveys = surveys.filter(s => s.parkId === p.id);
        const latestSurvey = parkSurveys.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
        return {
            name: p.name,
            latestOccupancy: latestSurvey ? latestSurvey.occupancyRate : 'N/A',
            latestPrice: latestSurvey ? latestSurvey.rentPrice : 'N/A',
            commission: latestSurvey ? latestSurvey.commission : 'N/A',
            events: latestSurvey ? latestSurvey.significantEvents : '',
            lastUpdated: latestSurvey ? latestSurvey.date : 'N/A'
        };
    });

    const prompt = `
      作为一名房地产市场分析师，请根据以下竞品办公园区的调研数据进行分析：
      ${JSON.stringify(dataContext, null, 2)}
      
      请提供一段简明扼要的市场现状总结（约150字）。
      并指出2个关键的市场趋势（例如：出租率变化、租金价格走势、佣金战、重大事件影响等）。
      保持语气专业、客观，并给出可行的建议。请用中文回答。
    `;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });
      return response.text;
    } catch (error) {
      console.error("Gemini API Error:", error);
      return "暂时无法生成市场分析，请检查您的 API Key 是否正确。";
    }
  },

  /**
   * Generates analysis for a single survey update.
   */
  analyzeSurveyEntry: async (parkName: string, record: Partial<SurveyRecord>, previousRecord?: SurveyRecord) => {
    const prompt = `
      请分析关于办公园区"${parkName}"的最新调研数据。
      
      当前数据:
      出租率: ${record.occupancyRate}%
      租金报价: ${record.rentPrice} 元/天/㎡
      佣金政策: ${record.commission}
      重大事件: ${record.significantEvents || '无'}
      交付标准: ${record.deliveryStandard}
      
      ${previousRecord ? `
      上期数据 (${previousRecord.date}):
      出租率: ${previousRecord.occupancyRate}%
      租金报价: ${previousRecord.rentPrice || 'N/A'} 元/天/㎡
      佣金政策: ${previousRecord.commission}
      ` : '无上期数据。'}
      
      请提供2句简短的见解，分析其市场竞争力、定价策略和变化趋势。
      该园区的表现是上升还是下降？请用中文回答。
    `;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });
      return response.text;
    } catch (error) {
      console.error("Gemini API Error:", error);
      return "无法获取分析结果。";
    }
  }
};