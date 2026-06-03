export const REWARDS = [
  { key: 'rice_1kg',              label: 'Beras Cap Fajar 1kg',          labelMs: 'Beras Cap Fajar 1kg',           points: 30  },
  { key: 'sugar_1kg',             label: 'Gula Prai 1kg',                labelMs: 'Gula Prai 1kg',                 points: 40  },
  { key: 'instant_noodles_5pack', label: 'Maggi Mi Goreng 5-pack',       labelMs: 'Maggi Mi Goreng 5 Bungkus',     points: 40  },
  { key: 'canned_sardines_425g',  label: 'Ayam Brand Sardines 425g',     labelMs: 'Ayam Brand Sardin 425g',        points: 45  },
  { key: 'condensed_milk_397g',   label: 'Carnation Condensed Milk 397g',labelMs: 'Susu Pekat Carnation 397g',     points: 45  },
  { key: 'cooking_oil_1L',        label: 'Saji Cooking Oil 1L',          labelMs: 'Minyak Masak Saji 1L',          points: 50  },
  { key: 'dish_soap_500ml',       label: 'Mama Lemon Dish Soap 500ml',   labelMs: 'Mama Lemon Sabun Pinggan 500ml',points: 50  },
  { key: 'toothpaste_160g',       label: 'Darlie Toothpaste Family Pack', labelMs: 'Ubat Gigi Darlie Keluarga',    points: 55  },
  { key: 'detergent_powder_500g', label: 'Breeze Detergent 500g',        labelMs: 'Breeze Detergen 500g',          points: 60  },
  { key: 'garbage_bags_30pack',   label: 'Zipit Garbage Bags 30-pack',   labelMs: 'Zipit Beg Sampah 30 Keping',   points: 65  },
  { key: 'toilet_roll_4pack',     label: 'Paseo Toilet Rolls 4-pack',    labelMs: 'Paseo Tisu Tandas 4 Gulung',   points: 70  },
  { key: 'floor_cleaner_1L',      label: 'Dettol Floor Cleaner 1L',      labelMs: 'Dettol Pencuci Lantai 1L',     points: 80  },
  { key: 'shampoo_320ml',         label: 'Sunsilk Shampoo Family Size',  labelMs: 'Sunsilk Syampu Keluarga',      points: 90  },
] as const

export type RewardKey = typeof REWARDS[number]['key']
