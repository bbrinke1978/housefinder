import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { getDeal, getDealNotes, getDealContacts } from '@/lib/deal-queries';
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

  // Map legacy tab names to new consolidated tabs
  const tabMap: Record<string, string> = {
    overview: 'overview',
    calculator: 'analysis',
    comps: 'analysis',
    contract: 'financials',
    budget: 'financials',
    notes: 'activity',
  };
  const rawTab = tab ?? 'overview';
  const activeTab = tabMap[rawTab] ?? rawTab;

  const [deal, notes, budget, contacts] = await Promise.all([
    getDeal(id),
    getDealNotes(id),
    getBudgetByDealId(id),
    getDealContacts(id),
  ]);
  const expenses = budget ? await getExpenses(budget.id) : [];

  if (!deal) {
    notFound();
  }

  return (
    <div className='space-y-4'>
      {/* Back link */}
      <div className='flex items-center gap-3'>
        <Link
          href='/deals'
          className='inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors'
        >
          <ArrowLeft className='h-4 w-4' />
          Back to Deals
        </Link>
      </div>

      {/* Deal header */}
      <div className='flex items-start gap-3 flex-wrap'>
        <div className='flex-1 min-w-0'>
          <h1 className='text-xl font-bold md:text-2xl leading-tight'>{deal.address}</h1>
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${deal.address}, ${deal.city}, ${deal.state}`)}`}
            target='_blank'
            rel='noopener noreferrer'
            className='text-sm text-muted-foreground mt-0.5 hover:underline hover:text-foreground transition-colors inline-block'
          >
            {deal.city}, {deal.state}
          </a>
        </div>
        <Badge variant={statusVariant(deal.status)} className='shrink-0'>
          {statusLabel(deal.status)}
        </Badge>
      </div>

      {/* Guide panel stays at top, outside tabs */}
      <DealGuidePanel status={deal.status} />

      {/* 4-tab layout */}
      <Tabs defaultValue={activeTab}>
        <TabsList className='grid w-full grid-cols-4 h-auto rounded-xl p-1'>
          <TabsTrigger value='overview' className='rounded-lg text-xs sm:text-sm py-2'>
            Overview
          </TabsTrigger>
          <TabsTrigger value='analysis' className='rounded-lg text-xs sm:text-sm py-2'>
            Analysis
          </TabsTrigger>
          <TabsTrigger value='financials' className='rounded-lg text-xs sm:text-sm py-2'>
            Financials
          </TabsTrigger>
          <TabsTrigger value='activity' className='rounded-lg text-xs sm:text-sm py-2'>
            Activity
            {notes.length > 0 && (
              <span className='ml-1.5 inline-flex items-center justify-center rounded-full bg-primary/15 text-primary text-[10px] font-bold w-4 h-4 flex-shrink-0'>
                {notes.length > 9 ? '9+' : notes.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* OVERVIEW: Deal details + blast generator */}
        <TabsContent value='overview' className='mt-4'>
          <div className='space-y-4'>
            <DealOverview deal={deal} contacts={contacts} />
            <DealBlastGenerator deal={deal} />
          </div>
        </TabsContent>

        {/* ANALYSIS: MAO Calculator + Comps */}
        <TabsContent value='analysis' className='mt-4'>
          <div className='space-y-6'>
            <DealMaoCalculator deal={deal} />
            <div className='border-t border-border pt-6'>
              <h3 className='text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4'>
                Comparable Sales
              </h3>
              <DealCompEntry deal={deal} />
            </div>
          </div>
        </TabsContent>

        {/* FINANCIALS: Contract tracker + Budget */}
        <TabsContent value='financials' className='mt-4'>
          <div className='space-y-6'>
            <DealContractTracker deal={deal} />
            <div className='border-t border-border pt-6'>
              <h3 className='text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4'>
                Budget & Expenses
              </h3>
              <BudgetTab deal={deal} budget={budget} expenses={expenses} />
            </div>
          </div>
        </TabsContent>

        {/* ACTIVITY: Notes */}
        <TabsContent value='activity' className='mt-4'>
          <DealNotes dealId={deal.id} initialNotes={notes} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
