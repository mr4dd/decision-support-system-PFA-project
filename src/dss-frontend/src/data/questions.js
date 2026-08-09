export const questions = [
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
        { value: '3', label: 'généralisée à tous' },
      ],
    },
  },
  {
    id: 'access',
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
    id: 'backup',
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
    id: 'vulnerabilities',
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
    id: 'awareness',
    category: 'Gouverner',
    criterion: 'Sensibilisation des utilisateurs (phishing, bonnes pratiques)',
    scale: {
      options: [
        { value: '0', label: 'aucune' },
        { value: '1', label: 'ponctuelle' },
        { value: '2', label: 'formation annuelle' },
        { value: '3', label: 'régulière + tests' },
      ],
    },
  },
  {
    id: 'incident',
    category: 'Répondre',
    criterion: 'Plan de réponse aux incidents',
    scale: {
      options: [
        { value: '0', label: 'aucun plan' },
        { value: '1', label: 'informel non testé' },
        { value: '2', label: 'documenté' },
        { value: '3', label: 'documenté et testé' },
      ],
    },
  },
  {
    id: 'policy',
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
];
