// Application Types for Smart Intake Wizard

export type ApplicationStatus =
  | 'draft'
  | 'submitted'
  | 'eligible'
  | 'ineligible'
  | 'approved'
  | 'declined'
  | 'settled';

export type AssetType = 'vehicle' | 'truck' | 'equipment';

export type AssetCondition = 'new' | 'demo' | 'used_0_3' | 'used_4_7' | 'used_8_plus';

export type EntityType = 'company' | 'trust' | 'sole_trader' | 'partnership';

// Personal asset types
export interface PersonalAsset {
  type: 'property' | 'vehicle' | 'savings' | 'investments' | 'superannuation' | 'other';
  description: string;
  estimatedValue: number;
  hasLoan?: boolean;
  loanBalance?: number;
  lender?: string;
}

// Personal liability types
export interface PersonalLiability {
  type: 'mortgage' | 'car_loan' | 'personal_loan' | 'credit_card' | 'hecs' | 'other';
  description: string;
  lender: string;
  balance: number;
  monthlyPayment: number;
  limit?: number; // For credit cards
}

export interface Director {
  firstName: string;
  lastName: string;
  dob: string; // YYYY-MM-DD
  email: string;
  phone: string;
  address: string;
  suburb: string;
  state: string;
  postcode: string;
  residentialAddress?: string; // Full address string from chat
  // Address duration tracking
  addressYearsMonths?: string; // e.g. "2 years" or "6 months"
  addressMonths?: number; // Total months at current address
  // Previous address (if less than 2 years at current)
  previousAddress?: string;
  previousSuburb?: string;
  previousState?: string;
  previousPostcode?: string;
  previousAddressYearsMonths?: string;
  previousAddressMonths?: number;
  // Licence details
  licenceNumber?: string;
  licenceState?: string;
  // Personal financial position - individual assets
  ownsProperty?: boolean;
  propertyValue?: number;
  mortgageBalance?: number;
  hasInvestmentProperty?: boolean;
  investmentPropertyValue?: number;
  investmentMortgageBalance?: number;
  vehiclesValue?: number;
  vehicleLoanBalance?: number;
  creditCardLimit?: number;
  creditCardOutstanding?: number;
  // Monthly payments (for affordability)
  monthlyMortgagePayment?: number;
  monthlyInvestmentMortgagePayment?: number;
  monthlyVehicleLoanPayment?: number;
  monthlyCreditCardPayment?: number;
  // Income & Expenses
  annualSalary?: number;
  otherIncome?: number;
  otherIncomeDescription?: string;
  monthlyLivingExpenses?: number;
  // Legacy fields (kept for backwards compatibility)
  savingsValue?: number;
  otherLoansBalance?: number;
  // Calculated totals
  totalAssets?: number;
  totalLiabilities?: number;
  netPosition?: number;
  totalMonthlyPayments?: number;
  totalMonthlyIncome?: number;
  // Detailed breakdown (optional, for more complex flows)
  personalAssets?: PersonalAsset[];
  personalLiabilities?: PersonalLiability[];
}

export interface ABNLookupResult {
  abn: string;
  abnStatus: 'Active' | 'Cancelled';
  abnRegisteredDate: string; // YYYY-MM-DD
  entityName: string;
  entityType: EntityType;
  gstRegistered: boolean;
  gstRegisteredDate?: string;
  tradingName?: string;
  businessAddress?: string;
  state?: string;
  postcode?: string;
}

export interface EligibilityCheck {
  passed: boolean;
  value: string | number | boolean;
  required: string | number | boolean;
  message?: string;
}

export interface EligibilityResult {
  passed: boolean;
  checks: Record<string, EligibilityCheck>;
  failReasons: string[];
}

// Step 1: Business Details
export interface BusinessDetailsData {
  abn: string;
  abnLookup?: ABNLookupResult;
  businessName?: string; // Used for search before ABN is known
  entityName: string;
  entityType: EntityType;
  tradingName?: string;
  gstRegistered: boolean;
  gstRegisteredDate?: string;
  abnRegisteredDate: string;
  businessAddress: string;
  businessState: string;
  businessPostcode: string;
}

// Step 2: Director Details
export interface DirectorDetailsData {
  directors: Director[];
  primaryContactIndex: number;
}

// Step 3: Asset Details
export interface AssetDetailsData {
  assetType: AssetType;
  assetCategory?: string; // Sub-category like 'ute', 'sedan', 'excavator'
  assetCondition: AssetCondition;
  assetYear?: number;
  assetMake?: string;
  assetModel?: string;
  assetDescription?: string;
  supplierName?: string;
  supplierAbn?: string;
  assetPriceExGst: number;
  assetGst: number;
  assetPriceIncGst: number;
}

// Step 4: Loan Details
export interface LoanDetailsData {
  loanAmount: number;
  depositAmount: number;
  tradeInAmount: number;
  termMonths: number;
  balloonPercentage: number;
  balloonAmount: number;
  businessUsePercentage: number;
}

// Complete application data
export interface ApplicationData {
  id?: string;
  status: ApplicationStatus;
  stepCompleted: number;

  // Step data
  business: BusinessDetailsData;
  directors: DirectorDetailsData;
  asset: AssetDetailsData;
  loan: LoanDetailsData;

  // Quote snapshot
  quote?: {
    indicativeRate: number;
    monthlyRepayment: number;
    totalInterest: number;
    totalRepayments: number;
    totalFeesFinanced: number;
    totalFeesUpfront: number;
    totalCost: number;
  };

  // Eligibility
  eligibility?: EligibilityResult;
}

// Wizard step definitions
export const APPLICATION_STEPS = [
  { id: 0, name: 'business', title: 'Business Details', description: 'ABN and business information' },
  { id: 1, name: 'directors', title: 'Directors', description: 'Director and guarantor details' },
  { id: 2, name: 'asset', title: 'Asset', description: 'What you\'re financing' },
  { id: 3, name: 'loan', title: 'Loan Terms', description: 'Amount, term, and structure' },
  { id: 4, name: 'review', title: 'Review', description: 'Confirm and submit' },
] as const;

export type StepName = typeof APPLICATION_STEPS[number]['name'];

// Asset categories by type
export const ASSET_CATEGORIES: Record<AssetType, { value: string; label: string }[]> = {
  vehicle: [
    { value: 'sedan', label: 'Sedan / Hatch' },
    { value: 'ute', label: 'Ute' },
    { value: 'van', label: 'Van' },
    { value: 'suv', label: 'SUV / 4WD' },
    { value: 'other_vehicle', label: 'Other Vehicle' },
  ],
  truck: [
    { value: 'light_truck', label: 'Light Truck (up to 4.5t)' },
    { value: 'medium_truck', label: 'Medium Truck (4.5-8t)' },
    { value: 'heavy_truck', label: 'Heavy Truck (8t+)' },
    { value: 'prime_mover', label: 'Prime Mover' },
    { value: 'trailer', label: 'Trailer' },
    { value: 'bus', label: 'Bus / Coach' },
  ],
  equipment: [
    { value: 'excavator', label: 'Excavator' },
    { value: 'loader', label: 'Loader' },
    { value: 'forklift', label: 'Forklift' },
    { value: 'crane', label: 'Crane' },
    { value: 'generator', label: 'Generator' },
    { value: 'compressor', label: 'Compressor' },
    { value: 'manufacturing', label: 'Manufacturing Equipment' },
    { value: 'agricultural', label: 'Agricultural Equipment' },
    { value: 'other_equipment', label: 'Other Equipment' },
  ],
};

// Australian states
export const AUSTRALIAN_STATES = [
  { value: 'NSW', label: 'New South Wales' },
  { value: 'VIC', label: 'Victoria' },
  { value: 'QLD', label: 'Queensland' },
  { value: 'WA', label: 'Western Australia' },
  { value: 'SA', label: 'South Australia' },
  { value: 'TAS', label: 'Tasmania' },
  { value: 'ACT', label: 'Australian Capital Territory' },
  { value: 'NT', label: 'Northern Territory' },
];

// Condition labels for display
export const CONDITION_LABELS: Record<AssetCondition, string> = {
  new: 'New',
  demo: 'Demo / Dealer Demo',
  used_0_3: 'Used (0-3 years old)',
  used_4_7: 'Used (4-7 years old)',
  used_8_plus: 'Used (8+ years old)',
};

// Asset type labels
export const ASSET_TYPE_LABELS: Record<AssetType, string> = {
  vehicle: 'Vehicle',
  truck: 'Truck / Trailer',
  equipment: 'Equipment / Machinery',
};

// Default empty application
export function createEmptyApplication(): ApplicationData {
  return {
    status: 'draft',
    stepCompleted: 0,
    business: {
      abn: '',
      entityName: '',
      entityType: 'company',
      gstRegistered: false,
      abnRegisteredDate: '',
      businessAddress: '',
      businessState: '',
      businessPostcode: '',
    },
    directors: {
      directors: [],
      primaryContactIndex: 0,
    },
    asset: {
      assetType: 'vehicle',
      assetCondition: 'new',
      assetPriceExGst: 0,
      assetGst: 0,
      assetPriceIncGst: 0,
    },
    loan: {
      loanAmount: 50000,
      depositAmount: 0,
      tradeInAmount: 0,
      termMonths: 60,
      balloonPercentage: 0,
      balloonAmount: 0,
      businessUsePercentage: 100,
    },
  };
}
