import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { getDeal, getDealNotes } from '@/lib/deal-queries';
import { getBudgetByDealId, getExpenses } from '@/lib/budget-queries';
import { DealOverview } from '@/components/deal-overview';
import { DealMaoCalculator } from '@/components/deal-mao-calculator';
import { DealContractTracker } from '@/components/deal-contract-tracker';
import { DealNotes } from '@/components/deal-notes';
import { DealBlastGenerator } from '@/components/deal-blast-generator';
import { DealGuidePanel } from '@/components/deal-guide-panel';
import { DealCompEntry } from '@/components/deal-comp-entry';
import { BudgetTab } from '@/components/budget-tab';

export const dynamic = 'force-dynamic';

function statusLabel(status: string): string {
  const labels: Record<string, string> = {
    lead: 'Lead',
    qualified: 'Qualified',
    analyzed: 'Analyzed',
    offered: 'Offered',
    under_contract: 'Under Contract',
    marketing: 'Marketing',
    assigned: 'Assigned',
    closing: 'Closing',
    closed: 'Closed',
    dead: 'Dead',
  };
  return labels[status] ?? status;
}

function statusVariant(
  status: string
): 'default' | 'secondary' | 'outline' | 'destructive' {
  if (status === 'closed') return 'default';
  if (status === 'dead') return 'destructive';
  if (status === 'under_contract' || status === 'closing') return 'default';
  return 'secondary';
}

export default async function DealDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id } = await params;
  const { tab } = await searchParams;
  const activeTab = tab ?? 'overview';

  const [deal, notes, budget] = await Promise.all([
    getDeal(id),
    getDealNotes(id),
    getBudgetByDealId(id),
  ]);
  const expenses = budget ? await getExpenses(budget.id) : [];

  if (!deal) {
    notFound();
  }

  return (
    <div className='space-y-4'>
      <div className='flex items-center gap-3'>
        <Link
          href='/deals'
          className='inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors'
        >
          <ArrowLeft className='h-4 w-4' />
          Back to Deals
        </Link>
      </div>

      <div className='flex items-center gap-3 flex-wrap'>
        <h1 className='text-xl font-bold md:text-2xl'>{deal.address}</h1>
        <Badge variant={statusVariant(deal.status)}>
          {statusLabel(deal.status)}
        </Badge>
      </div>

      <p className='text-sm text-muted-foreground'>
        {deal.city}, {deal.state}
      </p>

      <DealGuidePanel status={deal.status} />

      <Tabs defaultValue={activeTab}>
        <TabsList className='flex-wrap'>
          <TabsTrigger value='overview'>Overview</TabsTrigger>
          <TabsTrigger value='calculator'>Calculator</TabsTrigger>
          <TabsTrigger value='comps'>Comps</TabsTrigger>
          <TabsTrigger value='contract'>Contract</TabsTrigger>
          <TabsTrigger value='notes'>Notes ({notes.length})</TabsTrigger>
          <TabsTrigger value='budget'>Budget</TabsTrigger>
        </TabsList>

        <TabsContent value='overview' className='mt-4'>
          <div className='space-y-4'>
            <DealOverview deal={deal} />
            <DealBlastGenerator deal={deal} />
          </div>
        </TabsContent>

        <TabsContent value='calculator' className='mt-4'>
          <DealMaoCalculator deal={deal} />
        </TabsContent>

        <TabsContent value='comps' className='mt-4'>
          <DealCompEntry deal={deal} />
        </TabsContent>

        <TabsContent value='contract' className='mt-4'>
          <DealContractTracker deal={deal} />
        </TabsContent>

        <TabsContent value='notes' className='mt-4'>
          <DealNotes dealId={deal.id} initialNotes={notes} />
        </TabsContent>

        <TabsContent value='budget' className='mt-4'>
          <BudgetTab deal={deal} budget={budget} expenses={expenses} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
