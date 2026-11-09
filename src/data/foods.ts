export interface Dish {
  name: string
  emoji: string
  category: string
  tags?: string[]
}

export const FOOD_CATEGORIES = [
  '全部',
  '中餐',
  '面食',
  '快餐',
  '日韩',
  '西餐',
  '火锅烧烤',
  '清淡健康',
  '甜品饮品',
] as const

export type FoodCategory = (typeof FOOD_CATEGORIES)[number]

export const DISHES: Dish[] = [
  // 中餐
  { name: '宫保鸡丁', emoji: '🍗', category: '中餐', tags: ['下饭', '微辣'] },
  { name: '鱼香肉丝', emoji: '🥢', category: '中餐', tags: ['下饭'] },
  { name: '麻婆豆腐', emoji: '🌶️', category: '中餐', tags: ['麻辣'] },
  { name: '红烧肉', emoji: '🍖', category: '中餐', tags: ['硬菜'] },
  { name: '回锅肉', emoji: '🥓', category: '中餐', tags: ['下饭'] },
  { name: '可乐鸡翅', emoji: '🍗', category: '中餐', tags: ['甜咸'] },
  { name: '番茄炒蛋', emoji: '🍅', category: '中餐', tags: ['家常'] },
  { name: '青椒土豆丝', emoji: '🥔', category: '中餐', tags: ['家常'] },
  { name: '糖醋里脊', emoji: '🍖', category: '中餐', tags: ['酸甜'] },
  { name: '水煮牛肉', emoji: '🥩', category: '中餐', tags: ['麻辣'] },
  { name: '酸菜鱼', emoji: '🐟', category: '中餐', tags: ['酸辣'] },
  { name: '小炒黄牛肉', emoji: '🥩', category: '中餐', tags: ['下饭'] },
  { name: '干锅花菜', emoji: '🥦', category: '中餐', tags: ['素食'] },
  { name: '蒜蓉西兰花', emoji: '🥦', category: '中餐', tags: ['素食'] },
  { name: '鸡公煲', emoji: '🍲', category: '中餐', tags: ['热乎'] },
  { name: '黄焖鸡米饭', emoji: '🍚', category: '中餐', tags: ['一人食'] },

  // 面食
  { name: '兰州牛肉面', emoji: '🍜', category: '面食', tags: ['汤面'] },
  { name: '炸酱面', emoji: '🍜', category: '面食', tags: ['拌面'] },
  { name: '西红柿鸡蛋面', emoji: '🍜', category: '面食', tags: ['家常'] },
  { name: '重庆小面', emoji: '🌶️', category: '面食', tags: ['麻辣'] },
  { name: '刀削面', emoji: '🍜', category: '面食', tags: ['汤面'] },
  { name: '热干面', emoji: '🍜', category: '面食', tags: ['拌面'] },
  { name: '饺子', emoji: '🥟', category: '面食', tags: ['经典'] },
  { name: '馄饨', emoji: '🥟', category: '面食', tags: ['汤'] },
  { name: '生煎包', emoji: '🥟', category: '面食', tags: ['小吃'] },
  { name: '牛肉粉丝汤', emoji: '🍲', category: '面食', tags: ['汤'] },

  // 快餐
  { name: '汉堡薯条', emoji: '🍔', category: '快餐', tags: ['西式'] },
  { name: '炸鸡', emoji: '🍗', category: '快餐', tags: ['解馋'] },
  { name: '披萨', emoji: '🍕', category: '快餐', tags: ['分享'] },
  { name: '煎饼果子', emoji: '🌯', category: '快餐', tags: ['早餐'] },
  { name: '肉夹馍', emoji: '🥙', category: '快餐', tags: ['小吃'] },
  { name: '麻辣烫', emoji: '🍲', category: '快餐', tags: ['自选'] },
  { name: '螺蛳粉', emoji: '🍜', category: '快餐', tags: ['重口'] },
  { name: '手抓饼', emoji: '🥞', category: '快餐', tags: ['早餐'] },
  { name: '关东煮', emoji: '🍢', category: '快餐', tags: ['小吃'] },

  // 日韩
  { name: '日式拉面', emoji: '🍜', category: '日韩', tags: ['汤面'] },
  { name: '寿司', emoji: '🍣', category: '日韩', tags: ['清爽'] },
  { name: '咖喱饭', emoji: '🍛', category: '日韩', tags: ['浓郁'] },
  { name: '天妇罗', emoji: '🍤', category: '日韩', tags: ['酥脆'] },
  { name: '石锅拌饭', emoji: '🍚', category: '日韩', tags: ['拌饭'] },
  { name: '韩式炸鸡', emoji: '🍗', category: '日韩', tags: ['甜辣'] },
  { name: '部队锅', emoji: '🍲', category: '日韩', tags: ['热乎'] },
  { name: '烤肉盖饭', emoji: '🍱', category: '日韩', tags: ['下饭'] },

  // 西餐
  { name: '牛排', emoji: '🥩', category: '西餐', tags: ['仪式感'] },
  { name: '意大利面', emoji: '🍝', category: '西餐', tags: ['经典'] },
  { name: '凯撒沙拉', emoji: '🥗', category: '西餐', tags: ['清爽'] },
  { name: '三明治', emoji: '🥪', category: '西餐', tags: ['轻食'] },
  { name: '焗饭', emoji: '🧀', category: '西餐', tags: ['芝士'] },
  { name: '炸鱼薯条', emoji: '🐟', category: '西餐', tags: ['酥脆'] },

  // 火锅烧烤
  { name: '重庆火锅', emoji: '🍲', category: '火锅烧烤', tags: ['麻辣', '热闹'] },
  { name: '潮汕牛肉火锅', emoji: '🍲', category: '火锅烧烤', tags: ['鲜嫩'] },
  { name: '串串香', emoji: '🍢', category: '火锅烧烤', tags: ['自选'] },
  { name: '烧烤撸串', emoji: '🍢', category: '火锅烧烤', tags: ['夜宵'] },
  { name: '韩式烤肉', emoji: '🥩', category: '火锅烧烤', tags: ['聚餐'] },
  { name: '椰子鸡', emoji: '🥥', category: '火锅烧烤', tags: ['清甜'] },

  // 清淡健康
  { name: '蔬菜沙拉', emoji: '🥗', category: '清淡健康', tags: ['轻食'] },
  { name: '鸡胸肉藜麦碗', emoji: '🥣', category: '清淡健康', tags: ['高蛋白'] },
  { name: '蒸鱼', emoji: '🐟', category: '清淡健康', tags: ['清淡'] },
  { name: '杂粮粥配小菜', emoji: '🥣', category: '清淡健康', tags: ['养胃'] },
  { name: '番茄豆腐汤', emoji: '🍲', category: '清淡健康', tags: ['低脂'] },
  { name: '水煮青菜', emoji: '🥬', category: '清淡健康', tags: ['素食'] },

  // 甜品饮品
  { name: '芋圆奶茶', emoji: '🧋', category: '甜品饮品', tags: ['甜品'] },
  { name: '杨枝甘露', emoji: '🥭', category: '甜品饮品', tags: ['甜品'] },
  { name: '双皮奶', emoji: '🍮', category: '甜品饮品', tags: ['甜品'] },
  { name: '冰淇淋', emoji: '🍦', category: '甜品饮品', tags: ['冰爽'] },
  { name: '水果捞', emoji: '🍉', category: '甜品饮品', tags: ['清爽'] },
  { name: '美式咖啡', emoji: '☕', category: '甜品饮品', tags: ['提神'] },
]

export function dishesByCategory(category: FoodCategory): Dish[] {
  if (category === '全部') return DISHES
  return DISHES.filter((d) => d.category === category)
}
