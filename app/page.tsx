"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Meal = {
  id: string;
  food_name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  created_at: string;
};

type MealForm = {
  foodName: string;
  calories: string;
  protein: string;
  carbs: string;
  fat: string;
};

const emptyForm: MealForm = {
  foodName: "",
  calories: "",
  protein: "",
  carbs: "",
  fat: "",
};

function getDayRange(date: Date) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  return { start: start.toISOString(), end: end.toISOString() };
}

export default function Home() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState<MealForm>(emptyForm);
  const [meals, setMeals] = useState<Meal[]>([]);
  const [isLoadingMeals, setIsLoadingMeals] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [isEditingGoal, setIsEditingGoal] = useState(false);
  const [calorieGoal, setCalorieGoal] = useState<number>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("h_sync_calorie_goal");
      return saved ? Number(saved) : 2000;
    }
    return 2000;
  });

  const caloriesEaten = meals.reduce((sum, meal) => sum + meal.calories, 0);
  const proteinEaten = meals.reduce((sum, meal) => sum + meal.protein, 0);
  const carbsEaten = meals.reduce((sum, meal) => sum + meal.carbs, 0);
  const fatEaten = meals.reduce((sum, meal) => sum + meal.fat, 0);

  const macros = [
    { label: "Protein", value: proteinEaten, unit: "g", color: "bg-emerald-400" },
    { label: "Carbs", value: carbsEaten, unit: "g", color: "bg-sky-400" },
    { label: "Fat", value: fatEaten, unit: "g", color: "bg-amber-400" },
  ];

  async function fetchMealsForDate(date: Date) {
    setIsLoadingMeals(true);
    const { start, end } = getDayRange(date);

    const { data, error } = await supabase
      .from("meals")
      .select("id, food_name, calories, protein, carbs, fat, created_at")
      .gte("created_at", start)
      .lte("created_at", end)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Failed to fetch meals:", error.message);
    } else {
      setMeals(data ?? []);
    }
    setIsLoadingMeals(false);
  }

  useEffect(() => {
    fetchMealsForDate(currentDate);
  }, [currentDate]);

  function handleGoalChange(e: React.ChangeEvent<HTMLInputElement>) {
    const newGoal = Number(e.target.value);
    setCalorieGoal(newGoal);
    localStorage.setItem("h_sync_calorie_goal", newGoal.toString());
  }

  function openModal() {
    setIsModalOpen(true);
  }

  function closeModal() {
    setIsModalOpen(false);
    setForm(emptyForm);
  }

  function handleChange(field: keyof MealForm, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setIsSaving(true);

    const { error } = await supabase.from("meals").insert({
      food_name: form.foodName,
      calories: Number(form.calories) || 0,
      protein: Number(form.protein) || 0,
      carbs: Number(form.carbs) || 0,
      fat: Number(form.fat) || 0,
      created_at: currentDate.toISOString(), 
    });

    setIsSaving(false);

    if (error) {
      console.error("Failed to save meal:", error.message);
      return;
    }

    await fetchMealsForDate(currentDate);
    closeModal();
  }

  async function handleDelete(meal: Meal) {
    setDeletingId(meal.id);
    const { error } = await supabase.from("meals").delete().eq("id", meal.id);
    setDeletingId(null);

    if (error) {
      console.error("Failed to delete meal:", error.message);
      return;
    }
    setMeals((prev) => prev.filter((item) => item.id !== meal.id));
  }

  function prevDay() {
    setCurrentDate((prev) => {
      const d = new Date(prev);
      d.setDate(d.getDate() - 1);
      return d;
    });
  }

  function nextDay() {
    setCurrentDate((prev) => {
      const d = new Date(prev);
      d.setDate(d.getDate() + 1);
      return d;
    });
  }

  const isToday = currentDate.toDateString() === new Date().toDateString();
  const dateDisplay = isToday
    ? "Today"
    : currentDate.toLocaleDateString("en-US", { month: "short", day: "numeric" });

  const inputClassName =
    "w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-zinc-500 outline-none backdrop-blur-md transition-colors focus:border-emerald-400/40 focus:bg-white/10";

  return (
    <div className="relative flex min-h-full flex-1 flex-col overflow-hidden bg-zinc-950 text-zinc-100">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <div className="absolute -left-32 top-0 h-96 w-96 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="absolute -right-24 top-1/3 h-80 w-80 rounded-full bg-teal-500/10 blur-3xl" />
        <div className="absolute bottom-0 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-violet-500/8 blur-3xl" />
      </div>

      <header className="relative border-b border-white/10 bg-white/5 backdrop-blur-lg">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-6 py-5">
          <h1 className="bg-gradient-to-r from-white via-white to-emerald-400 bg-clip-text text-xl font-black tracking-tighter text-transparent">
            H-Sync Tracker
          </h1>
          
          {/* New Date Navigator */}
          <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-2 py-1 backdrop-blur-lg">
            <button
              onClick={prevDay}
              className="rounded px-2 py-0.5 text-zinc-400 transition-colors hover:bg-white/10 hover:text-white"
            >
              &larr;
            </button>
            <span className="w-16 text-center text-xs font-medium text-zinc-300">
              {dateDisplay}
            </span>
            <button
              onClick={nextDay}
              disabled={isToday}
              className={`rounded px-2 py-0.5 text-zinc-400 transition-colors ${
                isToday ? "opacity-30 cursor-not-allowed" : "hover:bg-white/10 hover:text-white"
              }`}
            >
              &rarr;
            </button>
          </div>
        </div>
      </header>

      <main className="relative mx-auto flex w-full max-w-2xl flex-1 flex-col px-6 py-12 pb-32">
        <div className="w-full rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl shadow-black/20 backdrop-blur-lg sm:p-10">
          <p className="text-center text-sm font-medium uppercase tracking-widest text-zinc-400">
            Calories eaten
          </p>

          <div className="mt-6 flex items-baseline justify-center gap-2">
            <span className="text-7xl font-bold tabular-nums tracking-tight text-white sm:text-8xl">
              {caloriesEaten}
            </span>
            <span className="text-2xl font-medium text-zinc-400">kcal</span>
          </div>

          <div className="mt-8">
            <div className="mb-2 flex items-center justify-between text-xs text-zinc-400">
              <span>Progress</span>
              <span className="flex items-center gap-1.5">
                {caloriesEaten} /
                {isEditingGoal ? (
                  <input
                    type="number"
                    value={calorieGoal}
                    onChange={handleGoalChange}
                    onBlur={() => setIsEditingGoal(false)}
                    autoFocus
                    className="w-16 rounded bg-white/10 px-1 py-0.5 text-center text-white outline-none ring-1 ring-emerald-400/50"
                  />
                ) : (
                  <button
                    onClick={() => setIsEditingGoal(true)}
                    className="cursor-pointer border-b border-dashed border-zinc-500 text-white transition-colors hover:text-emerald-400"
                    title="Click to edit goal"
                  >
                    {calorieGoal}
                  </button>
                )}
                kcal
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-300 shadow-[0_0_12px_rgba(52,211,153,0.5)] transition-all duration-500"
                style={{
                  width: `${Math.min((caloriesEaten / calorieGoal) * 100, 100)}%`,
                }}
              />
            </div>
          </div>

          <div className="mt-10 grid grid-cols-3 gap-4">
            {macros.map((macro) => (
              <div
                key={macro.label}
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-5 text-center backdrop-blur-lg"
              >
                <div
                  className={`mx-auto mb-3 h-1 w-8 rounded-full shadow-[0_0_8px_currentColor] ${macro.color}`}
                />
                <p className="text-2xl font-semibold tabular-nums text-white">
                  {macro.value}
                  <span className="text-sm font-normal text-zinc-400">
                    {macro.unit}
                  </span>
                </p>
                <p className="mt-1 text-xs text-zinc-400">{macro.label}</p>
              </div>
            ))}
          </div>

          <div className="mt-10 border-t border-white/10 pt-8">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-medium uppercase tracking-widest text-zinc-400">
                Logged Meals
              </h2>
              <span className="text-xs text-zinc-500">
                {meals.length} {meals.length === 1 ? "entry" : "entries"}
              </span>
            </div>

            <div className="max-h-64 space-y-3 overflow-y-auto pr-1">
              {isLoadingMeals ? (
                <p className="py-6 text-center text-sm text-zinc-500">
                  Loading meals...
                </p>
              ) : meals.length === 0 ? (
                <p className="rounded-xl border border-white/10 bg-white/5 py-6 text-center text-sm text-zinc-500">
                  No meals logged for this date.
                </p>
              ) : (
                meals.map((meal) => (
                  <div
                    key={meal.id}
                    className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur-lg"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-white">
                        {meal.food_name || "Unnamed meal"}
                      </p>
                      <p className="mt-1 text-sm tabular-nums text-emerald-400">
                        {meal.calories} kcal
                      </p>
                      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs tabular-nums text-zinc-400">
                        <span>P {meal.protein}g</span>
                        <span>C {meal.carbs}g</span>
                        <span>F {meal.fat}g</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDelete(meal)}
                      disabled={deletingId === meal.id}
                      aria-label={`Delete ${meal.food_name || "meal"}`}
                      className="shrink-0 rounded-lg border border-white/10 p-2 text-zinc-500 transition-colors hover:border-red-400/30 hover:bg-red-500/10 hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                        className="h-4 w-4"
                        aria-hidden
                      >
                        <path
                          fillRule="evenodd"
                          d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 0 0 .23 1.482l.149-.022.841 10.518A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-10.52.149.023a.75.75 0 0 0 .23-1.482A41.03 41.03 0 0 0 14 4.193V3.75A2.75 2.75 0 0 0 11.25 1h-2.5ZM10 4v1h2V4a1 1 0 0 0-1-1h-2a1 1 0 0 0-1 1Zm-3.75 7.443a.75.75 0 0 0 1.5 0l.375-5.5a.75.75 0 0 0-1.5-.064l-.375 5.564Zm3.75 0a.75.75 0 0 0 1.5 0l.375-5.5a.75.75 0 0 0-1.5-.064l-.375 5.564Zm3.75 0a.75.75 0 0 0 1.5 0l.375-5.5a.75.75 0 0 0-1.5-.064l-.375 5.564Z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </main>

      <div className="fixed inset-x-0 bottom-0 z-10 flex justify-center px-6 pb-8 pt-4">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-zinc-950 via-zinc-950/80 to-transparent"
        />
        <button
          type="button"
          onClick={openModal}
          className="relative rounded-full border border-emerald-400/30 bg-white/10 px-8 py-3.5 text-sm font-semibold tracking-wide text-white shadow-[0_0_24px_rgba(52,211,153,0.35),0_0_48px_rgba(52,211,153,0.15),inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur-lg transition-all duration-300 hover:border-emerald-400/50 hover:bg-white/15 hover:shadow-[0_0_32px_rgba(52,211,153,0.5),0_0_64px_rgba(52,211,153,0.2),inset_0_1px_0_rgba(255,255,255,0.18)] active:scale-[0.98]"
        >
          <span className="flex items-center gap-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="h-4 w-4 text-emerald-400"
              aria-hidden
            >
              <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
            </svg>
            Add Meal
          </span>
        </button>
      </div>

      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-meal-title"
        >
          <button
            type="button"
            aria-label="Close modal"
            onClick={closeModal}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />

          <div className="relative w-full max-w-md rounded-2xl border border-white/10 bg-zinc-900/80 p-6 shadow-2xl shadow-black/50 backdrop-blur-md sm:p-8">
            <h2
              id="add-meal-title"
              className="text-lg font-semibold tracking-tight text-white"
            >
              Add Meal
            </h2>
            <p className="mt-1 text-sm text-zinc-400">
              Log what you ate to update totals for {dateDisplay}.
            </p>

            <form onSubmit={handleSave} className="mt-6 space-y-4">
              <div>
                <label
                  htmlFor="foodName"
                  className="mb-1.5 block text-xs font-medium text-zinc-400"
                >
                  Food Name
                </label>
                <input
                  id="foodName"
                  type="text"
                  value={form.foodName}
                  onChange={(e) => handleChange("foodName", e.target.value)}
                  placeholder="e.g. Grilled chicken"
                  className={inputClassName}
                />
              </div>

              <div>
                <label
                  htmlFor="calories"
                  className="mb-1.5 block text-xs font-medium text-zinc-400"
                >
                  Calories
                </label>
                <input
                  id="calories"
                  type="number"
                  min="0"
                  value={form.calories}
                  onChange={(e) => handleChange("calories", e.target.value)}
                  placeholder="0"
                  className={inputClassName}
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label
                    htmlFor="protein"
                    className="mb-1.5 block text-xs font-medium text-zinc-400"
                  >
                    Protein
                  </label>
                  <input
                    id="protein"
                    type="number"
                    min="0"
                    value={form.protein}
                    onChange={(e) => handleChange("protein", e.target.value)}
                    placeholder="0"
                    className={inputClassName}
                  />
                </div>
                <div>
                  <label
                    htmlFor="carbs"
                    className="mb-1.5 block text-xs font-medium text-zinc-400"
                  >
                    Carbs
                  </label>
                  <input
                    id="carbs"
                    type="number"
                    min="0"
                    value={form.carbs}
                    onChange={(e) => handleChange("carbs", e.target.value)}
                    placeholder="0"
                    className={inputClassName}
                  />
                </div>
                <div>
                  <label
                    htmlFor="fat"
                    className="mb-1.5 block text-xs font-medium text-zinc-400"
                  >
                    Fat
                  </label>
                  <input
                    id="fat"
                    type="number"
                    min="0"
                    value={form.fat}
                    onChange={(e) => handleChange("fat", e.target.value)}
                    placeholder="0"
                    className={inputClassName}
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_0_20px_rgba(16,185,129,0.35)] transition-all hover:bg-emerald-400 hover:shadow-[0_0_28px_rgba(16,185,129,0.45)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSaving ? "Saving..." : "Save Meal"}
                </button>
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-zinc-400 backdrop-blur-md transition-colors hover:bg-white/10 hover:text-zinc-200"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}