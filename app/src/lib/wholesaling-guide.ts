export interface StageGuide {
  stage: string;
  title: string;
  description: string;
  criteria: string[];
  nextSteps: string[];
  script?: string;
  checklist?: string[];
  tips?: string[];
}

export const STAGE_GUIDES: Record<string, StageGuide> = {
  lead: {
    stage: "lead",
    title: "Lead",
    description:
      "Raw lead — not yet contacted. Could be from driving for dollars, tax lists, or the HouseFinder dashboard.",
    criteria: [
      "Name and address captured",
      "Phone number available or skip traced",
    ],
    nextSteps: ["Call the seller", "Use the 4 Pillars qualification script"],
    script: `THE 4 PILLARS — Seller Qualification Script

1. CONDITION: "What kind of repairs does the property need?"
2. TIMELINE: "When would you ideally like to have this sold?"
3. PRICE: "What were you hoping to get for the property?"
4. MOTIVATION: "What's the main reason you're looking to sell?"`,
    tips: [
      "Let them talk first",
      "Don't make an offer on the first call",
      "Take notes on motivation — it's the key to the deal",
    ],
  },

  qualified: {
    stage: "qualified",
    title: "Qualified",
    description:
      "Seller is motivated. You've confirmed: needs repairs, wants quick sale, or is in distress.",
    criteria: [
      "Spoke with seller",
      "Confirmed motivation (inherited, financial distress, vacant, divorce)",
      "Seller willing to discuss price",
      "Property has a structure (not vacant land)",
    ],
    nextSteps: [
      "Research the ARV (After Repair Value)",
      "Estimate repair costs",
      "Run the MAO calculator",
    ],
    tips: [
      "Hot seller indicators: heavy repairs + ASAP timeline + financial distress",
      "If they're not motivated, move to Dead — don't waste time",
    ],
  },

  analyzed: {
    stage: "analyzed",
    title: "Analyzed",
    description:
      "You've run the numbers. MAO calculated, ARV confirmed, repairs estimated.",
    criteria: [
      "ARV researched (comps, agent opinion, or Zillow)",
      "Repair estimate completed (walk the property if possible)",
      "MAO = ARV × 0.75 − Repairs − Your Fee",
      "Deal makes sense — profit margin is there",
    ],
    nextSteps: ["Make a verbal offer to the seller", "Use the soft approach"],
    script: `SOFT OFFER APPROACH

"Based on what I'm seeing with the repairs needed and the current market, if we covered all closing costs and bought it as-is, would you consider [your offer price]?"`,
    tips: [
      "Always leave room for negotiation",
      "If MAO is way below asking, the deal may not work — that's okay",
      "Use sensitivity analysis — what if ARV is 10% lower?",
    ],
  },

  offered: {
    stage: "offered",
    title: "Offered",
    description:
      "You've made a verbal offer. Waiting for seller response or negotiating.",
    criteria: [
      "Verbal offer presented to seller",
      "Seller is considering or countering",
    ],
    nextSteps: [
      "Follow up within 24–48 hours",
      "Be ready to negotiate",
      "If accepted, move to contract immediately",
    ],
    tips: [
      "Don't chase — if they say no, ask 'What would work for you?'",
      "Speed matters once they say yes",
      "Get it in writing ASAP",
    ],
  },

  under_contract: {
    stage: "under_contract",
    title: "Under Contract",
    description:
      "Purchase agreement signed! You have an assignable contract with the seller.",
    criteria: [
      "Assignable purchase agreement signed by both parties",
      "Buyer listed as 'Your Name and/or assigns'",
      "Inspection period active (typically 14 days)",
      "Earnest money deposited (typically $100 refundable)",
    ],
    nextSteps: [
      "Send contract to title company",
      "Start marketing to buyers immediately",
      "Begin inspection period clock",
    ],
    checklist: [
      "Contract signed by seller",
      "Contract signed by you",
      "Earnest money deposited",
      "Title company selected (investor-friendly!)",
      "Contract sent to title",
      "Escrow opened",
      "Start marketing to buyers",
    ],
    tips: [
      "Use a small local title company, NOT big corporate ones",
      "Make sure title company is comfortable with assignments",
      "Your inspection period is your safety net — use it",
    ],
  },

  marketing: {
    stage: "marketing",
    title: "Marketing",
    description:
      "Deal is under contract and you're actively marketing to cash buyers.",
    criteria: [
      "Under contract with seller",
      "Title company has the contract",
      "Deal blast created and sent to buyers list",
    ],
    nextSteps: [
      "Send deal blast to entire buyers list",
      "Post in Facebook groups and investor meetups",
      "Follow up with interested buyers within hours",
    ],
    script: `DEAL BLAST TEMPLATE

[CITY] DEAL ALERT
Address: [address]
Price: $[offer + assignment fee]
ARV: $[arv]
Repairs: $[repairs]
Assignment Fee: $[fee]
Cash buyers only
Inspection period ends: [date]
Contact: [your number]`,
    tips: [
      "Speed is everything — buyers want deals fast",
      "Include photos if possible",
      "Be transparent about repairs and ARV",
    ],
  },

  assigned: {
    stage: "assigned",
    title: "Assigned",
    description: "You've found a buyer! Assignment agreement signed.",
    criteria: [
      "Cash buyer identified and agreed to terms",
      "Assignment agreement signed",
      "Non-refundable deposit collected ($5,000–$10,000 typical)",
      "Assignment sent to title company",
    ],
    nextSteps: [
      "Send assignment agreement to title company",
      "Coordinate closing date with all parties",
      "Stay in communication — deals fall apart from lack of follow-up",
    ],
    checklist: [
      "Assignment agreement signed by buyer",
      "Non-refundable deposit collected",
      "Assignment sent to title company",
      "Closing date confirmed with all parties",
      "Title clear (no liens or issues)",
    ],
  },

  closing: {
    stage: "closing",
    title: "Closing",
    description:
      "All parties are headed to the closing table. Title is clear, funds are ready.",
    criteria: [
      "Title is clear",
      "Buyer has funds ready",
      "Closing date scheduled",
      "All documents prepared by title company",
    ],
    nextSteps: [
      "Confirm closing date and time with title company",
      "Ensure buyer brings certified funds",
      "Show up and get paid!",
    ],
    checklist: [
      "Title clear — no liens",
      "Buyer funds verified",
      "Closing date/time confirmed",
      "All parties notified",
      "Documents ready at title",
    ],
  },

  closed: {
    stage: "closed",
    title: "Closed",
    description:
      "Deal is done! Assignment fee collected. Time to celebrate and do another one.",
    criteria: [
      "Closing completed",
      "Assignment fee received",
      "All parties satisfied",
    ],
    nextSteps: [
      "Log your profit",
      "Ask the buyer if they want more deals",
      "Add buyer to your preferred list",
      "Review what worked and what didn't",
    ],
    tips: [
      "Your best buyers are repeat buyers — treat them well",
      "Document your process for the next deal",
      "Reinvest in marketing to keep the pipeline full",
    ],
  },

  dead: {
    stage: "dead",
    title: "Dead",
    description:
      "Deal didn't work out. That's okay — it happens. Learn and move on.",
    criteria: [
      "Seller not motivated",
      "Numbers don't work",
      "Property issues",
      "Lost to competition",
      "Fell through during closing",
    ],
    nextSteps: [
      "Add notes on WHY it died",
      "Consider following up in 30–60 days",
      "Move on to the next lead",
    ],
    tips: [
      "Dead deals sometimes come back to life months later",
      "Keep notes so you remember what happened",
      "Don't take it personally — it's a numbers game",
    ],
  },
};

export function getStageGuide(stage: string): StageGuide | undefined {
  return STAGE_GUIDES[stage];
}
