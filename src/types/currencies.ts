// Currency enum and definitions for POE2 Profit Watch

export enum Currency {
  // Regular currency
  ARCANISTS_ETCHER = 'ARCANISTS_ETCHER',
  ARCHITECTS_ORB = 'ARCHITECTS_ORB',
  ARMORERS_SCRAP = 'ARMORERS_SCRAP',
  ARTIFICERS_ORB = 'ARTIFICERS_ORB',
  BLACKSMITHS_WHETSTONE = 'BLACKSMITHS_WHETSTONE',
  CHAOS_ORB = 'CHAOS_ORB',
  DIVINE_ORB = 'DIVINE_ORB',
  EXALTED_ORB = 'EXALTED_ORB',
  GEMCUTTERS_PRISM = 'GEMCUTTERS_PRISM',
  GLASSBLOWERS_BAUBLE = 'GLASSBLOWERS_BAUBLE',
  GREATER_JEWELLERS_ORB = 'GREATER_JEWELLERS_ORB',
  HINEKORAS_LOCK = 'HINEKORAS_LOCK',
  LESSER_JEWELLERS_ORB = 'LESSER_JEWELLERS_ORB',
  MIRROR_OF_KALANDRA = 'MIRROR_OF_KALANDRA',
  ORB_OF_ALCHEMY = 'ORB_OF_ALCHEMY',
  ORB_OF_ANNULMENT = 'ORB_OF_ANNULMENT',
  ORB_OF_AUGMENTATION = 'ORB_OF_AUGMENTATION',
  ORB_OF_CHANCE = 'ORB_OF_CHANCE',
  ORB_OF_EXTRACTION = 'ORB_OF_EXTRACTION',
  ORB_OF_TRANSMUTATION = 'ORB_OF_TRANSMUTATION',
  PERFECT_JEWELLERS_ORB = 'PERFECT_JEWELLERS_ORB',
  REGAL_ORB = 'REGAL_ORB',
  SCROLL_OF_WISDOM = 'SCROLL_OF_WISDOM',
  VAAL_CULTIVATION_ORB = 'VAAL_CULTIVATION_ORB',
  VAAL_ORB = 'VAAL_ORB',

  // Greater currency
  GREATER_CHAOS_ORB = 'GREATER_CHAOS_ORB',
  GREATER_EXALTED_ORB = 'GREATER_EXALTED_ORB',
  GREATER_ORB_OF_AUGMENTATION = 'GREATER_ORB_OF_AUGMENTATION',
  GREATER_ORB_OF_TRANSMUTATION = 'GREATER_ORB_OF_TRANSMUTATION',
  GREATER_REGAL_ORB = 'GREATER_REGAL_ORB',

  // Perfect currency
  PERFECT_CHAOS_ORB = 'PERFECT_CHAOS_ORB',
  PERFECT_EXALTED_ORB = 'PERFECT_EXALTED_ORB',
  PERFECT_ORB_OF_AUGMENTATION = 'PERFECT_ORB_OF_AUGMENTATION',
  PERFECT_ORB_OF_TRANSMUTATION = 'PERFECT_ORB_OF_TRANSMUTATION',
  PERFECT_REGAL_ORB = 'PERFECT_REGAL_ORB',

  // Shards
  ARTIFICERS_SHARD = 'ARTIFICERS_SHARD',
  CHANCE_SHARD = 'CHANCE_SHARD',
  REGAL_SHARD = 'REGAL_SHARD',
  TRANSMUTATION_SHARD = 'TRANSMUTATION_SHARD',

  // Special currency
  FRACTURING_ORB = 'FRACTURING_ORB',

  // Catalysts
  ADAPTIVE_CATALYST = 'ADAPTIVE_CATALYST',
  CARAPACE_CATALYST = 'CARAPACE_CATALYST',
  CHAYULAS_CATALYST = 'CHAYULAS_CATALYST',
  ESHS_CATALYST = 'ESHS_CATALYST',
  FLESH_CATALYST = 'FLESH_CATALYST',
  NEURAL_CATALYST = 'NEURAL_CATALYST',
  REAVER_CATALYST = 'REAVER_CATALYST',
  SIBILANT_CATALYST = 'SIBILANT_CATALYST',
  SKITTERING_CATALYST = 'SKITTERING_CATALYST',
  TULS_CATALYST = 'TULS_CATALYST',
  UUL_NETOLS_CATALYST = 'UUL_NETOLS_CATALYST',
  XOPHS_CATALYST = 'XOPHS_CATALYST',

  // Expedition currency
  BLACK_SCYTHE_ARTIFACT = 'BLACK_SCYTHE_ARTIFACT',
  BROKEN_CIRCLE_ARTIFACT = 'BROKEN_CIRCLE_ARTIFACT',
  EXOTIC_COINAGE = 'EXOTIC_COINAGE',
  ORDER_ARTIFACT = 'ORDER_ARTIFACT',
  SUN_ARTIFACT = 'SUN_ARTIFACT',

  // Preserved bones
  GNAWED_COLLARBONE = 'GNAWED_COLLARBONE',
  GNAWED_JAWBONE = 'GNAWED_JAWBONE',
  GNAWED_RIB = 'GNAWED_RIB',
  PRESERVED_COLLARBONE = 'PRESERVED_COLLARBONE',
  PRESERVED_JAWBONE = 'PRESERVED_JAWBONE',
  PRESERVED_RIB = 'PRESERVED_RIB',
  PRESERVED_CRANIUM = 'PRESERVED_CRANIUM',
  ANCIENT_COLLARBONE = 'ANCIENT_COLLARBONE',
  ANCIENT_JAWBONE = 'ANCIENT_JAWBONE',
  ANCIENT_RIB = 'ANCIENT_RIB',
}

export interface CurrencyInfo {
  name: string;
  displayName: string;
  category: string;
  imagePath: string;
}

export const currencyInfo: Record<Currency, CurrencyInfo> = {
  // Regular currency
  [Currency.ARCANISTS_ETCHER]: {
    name: "Arcanist's Etcher",
    displayName: "Arcanist's Etcher",
    category: 'Regular',
    imagePath: 'currencies/arcanists-etcher.png',
  },
  [Currency.ARCHITECTS_ORB]: {
    name: "Architect's Orb",
    displayName: "Architect's Orb",
    category: 'Regular',
    imagePath: 'currencies/architects-orb.png',
  },
  [Currency.ARMORERS_SCRAP]: {
    name: "Armourer's Scrap",
    displayName: "Armourer's Scrap",
    category: 'Regular',
    imagePath: 'currencies/armorers-scrap.png',
  },
  [Currency.ARTIFICERS_ORB]: {
    name: "Artificer's Orb",
    displayName: "Artificer's Orb",
    category: 'Regular',
    imagePath: 'currencies/artificers-orb.png',
  },
  [Currency.BLACKSMITHS_WHETSTONE]: {
    name: "Blacksmith's Whetstone",
    displayName: "Blacksmith's Whetstone",
    category: 'Regular',
    imagePath: 'currencies/blacksmiths-whetstone.png',
  },
  [Currency.CHAOS_ORB]: {
    name: 'Chaos Orb',
    displayName: 'Chaos Orb',
    category: 'Regular',
    imagePath: 'currencies/chaos-orb.png',
  },
  [Currency.DIVINE_ORB]: {
    name: 'Divine Orb',
    displayName: 'Divine Orb',
    category: 'Regular',
    imagePath: 'currencies/divine-orb.png',
  },
  [Currency.EXALTED_ORB]: {
    name: 'Exalted Orb',
    displayName: 'Exalted Orb',
    category: 'Regular',
    imagePath: 'currencies/exalted-orb.png',
  },
  [Currency.GEMCUTTERS_PRISM]: {
    name: "Gemcutter's Prism",
    displayName: "Gemcutter's Prism",
    category: 'Regular',
    imagePath: 'currencies/gemcutters-prism.png',
  },
  [Currency.GLASSBLOWERS_BAUBLE]: {
    name: "Glassblower's Bauble",
    displayName: "Glassblower's Bauble",
    category: 'Regular',
    imagePath: 'currencies/glassblowers-bauble.png',
  },
  [Currency.GREATER_JEWELLERS_ORB]: {
    name: "Greater Jeweller's Orb",
    displayName: "Greater Jeweller's Orb",
    category: 'Regular',
    imagePath: 'currencies/greater-jewellers-orb.png',
  },
  [Currency.HINEKORAS_LOCK]: {
    name: "Hinekora's Lock",
    displayName: "Hinekora's Lock",
    category: 'Regular',
    imagePath: 'currencies/hinekoras-lock.png',
  },
  [Currency.LESSER_JEWELLERS_ORB]: {
    name: "Lesser Jeweller's Orb",
    displayName: "Lesser Jeweller's Orb",
    category: 'Regular',
    imagePath: 'currencies/lesser-jewellers-orb.png',
  },
  [Currency.MIRROR_OF_KALANDRA]: {
    name: 'Mirror of Kalandra',
    displayName: 'Mirror of Kalandra',
    category: 'Regular',
    imagePath: 'currencies/mirror-of-kalandra.png',
  },
  [Currency.ORB_OF_ALCHEMY]: {
    name: 'Orb of Alchemy',
    displayName: 'Orb of Alchemy',
    category: 'Regular',
    imagePath: 'currencies/orb-of-alchemy.png',
  },
  [Currency.ORB_OF_ANNULMENT]: {
    name: 'Orb of Annulment',
    displayName: 'Orb of Annulment',
    category: 'Regular',
    imagePath: 'currencies/orb-of-annulment.png',
  },
  [Currency.ORB_OF_AUGMENTATION]: {
    name: 'Orb of Augmentation',
    displayName: 'Orb of Augmentation',
    category: 'Regular',
    imagePath: 'currencies/orb-of-augmentation.png',
  },
  [Currency.ORB_OF_CHANCE]: {
    name: 'Orb of Chance',
    displayName: 'Orb of Chance',
    category: 'Regular',
    imagePath: 'currencies/orb-of-chance.png',
  },
  [Currency.ORB_OF_EXTRACTION]: {
    name: 'Orb of Extraction',
    displayName: 'Orb of Extraction',
    category: 'Regular',
    imagePath: 'currencies/orb-of-extraction.png',
  },
  [Currency.ORB_OF_TRANSMUTATION]: {
    name: 'Orb of Transmutation',
    displayName: 'Orb of Transmutation',
    category: 'Regular',
    imagePath: 'currencies/orb-of-transmutation.png',
  },
  [Currency.PERFECT_JEWELLERS_ORB]: {
    name: "Perfect Jeweller's Orb",
    displayName: "Perfect Jeweller's Orb",
    category: 'Regular',
    imagePath: 'currencies/perfect-jewellers-orb.png',
  },
  [Currency.REGAL_ORB]: {
    name: 'Regal Orb',
    displayName: 'Regal Orb',
    category: 'Regular',
    imagePath: 'currencies/regal-orb.png',
  },
  [Currency.SCROLL_OF_WISDOM]: {
    name: 'Scroll of Wisdom',
    displayName: 'Scroll of Wisdom',
    category: 'Regular',
    imagePath: '',
  },
  [Currency.VAAL_CULTIVATION_ORB]: {
    name: 'Vaal Cultivation Orb',
    displayName: 'Vaal Cultivation Orb',
    category: 'Regular',
    imagePath: '',
  },
  [Currency.VAAL_ORB]: {
    name: 'Vaal Orb',
    displayName: 'Vaal Orb',
    category: 'Regular',
    imagePath: 'currencies/vaal-orb.png',
  },

  // Greater currency
  [Currency.GREATER_CHAOS_ORB]: {
    name: 'Greater Chaos Orb',
    displayName: 'Greater Chaos Orb',
    category: 'Greater',
    imagePath: 'currencies/greater-chaos-orb.png',
  },
  [Currency.GREATER_EXALTED_ORB]: {
    name: 'Greater Exalted Orb',
    displayName: 'Greater Exalted Orb',
    category: 'Greater',
    imagePath: 'currencies/greater-exalted-orb.png',
  },
  [Currency.GREATER_ORB_OF_AUGMENTATION]: {
    name: 'Greater Orb of Augmentation',
    displayName: 'Greater Orb of Augmentation',
    category: 'Greater',
    imagePath: 'currencies/greater-orb-of-augmentation.png',
  },
  [Currency.GREATER_ORB_OF_TRANSMUTATION]: {
    name: 'Greater Orb of Transmutation',
    displayName: 'Greater Orb of Transmutation',
    category: 'Greater',
    imagePath: 'currencies/greater-orb-of-transmutation.png',
  },
  [Currency.GREATER_REGAL_ORB]: {
    name: 'Greater Regal Orb',
    displayName: 'Greater Regal Orb',
    category: 'Greater',
    imagePath: 'currencies/greater-regal-orb.png',
  },

  // Perfect currency
  [Currency.PERFECT_CHAOS_ORB]: {
    name: 'Perfect Chaos Orb',
    displayName: 'Perfect Chaos Orb',
    category: 'Perfect',
    imagePath: 'currencies/perfect-chaos-orb.png',
  },
  [Currency.PERFECT_EXALTED_ORB]: {
    name: 'Perfect Exalted Orb',
    displayName: 'Perfect Exalted Orb',
    category: 'Perfect',
    imagePath: 'currencies/perfect-exalted-orb.png',
  },
  [Currency.PERFECT_ORB_OF_AUGMENTATION]: {
    name: 'Perfect Orb of Augmentation',
    displayName: 'Perfect Orb of Augmentation',
    category: 'Perfect',
    imagePath: 'currencies/perfect-orb-of-augmentation.png',
  },
  [Currency.PERFECT_ORB_OF_TRANSMUTATION]: {
    name: 'Perfect Orb of Transmutation',
    displayName: 'Perfect Orb of Transmutation',
    category: 'Perfect',
    imagePath: 'currencies/perfect-orb-of-transmutation.png',
  },
  [Currency.PERFECT_REGAL_ORB]: {
    name: 'Perfect Regal Orb',
    displayName: 'Perfect Regal Orb',
    category: 'Perfect',
    imagePath: 'currencies/perfect-regal-orb.png',
  },

  // Shards
  [Currency.ARTIFICERS_SHARD]: {
    name: "Artificer's Shard",
    displayName: "Artificer's Shard",
    category: 'Shards',
    imagePath: 'currencies/artificers-shard.png',
  },
  [Currency.CHANCE_SHARD]: {
    name: 'Chance Shard',
    displayName: 'Chance Shard',
    category: 'Shards',
    imagePath: 'currencies/chance-shard.png',
  },
  [Currency.REGAL_SHARD]: {
    name: 'Regal Shard',
    displayName: 'Regal Shard',
    category: 'Shards',
    imagePath: '',
  },
  [Currency.TRANSMUTATION_SHARD]: {
    name: 'Transmutation Shard',
    displayName: 'Transmutation Shard',
    category: 'Shards',
    imagePath: '',
  },

  // Special currency
  [Currency.FRACTURING_ORB]: {
    name: 'Fracturing Orb',
    displayName: 'Fracturing Orb',
    category: 'Special',
    imagePath: '',
  },

  // Catalysts
  [Currency.ADAPTIVE_CATALYST]: {
    name: 'Adaptive Catalyst',
    displayName: 'Adaptive Catalyst',
    category: 'Catalysts',
    imagePath: 'currencies/adaptive-catalyst.png',
  },
  [Currency.CARAPACE_CATALYST]: {
    name: 'Carapace Catalyst',
    displayName: 'Carapace Catalyst',
    category: 'Catalysts',
    imagePath: '',
  },
  [Currency.CHAYULAS_CATALYST]: {
    name: "Chayula's Catalyst",
    displayName: "Chayula's Catalyst",
    category: 'Catalysts',
    imagePath: '',
  },
  [Currency.ESHS_CATALYST]: {
    name: "Esh's Catalyst",
    displayName: "Esh's Catalyst",
    category: 'Catalysts',
    imagePath: '',
  },
  [Currency.FLESH_CATALYST]: {
    name: 'Flesh Catalyst',
    displayName: 'Flesh Catalyst',
    category: 'Catalysts',
    imagePath: '',
  },
  [Currency.NEURAL_CATALYST]: {
    name: 'Neural Catalyst',
    displayName: 'Neural Catalyst',
    category: 'Catalysts',
    imagePath: '',
  },
  [Currency.REAVER_CATALYST]: {
    name: 'Reaver Catalyst',
    displayName: 'Reaver Catalyst',
    category: 'Catalysts',
    imagePath: '',
  },
  [Currency.SIBILANT_CATALYST]: {
    name: 'Sibilant Catalyst',
    displayName: 'Sibilant Catalyst',
    category: 'Catalysts',
    imagePath: '',
  },
  [Currency.SKITTERING_CATALYST]: {
    name: 'Skittering Catalyst',
    displayName: 'Skittering Catalyst',
    category: 'Catalysts',
    imagePath: '',
  },
  [Currency.TULS_CATALYST]: {
    name: "Tul's Catalyst",
    displayName: "Tul's Catalyst",
    category: 'Catalysts',
    imagePath: '',
  },
  [Currency.UUL_NETOLS_CATALYST]: {
    name: "Uul-Netol's Catalyst",
    displayName: "Uul-Netol's Catalyst",
    category: 'Catalysts',
    imagePath: '',
  },
  [Currency.XOPHS_CATALYST]: {
    name: "Xoph's Catalyst",
    displayName: "Xoph's Catalyst",
    category: 'Catalysts',
    imagePath: '',
  },

  // Expedition currency
  [Currency.BLACK_SCYTHE_ARTIFACT]: {
    name: 'Black Scythe Artifact',
    displayName: 'Black Scythe Artifact',
    category: 'Expedition',
    imagePath: 'currencies/black-scythe-artifact.png',
  },
  [Currency.BROKEN_CIRCLE_ARTIFACT]: {
    name: 'Broken Circle Artifact',
    displayName: 'Broken Circle Artifact',
    category: 'Expedition',
    imagePath: '',
  },
  [Currency.EXOTIC_COINAGE]: {
    name: 'Exotic Coinage',
    displayName: 'Exotic Coinage',
    category: 'Expedition',
    imagePath: '',
  },
  [Currency.ORDER_ARTIFACT]: {
    name: 'Order Artifact',
    displayName: 'Order Artifact',
    category: 'Expedition',
    imagePath: '',
  },
  [Currency.SUN_ARTIFACT]: {
    name: 'Sun Artifact',
    displayName: 'Sun Artifact',
    category: 'Expedition',
    imagePath: '',
  },

  // Preserved bones
  [Currency.GNAWED_COLLARBONE]: {
    name: 'Gnawed Collarbone',
    displayName: 'Gnawed Collarbone',
    category: 'Preserved Bones',
    imagePath: '',
  },
  [Currency.GNAWED_JAWBONE]: {
    name: 'Gnawed Jawbone',
    displayName: 'Gnawed Jawbone',
    category: 'Preserved Bones',
    imagePath: 'currencies/gnawed-jawbone.png',
  },
  [Currency.GNAWED_RIB]: {
    name: 'Gnawed Rib',
    displayName: 'Gnawed Rib',
    category: 'Preserved Bones',
    imagePath: 'currencies/gnawed-rib.png',
  },
  [Currency.PRESERVED_COLLARBONE]: {
    name: 'Preserved Collarbone',
    displayName: 'Preserved Collarbone',
    category: 'Preserved Bones',
    imagePath: '',
  },
  [Currency.PRESERVED_JAWBONE]: {
    name: 'Preserved Jawbone',
    displayName: 'Preserved Jawbone',
    category: 'Preserved Bones',
    imagePath: '',
  },
  [Currency.PRESERVED_RIB]: {
    name: 'Preserved Rib',
    displayName: 'Preserved Rib',
    category: 'Preserved Bones',
    imagePath: '',
  },
  [Currency.PRESERVED_CRANIUM]: {
    name: 'Preserved Cranium',
    displayName: 'Preserved Cranium',
    category: 'Preserved Bones',
    imagePath: '',
  },
  [Currency.ANCIENT_COLLARBONE]: {
    name: 'Ancient Collarbone',
    displayName: 'Ancient Collarbone',
    category: 'Preserved Bones',
    imagePath: '',
  },
  [Currency.ANCIENT_JAWBONE]: {
    name: 'Ancient Jawbone',
    displayName: 'Ancient Jawbone',
    category: 'Preserved Bones',
    imagePath: '',
  },
  [Currency.ANCIENT_RIB]: {
    name: 'Ancient Rib',
    displayName: 'Ancient Rib',
    category: 'Preserved Bones',
    imagePath: '',
  },
};
