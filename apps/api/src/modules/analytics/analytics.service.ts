import { Injectable } from '@nestjs/common';
import { Prisma, withTenant } from '@vibesphere/database';

export interface KpiPeriod {
  from: Date;
  to: Date;
}

/**
 * Analytics — KPIs e métricas por período, escopados ao tenant — Requisito 3.
 */
@Injectable()
export class AnalyticsService {
  async getKpis(tenantId: string, period: KpiPeriod) {
    const range = { gte: period.from, lte: period.to };

    return withTenant(tenantId, async (tx) => {
      const [messages, conversations, leads, opportunities, wonOpportunities] = await Promise.all([
        tx.message.count({ where: { createdAt: range } }),
        tx.conversation.count({ where: { createdAt: range } }),
        tx.lead.count({ where: { createdAt: range } }),
        tx.opportunity.count({ where: { createdAt: range } }),
        tx.opportunity.count({ where: { createdAt: range, status: 'won' } }),
      ]);

      const conversionRate = opportunities > 0 ? wonOpportunities / opportunities : 0;
      const avgFirstResponseSeconds = await this.avgFirstResponseSeconds(tx, period);

      return {
        period: { from: period.from, to: period.to },
        totals: { messages, conversations, leads, opportunities, wonOpportunities },
        conversionRate: Number(conversionRate.toFixed(4)),
        avgFirstResponseSeconds,
      };
    });
  }

  /**
   * Tempo médio (s) entre a primeira mensagem de entrada e a primeira de saída
   * de cada conversa criada no período — Requisito 3.2.
   */
  private async avgFirstResponseSeconds(
    tx: Prisma.TransactionClient,
    period: KpiPeriod,
  ): Promise<number | null> {
    const rows = await tx.$queryRawUnsafe<{ avg: number | null }[]>(
      `SELECT AVG(EXTRACT(EPOCH FROM (first_out - first_in))) AS avg
         FROM (
           SELECT m.conversation_id,
                  MIN(CASE WHEN m.direction = 'inbound' THEN m.created_at END) AS first_in,
                  MIN(CASE WHEN m.direction = 'outbound' THEN m.created_at END) AS first_out
             FROM messages m
             JOIN conversations c ON c.id = m.conversation_id
            WHERE c.created_at BETWEEN $1 AND $2
            GROUP BY m.conversation_id
         ) t
        WHERE first_in IS NOT NULL AND first_out IS NOT NULL AND first_out >= first_in`,
      period.from,
      period.to,
    );
    const avg = rows[0]?.avg;
    return avg != null ? Math.round(Number(avg)) : null;
  }
}
