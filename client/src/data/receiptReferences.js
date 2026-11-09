export const receiptTargets = [
  {
    id: 1, gapId: 1, title: 'Appellate finality', question: 'Did the court accept his new argument?',
    reason: 'Before following another appeal, establish whether it changed the legal position. A question about the outcome is different from a question about who reported the application.',
  },
  {
    id: 2, gapId: 3, title: 'Evidentiary ledger', question: 'Has anyone actually seen the decision?',
    reason: 'Separate a reported decision from the evidence offered for it. The receipt can assess only the sourcing this version of the article actually provides.',
  },
  {
    id: 3, gapId: 5, title: 'Sovereignty transfer', question: 'Who actually puts him on the plane?',
    reason: 'A judicial order and a physical handover are separate events. This turn asks which actor carries the case from legal permission to execution.',
  },
]

export const receiptPhases = [
  { phase: '01 · Judicial', jurisdiction: 'UK courts', tension: 'Appeals and prison assurances' },
  { phase: '02 · Strasbourg', jurisdiction: 'European Court of Human Rights', tension: 'Interim relief and the decision record' },
  { phase: '03 · Custodial', jurisdiction: 'UK–India custody transfer', tension: 'From the surrender warrant to departure' },
]
