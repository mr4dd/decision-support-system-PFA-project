export const questions=[
  {
    id: 'security-policy',
    category: 'Gouverner',
    criterion: 'Politique de sécurité formalisée',
    scale: {
      options: [
        { value: '0', label: 'absente' },
        { value: '1', label: 'informelle' },
        { value: '2', label: 'documentée' },
        { value: '3', label: 'documentée, diffusée et révisée' },
      ],
    },
  },
  {
    id: 'business-risk-mgmt',
    category: 'Gouverner',
    criterion: 'Gestion des risques métier (identification, évaluation)',
    scale: {
      options: [
        { value: '0', label: 'non réalisée' },
        { value: '1', label: 'ponctuelle' },
        { value: '2', label: 'réalisée périodiquement' },
        { value: '3', label: "intégrée au pilotage de l'organisation" },
      ],
    },
  },
  {
    id: 'roles-responsibilities',
    category: 'Gouverner',
    criterion: 'Rôles et responsabilités de sécurité définis',
    scale: {
      options: [
        { value: '0', label: 'non définis' },
        { value: '1', label: 'informels' },
        { value: '2', label: 'définis pour les rôles clés' },
        { value: '3', label: 'définis, documentés et communiqués' },
      ],
    },
  },
  {
    id: 'asset-inventory',
    category: 'Identifier',
    criterion: 'Inventaire des actifs matériels et logiciels',
    scale: {
      options: [
        { value: '0', label: 'aucun inventaire' },
        { value: '1', label: 'partiel et non à jour' },
        { value: '2', label: 'complet mais mise à jour manuelle' },
        { value: '3', label: 'complet et maintenu automatiquement' },
      ],
    },
  },
  {
    id: 'patch-management',
    category: 'Identifier',
    criterion: 'Gestion des vulnérabilités / mises à jour (patch management)',
    scale: {
      options: [
        { value: '0', label: 'non géré' },
        { value: '1', label: 'manuel irrégulier' },
        { value: '2', label: 'régulier' },
        { value: '3', label: 'automatisé et suivi' },
      ],
    },
  },
  {
    id: 'third-party-risk',
    category: 'Identifier',
    criterion: 'Évaluation des risques liés aux tiers / fournisseurs',
    scale: {
      options: [
        { value: '0', label: 'aucune évaluation' },
        { value: '1', label: 'évaluation informelle' },
        { value: '2', label: 'évaluation des prestataires critiques' },
        { value: '3', label: 'évaluation systématique et contractualisée' },
      ],
    },
  },
  {
    id: 'passwords',
    category: 'Protéger',
    criterion: 'Gestion des mots de passe (complexité, rotation, unicité)',
    scale: {
      options: [
        { value: '0', label: 'aucune politique' },
        { value: '1', label: 'politique informelle' },
        { value: '2', label: 'appliquée partiellement' },
        { value: '3', label: 'appliquée et vérifiée' },
      ],
    },
  },
  {
    id: 'mfa',
    category: 'Protéger',
    criterion: 'Authentification multi-facteurs (MFA) sur comptes à privilèges',
    scale: {
      options: [
        { value: '0', label: 'absente' },
        { value: '1', label: 'partielle (admin uniquement)' },
        { value: '2', label: 'généralisée aux comptes sensibles' },
        { value: '3', label: 'généralisée à tous les comptes' },
      ],
    },
  },
  {
    id: 'access-management',
    category: 'Protéger',
    criterion: 'Gestion des accès (principe du moindre privilège)',
    scale: {
      options: [
        { value: '0', label: 'accès non maîtrisés' },
        { value: '1', label: 'revue ponctuelle' },
        { value: '2', label: 'revue périodique' },
        { value: '3', label: 'revue périodique + traçabilité' },
      ],
    },
  },
  {
    id: 'encryption',
    category: 'Protéger',
    criterion: 'Chiffrement des données sensibles (repos et transit)',
    scale: {
      options: [
        { value: '0', label: 'aucun chiffrement' },
        { value: '1', label: 'partiel (transit uniquement)' },
        { value: '2', label: 'chiffrement au repos et en transit' },
        { value: '3', label: 'chiffrement systématique et géré (gestion des clés)' },
      ],
    },
  },
  {
    id: 'awareness',
    category: 'Protéger',
    criterion: 'Sensibilisation des utilisateurs (phishing, bonnes pratiques)',
    scale: {
      options: [
        { value: '0', label: 'aucune' },
        { value: '1', label: 'ponctuelle' },
        { value: '2', label: 'formation annuelle' },
        { value: '3', label: 'régulière + tests (simulation phishing)' },
      ],
    },
  },
  {
    id: 'logging-monitoring',
    category: 'Détecter',
    criterion: 'Supervision et journalisation des événements de sécurité',
    scale: {
      options: [
        { value: '0', label: 'aucune journalisation' },
        { value: '1', label: 'logs non exploités' },
        { value: '2', label: 'logs revus ponctuellement' },
        { value: '3', label: 'supervision continue et alertes' },
      ],
    },
  },
  {
    id: 'threat-detection',
    category: 'Détecter',
    criterion: 'Détection des menaces (antivirus / EDR)',
    scale: {
      options: [
        { value: '0', label: 'aucune protection' },
        { value: '1', label: 'antivirus basique non centralisé' },
        { value: '2', label: 'antivirus centralisé' },
        { value: '3', label: 'EDR avec détection comportementale' },
      ],
    },
  },
  {
    id: 'incident-response-plan',
    category: 'Répondre',
    criterion: 'Plan de réponse aux incidents',
    scale: {
      options: [
        { value: '0', label: 'aucun plan' },
        { value: '1', label: 'informel non testé' },
        { value: '2', label: 'documenté' },
        { value: '3', label: 'documenté et testé (exercice)' },
      ],
    },
  },
  {
    id: 'breach-notification',
    category: 'Répondre',
    criterion: 'Procédure de notification (réglementaire / CNIL / clients)',
    scale: {
      options: [
        { value: '0', label: 'inexistante' },
        { value: '1', label: 'connue informellement' },
        { value: '2', label: 'procédure documentée' },
        { value: '3', label: 'procédure documentée et déjà exercée' },
      ],
    },
  },
  {
    id: 'crisis-simulations',
    category: 'Répondre',
    criterion: 'Exercices et simulations de gestion de crise',
    scale: {
      options: [
        { value: '0', label: 'aucun exercice' },
        { value: '1', label: 'discussion informelle' },
        { value: '2', label: 'exercice réalisé une fois' },
        { value: '3', label: "exercices réguliers avec retour d'expérience" },
      ],
    },
  },
  {
    id: 'backups',
    category: 'Récupérer',
    criterion: 'Sauvegardes (fréquence, test de restauration)',
    scale: {
      options: [
        { value: '0', label: 'aucune sauvegarde' },
        { value: '1', label: 'sauvegarde sans test' },
        { value: '2', label: 'testée occasionnellement' },
        { value: '3', label: 'testée régulièrement, hors site' },
      ],
    },
  },
  {
    id: 'bcp-drp',
    category: 'Récupérer',
    criterion: "Plan de continuité et de reprise d'activité (PCA/PRA)",
    scale: {
      options: [
        { value: '0', label: 'aucun plan' },
        { value: '1', label: 'informel' },
        { value: '2', label: 'documenté non testé' },
        { value: '3', label: 'documenté et testé' },
      ],
    },
  },
  {
    id: 'rto-rpo',
    category: 'Récupérer',
    criterion: 'Objectifs de reprise définis (RTO/RPO)',
    scale: {
      options: [
        { value: '0', label: 'non définis' },
        { value: '1', label: 'estimés informellement' },
        { value: '2', label: 'définis pour les systèmes critiques' },
        { value: '3', label: 'définis, validés et revus périodiquement' },
      ],
    },
  },
]