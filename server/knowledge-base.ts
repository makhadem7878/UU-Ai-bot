import { convertLeadershipToRecords } from './leadership-loader';
import { convertSpring2027ToRecords } from './spring2027-loader';
import type { KnowledgeRecord, LeadershipEntry, Spring2027Dataset, Spring2027Program } from './types';

export interface KnowledgeBundle {
  universityData: KnowledgeRecord[];
  undergraduatePrograms: KnowledgeRecord[];
  graduatePrograms: KnowledgeRecord[];
  admissionRequirements: KnowledgeRecord[];
  tuitionFees: KnowledgeRecord[];
  scholarshipPolicy: KnowledgeRecord[];
  departments: KnowledgeRecord[];
  faq: KnowledgeRecord[];
  contact: KnowledgeRecord[];
  spring2027Dataset?: Spring2027Dataset;
  leadershipDirectory?: LeadershipEntry[];
}

/**
 * Modular Knowledge Repository designed so JSON files can later be replaced
 * by Cloudflare D1 or Cloudflare KV without changing retrieval or API handlers.
 */
export class KnowledgeRepository {
  private readonly bundle: KnowledgeBundle;
  private readonly allRecords: KnowledgeRecord[];
  private readonly spring2027Programs: Spring2027Program[];
  private readonly leadershipEntries: LeadershipEntry[];

  constructor(bundle: KnowledgeBundle) {
    this.bundle = bundle;
    this.spring2027Programs = bundle.spring2027Dataset?.programs || [];
    this.leadershipEntries = bundle.leadershipDirectory || [];

    const spring2027Records = bundle.spring2027Dataset
      ? convertSpring2027ToRecords(bundle.spring2027Dataset)
      : [];
    const leadershipRecords = convertLeadershipToRecords(this.leadershipEntries);

    // Prioritize explicitly dated Spring 2027 records over older seed placeholders
    const baseTuitionFees = bundle.spring2027Dataset ? [] : bundle.tuitionFees;
    const baseRequirements = bundle.spring2027Dataset ? [] : bundle.admissionRequirements;

    this.allRecords = [
      ...bundle.universityData,
      ...bundle.undergraduatePrograms,
      ...bundle.graduatePrograms,
      ...baseRequirements,
      ...baseTuitionFees,
      ...bundle.scholarshipPolicy,
      ...bundle.departments,
      ...bundle.faq,
      ...bundle.contact,
      ...spring2027Records,
      ...leadershipRecords,
    ];
  }

  getAllRecords(): KnowledgeRecord[] {
    return this.allRecords;
  }

  getActiveRecords(): KnowledgeRecord[] {
    return this.allRecords.filter(
      (r) => r.verification_status !== 'historical' && r.verification_status !== 'unavailable'
    );
  }

  getSpring2027Dataset(): Spring2027Dataset | undefined {
    return this.bundle.spring2027Dataset;
  }

  getSpring2027Programs(): Spring2027Program[] {
    return this.spring2027Programs;
  }

  getLeadershipEntries(): LeadershipEntry[] {
    return this.leadershipEntries;
  }

  getBundle(): KnowledgeBundle {
    return this.bundle;
  }

  getVerificationSummary() {
    const counts = {
      verified: 0,
      needs_review: 0,
      historical: 0,
      unavailable: 0,
      total: this.allRecords.length,
    };
    for (const r of this.allRecords) {
      counts[r.verification_status] = (counts[r.verification_status] || 0) + 1;
    }
    return counts;
  }
}
