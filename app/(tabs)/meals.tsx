import React, { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Check, Plus, RefreshCw, ShoppingCart } from 'lucide-react-native';
import {
  CoachPlans,
  ExpandableCard,
  FadeInView,
  GlassCard,
  PillButton,
  Screen,
  SectionHeader,
  SegmentedControl,
  Text,
} from '@/components';
import { useTheme } from '@/theme';
import { useUserStore } from '@/store/userStore';
import { useLogStore } from '@/store/logStore';
import { GroceryItem, Meal } from '@/types';
import {
  buildGroceryList,
  generateDay,
  GROCERY_LABELS,
  regenerateMeal,
} from '@/lib/mealGenerator';

type Tab = 'meals' | 'grocery';

export default function Meals() {
  const theme = useTheme();
  const profile = useUserStore((s) => s.profile);
  const plan = useUserStore((s) => s.plan);
  const addMeal = useLogStore((s) => s.addMeal);
  const [tab, setTab] = useState<Tab>('meals');
  const [seed, setSeed] = useState(0);

  const opts = useMemo(
    () => ({
      calories: plan?.targets.calories ?? 2000,
      diet: profile?.diet ?? 'balanced',
      allergies: profile?.allergies ?? [],
      seed,
    }),
    [plan, profile, seed],
  );

  const [meals, setMeals] = useState<Meal[]>(() => generateDay(opts));
  const [logged, setLogged] = useState<Record<string, boolean>>({});
  const [grocery, setGrocery] = useState<GroceryItem[]>(() => buildGroceryList(meals));

  const regenerateAll = () => {
    const next = generateDay({ ...opts, seed: seed + 1 });
    setSeed((s) => s + 1);
    setMeals(next);
    setGrocery(buildGroceryList(next));
    setLogged({});
  };

  const regenerateOne = (meal: Meal) => {
    const replacement = regenerateMeal(meal, { ...opts, seed: seed + meal.id.length });
    const next = meals.map((m) => (m.id === meal.id && m.type === meal.type ? replacement : m));
    setMeals(next);
    setGrocery(buildGroceryList(next));
  };

  const logMeal = (meal: Meal) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    addMeal(meal.calories, meal.proteinG);
    setLogged((l) => ({ ...l, [meal.type]: true }));
  };

  const total = meals.reduce(
    (acc, m) => ({
      cal: acc.cal + m.calories,
      p: acc.p + m.proteinG,
      c: acc.c + m.carbsG,
      f: acc.f + m.fatG,
    }),
    { cal: 0, p: 0, c: 0, f: 0 },
  );

  const toggleGrocery = (id: string) =>
    setGrocery((items) => items.map((i) => (i.id === id ? { ...i, checked: !i.checked } : i)));

  const grouped = useMemo(() => {
    const map: Record<string, GroceryItem[]> = {};
    grocery.forEach((i) => {
      (map[i.category] ??= []).push(i);
    });
    return map;
  }, [grocery]);

  return (
    <Screen>
      <View style={{ marginTop: theme.spacing.sm, marginBottom: theme.spacing.md }}>
        <Text variant="largeTitle">Meal Plan</Text>
        <Text variant="subhead" color="textTertiary">
          Personalized for {profile?.diet.replace('_', ' ')} · {plan?.targets.calories} kcal
        </Text>
      </View>

      <CoachPlans kind="meal" />

      <SegmentedControl<Tab>
        value={tab}
        onChange={setTab}
        options={[
          { label: 'Today', value: 'meals' },
          { label: 'Groceries', value: 'grocery' },
        ]}
      />

      {tab === 'meals' ? (
        <>
          <FadeInView delay={60}>
            <GlassCard style={{ marginTop: theme.spacing.md }}>
              <Text variant="caption" color="textTertiary">DAILY TOTAL</Text>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
                <Macro label="Calories" value={`${total.cal}`} />
                <Macro label="Protein" value={`${total.p}g`} color={theme.colors.protein} />
                <Macro label="Carbs" value={`${total.c}g`} color={theme.colors.carbs} />
                <Macro label="Fat" value={`${total.f}g`} color={theme.colors.fat} />
              </View>
            </GlassCard>
          </FadeInView>

          <SectionHeader
            title="Your Meals"
            right={
              <Pressable
                onPress={regenerateAll}
                hitSlop={8}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
              >
                <RefreshCw size={16} color={theme.colors.primary} />
                <Text variant="subhead" color="primary">Regenerate</Text>
              </Pressable>
            }
          />

          <View style={{ gap: theme.spacing.sm }}>
            {meals.map((meal, i) => (
              <FadeInView key={meal.type} delay={i * 60}>
                <MealCard
                  meal={meal}
                  logged={!!logged[meal.type]}
                  onLog={() => logMeal(meal)}
                  onRegenerate={() => regenerateOne(meal)}
                />
              </FadeInView>
            ))}
          </View>
        </>
      ) : (
        <>
          <FadeInView delay={60}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
                marginTop: theme.spacing.md,
                marginBottom: theme.spacing.sm,
              }}
            >
              <ShoppingCart size={20} color={theme.colors.primary} />
              <Text variant="title3">Shopping List</Text>
              <View style={{ flex: 1 }} />
              <Text variant="footnote" color="textTertiary">
                {grocery.filter((g) => g.checked).length}/{grocery.length}
              </Text>
            </View>
          </FadeInView>

          {Object.entries(grouped).map(([cat, items], gi) => (
            <FadeInView key={cat} delay={gi * 50}>
              <SectionHeader title={GROCERY_LABELS[cat as keyof typeof GROCERY_LABELS]} />
              <GlassCard padded={false}>
                {items.map((item, idx) => (
                  <Pressable
                    key={item.id}
                    onPress={() => toggleGrocery(item.id)}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: theme.spacing.md,
                      padding: theme.spacing.md,
                      borderTopWidth: idx === 0 ? 0 : 1,
                      borderTopColor: theme.colors.separator,
                    }}
                  >
                    <View
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: 8,
                        borderWidth: 2,
                        borderColor: item.checked ? theme.colors.success : theme.colors.textTertiary,
                        backgroundColor: item.checked ? theme.colors.success : 'transparent',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {item.checked && <Check size={14} color="#fff" strokeWidth={3} />}
                    </View>
                    <Text
                      variant="callout"
                      style={{
                        flex: 1,
                        textDecorationLine: item.checked ? 'line-through' : 'none',
                        opacity: item.checked ? 0.5 : 1,
                      }}
                    >
                      {item.name}
                    </Text>
                    <Text variant="footnote" color="textTertiary">{item.amount}</Text>
                  </Pressable>
                ))}
              </GlassCard>
            </FadeInView>
          ))}
          <View style={{ height: theme.spacing.lg }} />
          <PillButton label="Share List" variant="secondary" onPress={() => {}} />
        </>
      )}
    </Screen>
  );
}

function Macro({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <View>
      <Text variant="headline" style={color ? { color } : undefined}>{value}</Text>
      <Text variant="caption" color="textTertiary">{label}</Text>
    </View>
  );
}

const MEAL_LABEL: Record<Meal['type'], string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snack',
};

function MealCard({
  meal,
  logged,
  onLog,
  onRegenerate,
}: {
  meal: Meal;
  logged: boolean;
  onLog: () => void;
  onRegenerate: () => void;
}) {
  const theme = useTheme();
  return (
    <ExpandableCard
      header={
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
          <Text style={{ fontSize: 32 }}>{meal.emoji}</Text>
          <View style={{ flex: 1 }}>
            <Text variant="caption" color="primary" style={{ letterSpacing: 0.5 }}>
              {MEAL_LABEL[meal.type].toUpperCase()}
            </Text>
            <Text variant="headline">{meal.name}</Text>
            <Text variant="caption" color="textTertiary">
              {meal.calories} kcal · {meal.proteinG}p / {meal.carbsG}c / {meal.fatG}f · {meal.prepMinutes}min
            </Text>
          </View>
        </View>
      }
    >
      <Text variant="subhead" style={{ fontWeight: '700', marginTop: 4 }}>Recipe</Text>
      {meal.recipe.map((step, i) => (
        <View key={i} style={{ flexDirection: 'row', gap: 8 }}>
          <Text variant="footnote" color="primary" style={{ fontWeight: '700' }}>{i + 1}.</Text>
          <Text variant="footnote" color="textSecondary" style={{ flex: 1 }}>{step}</Text>
        </View>
      ))}

      <Text variant="subhead" style={{ fontWeight: '700', marginTop: 8 }}>Ingredients</Text>
      {meal.ingredients.map((ing, i) => (
        <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text variant="footnote" color="textSecondary">• {ing.name}</Text>
          <Text variant="footnote" color="textTertiary">{ing.amount}</Text>
        </View>
      ))}

      {meal.substitutions.length > 0 && (
        <>
          <Text variant="subhead" style={{ fontWeight: '700', marginTop: 8 }}>Substitutions</Text>
          {meal.substitutions.map((s, i) => (
            <Text key={i} variant="footnote" color="textSecondary">↔ {s}</Text>
          ))}
        </>
      )}

      <View style={{ flexDirection: 'row', gap: theme.spacing.sm, marginTop: theme.spacing.md }}>
        <Pressable
          onPress={onRegenerate}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            paddingHorizontal: theme.spacing.md,
            height: 44,
            borderRadius: theme.radius.pill,
            borderWidth: 1.5,
            borderColor: theme.colors.primary,
          }}
        >
          <RefreshCw size={16} color={theme.colors.primary} />
          <Text variant="subhead" color="primary">Regenerate</Text>
        </Pressable>
        <Pressable
          onPress={onLog}
          disabled={logged}
          style={{
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            height: 44,
            borderRadius: theme.radius.pill,
            backgroundColor: logged ? theme.colors.success : theme.colors.primary,
          }}
        >
          {logged ? <Check size={16} color="#fff" /> : <Plus size={16} color="#fff" />}
          <Text variant="subhead" color="textInverse">{logged ? 'Logged' : 'Log meal'}</Text>
        </Pressable>
      </View>
    </ExpandableCard>
  );
}
