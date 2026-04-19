export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
}

export interface ApiError {
  detail: string;
  code?: string;
  field?: string;
}

// ── Enums ────────────────────────────────────────────────────────────────────
export type ShipperStatut    = "ACTIF" | "EN_DÉCLIN" | "PERDU";
export type CotationResultat = "GAGNÉ" | "PERDU" | "EN COURS" | "ANNULÉ";
export type StatutPaiement   = "PAYÉ" | "EN ATTENTE" | "PARTIEL";
export type Priorite         = "P1" | "P2" | "P3";
export type TypeOperation    = "IMPORT" | "EXPORT";
export type TypeTransport    = "MARITIME_LCL" | "MARITIME_FCL" | "AERIEN" | "ROUTIER" | "TRANSIT" | "ENTREPOSAGE" | "CONSIGNATION" | "DIVERS";
export type NatureOperation  = TypeTransport;
export type TypeTC           = "TC20" | "TC40" | "TC40HC" | "TC45" | "VRAC" | "AUTRE";
export type StatutTC         = "EN COURS" | "LIVRÉ" | "BLOQUÉ" | "EN ATTENTE";
export type EmployeStatut    = "ACTIF" | "INACTIF" | "CONGÉ" | "SUSPENDU";
export type Departement      = "DIRECTION" | "COMMERCIAL" | "OPERATIONS" | "FINANCE" | "RH" | "INFORMATIQUE" | "LOGISTIQUE" | "DIVERS";
export type TypeCompta       = "RECETTE" | "DEPENSE";
export type StatutCompta     = "PAYÉ" | "EN ATTENTE" | "PARTIEL" | "ANNULÉ";
export type TypeAudit        = "INTERNE" | "EXTERNE" | "FISCAL" | "SOCIAL" | "OPERATIONNEL" | "INFORMATIQUE" | "QUALITE";
export type StatutAudit      = "PLANIFIÉ" | "EN COURS" | "TERMINÉ" | "SUIVI" | "CLOS";
export type Conformite       = "CONFORME" | "NON_CONFORME" | "PARTIEL" | "N/A";

// ── Entities ─────────────────────────────────────────────────────────────────

export interface Navire {
  id: number;
  nom: string;
  compagnie: string | null;
  code_ligne: string | null;
  actif: boolean;
  partenaire: string | null;
  type_navire: string | null;
}

export interface Shipper {
  id: number;
  nom: string;
  pays: string | null;
  statut: ShipperStatut;
  ca_passe_fcfa: number;
  ca_actuel_fcfa: number;
  nb_bl_passe: number;
  nb_bl_actuel: number;
}

export interface Client {
  id: number;
  nom: string;
  secteur: string | null;
  pays: string | null;
  email: string | null;
  telephone: string | null;
}

export interface Connaissement {
  id: number;
  numero_bl: string | null;
  navire_id: number | null;
  shipper_id: number | null;
  client_id: number | null;
  conteneur_id: number | null;
  annee: number;
  mois: string | null;
  mois_num: number | null;
  quantite: string | null;
  poids_kg: number | null;
  volume_m3: number | null;
  docs_fees_fcfa: number | null;
  montant_normal_fcfa: number | null;
  marge_fcfa: number | null;
  taux_marge: number | null;
  type_operation: TypeOperation;
  type_transport: TypeTransport;
  frais_douane: number | null;
  frais_manutention: number | null;
  notes: string | null;
}

export interface Cotation {
  id: number;
  numero_cotation: string;
  date_cotation: string | null;
  client_id: number | null;
  nature_operation: NatureOperation | null;
  type_service: string | null;
  offre_transitaire: number | null;
  cotation_client: number | null;
  marge: number | null;
  devise: string;
  resultat: CotationResultat;
  observations: string | null;
  agent_commercial: string | null;
  montant_facture_fcfa: number | null;
  date_facture: string | null;
  statut_paiement: StatutPaiement;
}

export interface Conteneur {
  id: number;
  numero_tc: string | null;
  type_tc: TypeTC;
  partenaire: string | null;
  navire_id: number | null;
  annee: number;
  mois_num: number | null;
  mois: string | null;
  date_arrivee: string | null;
  port_origine: string | null;
  port_destination: string | null;
  statut: StatutTC;
  notes: string | null;
}

export interface ConteneurStats {
  conteneur_id: number;
  numero_tc: string | null;
  type_tc: string;
  partenaire: string | null;
  annee: number;
  mois: string | null;
  statut: string;
  nb_bl: number;
  nb_clients: number;
  ca_total_fcfa: number;
  marge_total_fcfa: number | null;
  poids_kg: number;
  volume_m3: number;
}

export interface Employe {
  id: number;
  matricule: string | null;
  nom: string;
  prenom: string | null;
  poste: string | null;
  departement: Departement;
  email: string | null;
  telephone: string | null;
  date_embauche: string | null;
  salaire_base_fcfa: number | null;
  statut: EmployeStatut;
  notes: string | null;
}

export interface PerformanceRH {
  id: number;
  employe_id: number;
  annee: number;
  nb_dossiers_traites: number | null;
  ca_genere_fcfa: number | null;
  objectif_ca_fcfa: number | null;
  taux_realisation: number | null;
  nb_clients_nouveaux: number | null;
  nb_reclamations: number | null;
  prime_fcfa: number | null;
  evaluation: number | null;
  commentaires: string | null;
}

export interface ComptabiliteEntry {
  id: number;
  date_op: string;
  libelle: string;
  type_operation: TypeCompta;
  categorie: string | null;
  montant_fcfa: number;
  devise: string;
  taux_change: number | null;
  montant_devise: number | null;
  reference_doc: string | null;
  client_id: number | null;
  connaissement_id: number | null;
  statut_paiement: StatutCompta;
  date_echeance: string | null;
  date_paiement: string | null;
  service: string | null;
  notes: string | null;
}

export interface ComptaSummary {
  annee: number | null;
  total_recettes: number;
  total_depenses: number;
  resultat_net: number;
  nb_recettes: number;
  nb_depenses: number;
  nb_en_attente: number;
  montant_en_attente: number;
}

export interface AuditEntree {
  id: number;
  reference: string | null;
  date_audit: string;
  auditeur: string | null;
  type_audit: TypeAudit;
  domaine: string | null;
  periode_debut: string | null;
  periode_fin: string | null;
  conformite: Conformite;
  nb_observations: number | null;
  observations: string | null;
  recommandations: string | null;
  plan_action: string | null;
  statut: StatutAudit;
  priorite: Priorite;
  notes: string | null;
}

export interface Prospect {
  id: number;
  client_id: number;
  type_statut: string | null;
  priorite: Priorite;
  ca_pic_fcfa: number;
  ca_derniere_fcfa: number;
  annee_derniere_op: number | null;
  action_prevue: string | null;
  date_relance: string | null;
  statut_relance: string | null;
  notes: string | null;
}

// ── Analytics ────────────────────────────────────────────────────────────────

export interface KpiOut {
  annee: number | null;
  mois_num: number | null;
  ca_total: number;
  nb_bl: number;
  volume_m3: number;
  poids_kg: number;
  marge_fcfa: number | null;
  taux_marge_moyen: number | null;
  ca_moy_par_bl: number | null;
}

export interface CaAnnuelRow {
  annee: number;
  ca: number;
  nb_bl: number;
  volume_m3: number;
  poids_kg: number;
}

export interface CaMensuelRow {
  annee: number;
  mois_num: number;
  ca: number;
  nb_bl: number;
}

export interface CaParClientRow {
  client_id: number;
  nom: string;
  ca_total: number;
  nb_bl: number;
}

export interface CaParNavireRow {
  navire_id: number;
  nom: string;
  ca_total: number;
  nb_bl: number;
}

export interface ShipperRisqueRow {
  id: number;
  nom: string;
  statut: string;
  ca_actuel_fcfa: number;
  ca_passe_fcfa: number;
  evolution_pct: number | null;
}
