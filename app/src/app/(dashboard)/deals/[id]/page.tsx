import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { getDeal, getDealNotes, getDealContacts, getLeadIdByPropertyId } from '@/lib/deal-queries';
import { getMatchingBuyersForDeal, getInteractionsForDeal } from '@/lib/buyer-queries';
import { auth } from '@/auth';
import { sessionCan } from '@/lib/permissions';
import { getLeadTimeline } from '@/lib/contact-event-queries';
import { getBudgetByDealId, getExpenses } from '@/lib/budget-queries';
import { getDealContracts, getContractCountByDealId } from '@/lib/contract-queries';
import { getDealPhotos, getDealCoverPhoto } from '@/lib/photo-queries';
import { getFloorPlansByDeal, getFloorPlanCount } from '@/lib/floor-plan-queries';
import { DealOverview } from '@/components/deal-overview';
import { DealMaoCalculator } from '@/components/deal-mao-calculator';
import { DealNotes } from '@/components/deal-notes';
import { DealBlastGenerator } from '@/components/deal-blast-generator';
import { DealGuidePanel } from '@/components/deal-guide-panel';
import { DealCompEntry } from '@/components/deal-comp-entry';
import { BudgetTab } from '@/components/budget-tab';
import { ContractTab } from '@/components/contract-tab';
import { PhotoTab } from '@/components/photo-tab';
import { ActivityTimeline } from '@/components/activity-timeline';
import { FloorPlanTab } from '@/components/floor-plan-tab';
import type { TimelineEntry } from '@/types';
import { BuyerList } from '@/components/buyer-list';

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

  // Session for permission checks
  const session = await auth();

  // Map legacy tab names to new consolidated tabs
  const tabMap: Record<string, string> = {
    overview: 'overview',
    calculator: 'analysis',
    comps: 'analysis',
    contract: 'financials',
    budget: 'financials',
    photos: 'photos',
    notes: 'activity',
    'floor-plans': 'floor-plans',
  };
  const rawTab = tab ?? 'overview';
  const activeTab = tabMap[rawTab] ?? rawTab;

  // Core data fetches (will throw if deal doesn't exist — that's fine, we handle with notFound)
  // Non-essential fetches are wrapped to prevent one failure from crashing the whole page
  const safe = <T,>(p: Promise<T>, fallback: T): Promise<T> => p.catch(() => fallback);

  const [deal, notes, budget, contacts, contracts, contractCount, photos, coverPhoto, floorPlans, floorPlanCount] = await Promise.all([
    getDeal(id),
    getDealNotes(id),
    getBudgetByDealId(id),
    getDealContacts(id),
    safe(getDealContracts(id), []),
    safe(getContractCountByDealId(id), 0),
    safe(getDealPhotos(id), []),
    safe(getDealCoverPhoto(id), null),
    safe(getFloorPlansByDeal(id), []),
    safe(getFloorPlanCount(id), 0),
  ]);

  // Fetch matching buyers and their interaction status for this deal
  const dealPrice = deal?.offerPrice ?? deal?.mao ?? 0;
  const dealCity = deal?.city ?? '';
  const [matchingBuyers, buyerInteractions] = await Promise.all([
    safe(getMatchingBuyersForDeal(dealPrice, dealCity), []),
    safe(getInteractionsForDeal(id), new Map<string, string>()),
  ]);
  const expenses = budget ? await getExpenses(budget.id) : [];

  // Budget categories for floor plan pin form (soft link to budget)
  const budgetCats = budget?.categories.map((c) => ({ id: c.id, name: c.name })) ?? [];

  // Load activity timeline if deal is linked to a property (has a lead)
  let contactTimeline: TimelineEntry[] = [];
  if (deal?.propertyId) {
    const leadId = await getLeadIdByPropertyId(deal.propertyId);
    if (leadId) {
      contactTimeline = await getLeadTimeline(leadId);
    }
  }

  if (!deal) {
    notFound();
  }

  // Permission gates — based on deal status for the Edit Deal button
  const dispositionStatuses = ['marketing', 'assigned'];
  const closingStatuses = ['under_contract', 'closing', 'closed'];
  let canEditDeal = false;
  if (closingStatuses.includes(deal.status)) {
    canEditDeal = sessionCan(session, 'deal.edit_closing_logistics');
  } else if (dispositionStatuses.includes(deal.status)) {
    canEditDeal = sessionCan(session, 'deal.edit_disposition');
  } else {
    canEditDeal = sessionCan(session, 'deal.edit_terms');
  }
  const canRunTracerfy = sessionCan(session, 'tracerfy.run');
  const canSendBlast = sessionCan(session, 'blast.send');
  const canCreateOrEditBuyer = sessionCan(session, 'buyer.create_or_edit');

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
          <div className='flex items-center gap-3 mt-0.5 flex-wrap'>
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${deal.address}, ${deal.city}, ${deal.state}`)}`}
              target='_blank'
              rel='noopener noreferrer'
              className='text-sm text-muted-foreground hover:underline hover:text-foreground transition-colors'
            >
              {deal.city}, {deal.state}
            </a>
            {deal.sqft != null && deal.sqft > 0 && (
              <span className='text-sm text-muted-foreground'>
                <span className='font-medium text-foreground'>{deal.sqft.toLocaleString()}</span> sq ft
              </span>
            )}
          </div>
        </div>
        <Badge variant={statusVariant(deal.status)} className='shrink-0'>
          {statusLabel(deal.status)}
        </Badge>
      </div>

      {/* Guide panel stays at top, outside tabs */}
      <DealGuidePanel status={deal.status} />

      {/* 4-tab layout */}
      <Tabs defaultValue={activeTab}>
        <TabsList className='!flex !w-full !h-auto rounded-lg bg-muted p-1 gap-1 overflow-hidden'>
          <TabsTrigger value='overview' className='!h-auto !flex-1 rounded-md text-xs sm:text-sm py-2 px-2'>
            Overview
          </TabsTrigger>
          <TabsTrigger value='analysis' className='!h-auto !flex-1 rounded-md text-xs sm:text-sm py-2 px-2'>
            Analysis
          </TabsTrigger>
          <TabsTrigger value='financials' className='!h-auto !flex-1 rounded-md text-xs sm:text-sm py-2 px-2'>
            Financials
            {contractCount > 0 && (
              <span className='ml-1 inline-flex items-center justify-center rounded-full bg-primary/15 text-primary text-[10px] font-bold min-w-[18px] h-[18px] px-1 flex-shrink-0'>
                {contractCount > 9 ? '9+' : contractCount}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value='photos' className='!h-auto !flex-1 rounded-md text-xs sm:text-sm py-2 px-2'>
            Photos
            {photos.length > 0 && (
              <span className='ml-1 inline-flex items-center justify-center rounded-full bg-primary/15 text-primary text-[10px] font-bold min-w-[18px] h-[18px] px-1 flex-shrink-0'>
                {photos.length > 9 ? '9+' : photos.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value='activity' className='!h-auto !flex-1 rounded-md text-xs sm:text-sm py-2 px-2'>
            Activity
            {notes.length > 0 && (
              <span className='ml-1 inline-flex items-center justify-center rounded-full bg-primary/15 text-primary text-[10px] font-bold min-w-[18px] h-[18px] px-1 flex-shrink-0'>
                {notes.length > 9 ? '9+' : notes.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value='floor-plans' className='!h-auto !flex-1 rounded-md text-xs sm:text-sm py-2 px-2'>
            Plans
            {floorPlanCount > 0 && (
              <span className='ml-1 inline-flex items-center justify-center rounded-full bg-primary/15 text-primary text-[10px] font-bold min-w-[18px] h-[18px] px-1 flex-shrink-0'>
                {floorPlanCount > 9 ? '9+' : floorPlanCount}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* OVERVIEW: Deal details + blast generator + matched buyers */}
        <TabsContent value='overview' className='mt-4'>
          <div className='space-y-4'>
            <DealOverview deal={deal} contacts={contacts} canEditDeal={canEditDeal} canRunTracerfy={canRunTracerfy} />
            {canSendBlast && <DealBlastGenerator deal={deal} dealId={id} matchingBuyers={matchingBuyers} coverPhotoSasUrl={coverPhoto?.sasUrl ?? null} />}
            <div className='space-y-3'>
              <h3 className='text-sm font-semibold text-muted-foreground uppercase tracking-wider'>
                Matched Buyers ({matchingBuyers.length})
              </h3>
              <BuyerList buyers={matchingBuyers} dealId={id} buyerInteractions={buyerInteractions} />
            </div>
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

        {/* FINANCIALS: Contract tab + Budget */}
        <TabsContent value='financials' className='mt-4'>
          <div className='space-y-6'>
            <ContractTab deal={deal} contracts={contracts} />
            <div className='border-t border-border pt-6'>
              <h3 className='text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4'>
                Budget & Expenses
              </h3>
              <BudgetTab deal={deal} budget={budget} expenses={expenses} />
            </div>
          </div>
        </TabsContent>

        {/* PHOTOS: Photo upload + gallery */}
        <TabsContent value='photos' className='mt-4'>
          <PhotoTab photos={photos} dealId={id} />
        </TabsContent>

        {/* ACTIVITY: Notes + Contact Timeline */}
        <TabsContent value='activity' className='mt-4'>
          <DealNotes dealId={deal.id} initialNotes={notes} />
          {contactTimeline.length > 0 && (
            <div className='mt-6 space-y-3'>
              <h3 className='text-sm font-semibold text-muted-foreground uppercase tracking-wider'>
                Contact History
              </h3>
              <ActivityTimeline entries={contactTimeline} />
            </div>
          )}
        </TabsContent>

        {/* FLOOR PLANS: Upload, viewer, pin annotations */}
        <TabsContent value='floor-plans' className='mt-4'>
          <FloorPlanTab floorPlans={floorPlans} dealId={id} budgetCategories={budgetCats} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
