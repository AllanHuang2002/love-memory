export const SITE_CONFIG = {
  coupleName: "我们的纪念册",
  heroTitle: "把日子过成可以回看的光",
  heroSubtitle: "愿望、计划、纪念日和小小瞬间，都在这里慢慢长成我们的故事。",
  startDate: "2023-05-02T20:25:00",
};

export const SPECIAL_DAYS = [
  {
    label: "距离恋爱起点",
    title: "恋爱起点",
    type: "annual",
    month: 5,
    day: 2,
    startDate: "2023-05-02T20:25:00",
  },
  {
    label: "距离烟雨生日",
    type: "annual",
    month: 10,
    day: 23,
    birthDate: "2002-10-23",
  },
  {
    label: "距离西西生日",
    type: "annual",
    month: 7,
    day: 21,
    birthDate: "2002-07-21",
  },
];

export const COMMON_COUPLE_DAYS = [
  {
    title: "情人节",
    type: "solar",
    month: 2,
    day: 14,
  },
  {
    title: "520",
    type: "solar",
    month: 5,
    day: 20,
  },
  {
    title: "七夕",
    type: "chinese-lunar",
    month: 7,
    day: 7,
  },
  {
    title: "圣诞节",
    type: "solar",
    month: 12,
    day: 25,
  },
];

export const PERIOD_TRACKER = {
  enabled: true,
  cycleLength: 28,
  periodLength: 5,
  visibleMonthsAhead: 3,
  ranges: [
    {
      start: "2026-05-01",
      end: "2026-05-05",
    },
  ],
};

export const SUPABASE_CONFIG = {
  url: "https://nefyxensfvviqmktznzb.supabase.co",
  anonKey: "sb_publishable_9YnP0X2R7_DVFQUm36s9LA_BuiRC9Pj",
};
