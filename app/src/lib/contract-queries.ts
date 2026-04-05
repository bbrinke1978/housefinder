import { db } from "@/db/client";
import { contracts, contractSigners } from "@/db/schema";
import type { ContractRow, ContractSignerRow } from "@/db/schema";
import type { ContractWithSigners, ContractClause } from "@/types";
import { eq, desc, inArray } from "drizzle-orm";

/**
 * parseClauses — safely parse the clauses JSON column.
 * Returns empty array if null or malformed.
 */
function parseClauses(clausesJson: string | null): ContractClause[] {
  if (!clausesJson) return [];
  try {
    return JSON.parse(clausesJson) as ContractClause[];
  } catch {
    return [];
  }
}

/**
 * buildContractWithSigners — combine a ContractRow with its signers and parsed clauses.
 */
function buildContractWithSigners(
  contract: ContractRow,
  signers: ContractSignerRow[]
): ContractWithSigners {
  return {
    ...contract,
    signers: signers.sort((a, b) => a.signerOrder - b.signerOrder),
    parsedClauses: parseClauses(contract.clauses),
  };
}

/**
 * getDealContracts — fetch all contracts for a deal with signers, ordered newest first.
 */
export async function getDealContracts(
  dealId: string
): Promise<ContractWithSigners[]> {
  const contractRows = await db
    .select()
    .from(contracts)
    .where(eq(contracts.dealId, dealId))
    .orderBy(desc(contracts.createdAt));

  if (contractRows.length === 0) return [];

  const contractIds = contractRows.map((c) => c.id);

  const allSigners = await db
    .select()
    .from(contractSigners)
    .where(
      contractIds.length === 1
        ? eq(contractSigners.contractId, contractIds[0])
        : inArray(contractSigners.contractId, contractIds)
    );

  return contractRows.map((contract) =>
    buildContractWithSigners(
      contract,
      allSigners.filter((s) => s.contractId === contract.id)
    )
  );
}

/**
 * getContractById — fetch single contract with signers and parsed clauses.
 */
export async function getContractById(
  id: string
): Promise<ContractWithSigners | null> {
  const contractRows = await db
    .select()
    .from(contracts)
    .where(eq(contracts.id, id))
    .limit(1);

  if (contractRows.length === 0) return null;
  const contract = contractRows[0];

  const signerRows = await db
    .select()
    .from(contractSigners)
    .where(eq(contractSigners.contractId, id));

  return buildContractWithSigners(contract, signerRows);
}

/**
 * getContractBySigningToken — lookup by signing token.
 * Returns null if token not found, already signed, or expired.
 */
export async function getContractBySigningToken(
  token: string
): Promise<{ contract: ContractRow; signer: ContractSignerRow } | null> {
  const now = new Date();

  const signerRows = await db
    .select()
    .from(contractSigners)
    .where(eq(contractSigners.signingToken, token))
    .limit(1);

  if (signerRows.length === 0) return null;
  const signer = signerRows[0];

  // Check not already signed
  if (signer.signedAt) return null;

  // Check not expired (null tokenExpiresAt = not yet activated / no expiry set)
  if (signer.tokenExpiresAt && signer.tokenExpiresAt < now) return null;

  const contractRows = await db
    .select()
    .from(contracts)
    .where(eq(contracts.id, signer.contractId))
    .limit(1);

  if (contractRows.length === 0) return null;

  return { contract: contractRows[0], signer };
}

/**
 * getAllContracts — all contracts across all deals, ordered by updatedAt desc.
 */
export async function getAllContracts(): Promise<ContractWithSigners[]> {
  const contractRows = await db
    .select()
    .from(contracts)
    .orderBy(desc(contracts.updatedAt));

  if (contractRows.length === 0) return [];

  const allSigners = await db.select().from(contractSigners);

  return contractRows.map((contract) =>
    buildContractWithSigners(
      contract,
      allSigners.filter((s) => s.contractId === contract.id)
    )
  );
}

/**
 * getContractCountByDealId — count of contracts for a deal, for badge display.
 */
export async function getContractCountByDealId(
  dealId: string
): Promise<number> {
  const rows = await db
    .select({ id: contracts.id })
    .from(contracts)
    .where(eq(contracts.dealId, dealId));

  return rows.length;
}
