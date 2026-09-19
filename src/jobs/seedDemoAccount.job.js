/**
 * Runs once, at server boot, against whatever MONGODB_URI is configured —
 * local dev or a real deployment (Atlas) alike. Idempotent: checks for the
 * demo account first and does nothing if it already exists, so this is safe
 * to call on every restart/redeploy rather than only "the first time" by
 * some special-cased flag. Same dataset shape as scripts/seed-demo-account.cjs
 * (kept separately since that one is a manual dev tool that *resets* the
 * account on every run — destructive behavior this auto-seed deliberately
 * doesn't have, since a real deployment's demo account may have been used/
 * modified since it was created).
 */
import User from '../models/user.model.js';
import * as categoryService from '../services/category.service.js';
import Expense from '../models/expense.model.js';
import { hash } from '../utils/hash.util.js';

const DEMO_EMAIL = 'demo@expensetracker.local';
const DEMO_PASSWORD = 'Demo@1234';
const MONTHS_OF_HISTORY = 24;
const MONTHLY_INCOME = 100000;

function mulberry32(seed) {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(20260917);

const randInt = (min, max) => Math.floor(rand() * (max - min + 1)) + min;
const pick = (arr) => arr[Math.floor(rand() * arr.length)];
const chance = (p) => rand() < p;

function randomDateInMonth(year, monthIndex0, { weekendOnly = false, before = null } = {}) {
  const daysInMonth = new Date(year, monthIndex0 + 1, 0).getDate();
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const day = randInt(1, daysInMonth);
    const date = new Date(year, monthIndex0, day, randInt(8, 22), randInt(0, 59));
    if (before && date >= before) continue;
    const isWeekend = date.getDay() === 0 || date.getDay() === 6;
    if (weekendOnly && !isWeekend) continue;
    return date;
  }
  return new Date(year, monthIndex0, 1, 12, 0);
}

const GROCERY_STORES = ['DMart', 'BigBasket', 'Local kirana store', 'Reliance Fresh', 'More Supermarket'];
const DINING_SPOTS = ['Zomato order', 'Swiggy order', 'Café hangout', 'Street food', 'Restaurant dinner', "Domino's"];
const SNACKS = ['Chai + snacks', 'Bakery run', 'Ice cream'];
const CABS = ['Uber ride', 'Ola ride', 'Rapido ride'];
const FUEL = ['Petrol fill-up', 'Bike fuel'];
const SHOPPING_ONLINE = ['Amazon order', 'Flipkart order', 'Myntra order'];
const SHOPPING_CLOTHES = ['New clothes', 'Footwear'];
const MOVIES = ['PVR movie tickets', 'INOX movie tickets'];
const OUTINGS = ['Weekend outing', 'Friends hangout', 'Bar/pub visit'];
const SUBSCRIPTIONS = ['Netflix', 'Amazon Prime', 'Spotify', 'Disney+ Hotstar'];
const PHARMACY = ['Pharmacy - medicines', 'Health supplements'];
const GIFTS = ['Birthday gift', 'Festival gift', 'Donation'];

function seasonalElectricity(monthIndex0) {
  if ([3, 4, 5].includes(monthIndex0)) return randInt(1800, 2600);
  if ([11, 0, 1].includes(monthIndex0)) return randInt(600, 1000);
  return randInt(1000, 1600);
}

function buildMonthExpenses(year, monthIndex0, categoryMap, { rent, isVacationMonth, isFestivalMonth, cutoff }) {
  const items = [];
  const add = (category, description, amount, date) => {
    if (cutoff && date >= cutoff) return;
    items.push({ category: categoryMap[category], description, amount: Math.round(amount), date });
  };

  add('Bills', 'House rent', rent, new Date(year, monthIndex0, randInt(1, 3), 10, 0));
  add('Bills', 'Electricity bill', seasonalElectricity(monthIndex0), randomDateInMonth(year, monthIndex0, { before: cutoff }));
  add('Bills', 'Mobile recharge', randInt(299, 449), randomDateInMonth(year, monthIndex0, { before: cutoff }));
  add('Bills', 'Broadband bill', randInt(599, 899), randomDateInMonth(year, monthIndex0, { before: cutoff }));
  if (chance(0.65)) {
    add('Bills', 'LPG gas cylinder', randInt(900, 1100), randomDateInMonth(year, monthIndex0, { before: cutoff }));
  }
  for (let i = 0; i < randInt(1, 2); i += 1) {
    add('Bills', `${pick(SUBSCRIPTIONS)} subscription`, randInt(149, 599), randomDateInMonth(year, monthIndex0, { before: cutoff }));
  }
  if (monthIndex0 === 3) {
    add('Bills', 'Health insurance premium', randInt(15000, 19000), new Date(year, monthIndex0, randInt(5, 15), 11, 0));
  }

  for (let i = 0; i < randInt(4, 6); i += 1) {
    add('Food', pick(GROCERY_STORES), randInt(400, 2200), randomDateInMonth(year, monthIndex0, { before: cutoff }));
  }
  for (let i = 0; i < randInt(10, 15); i += 1) {
    const weekendOnly = chance(0.5);
    add('Food', pick(DINING_SPOTS), randInt(150, 650), randomDateInMonth(year, monthIndex0, { weekendOnly, before: cutoff }));
  }
  for (let i = 0; i < randInt(2, 5); i += 1) {
    add('Food', pick(SNACKS), randInt(40, 150), randomDateInMonth(year, monthIndex0, { before: cutoff }));
  }

  for (let i = 0; i < randInt(6, 10); i += 1) {
    add('Transport', pick(CABS), randInt(90, 380), randomDateInMonth(year, monthIndex0, { before: cutoff }));
  }
  for (let i = 0; i < randInt(2, 4); i += 1) {
    add('Transport', pick(FUEL), randInt(500, 1800), randomDateInMonth(year, monthIndex0, { before: cutoff }));
  }
  if (chance(0.6)) {
    add('Transport', 'Metro card recharge', randInt(300, 600), randomDateInMonth(year, monthIndex0, { before: cutoff }));
  }

  const shoppingTrips = isFestivalMonth ? randInt(5, 8) : randInt(2, 4);
  for (let i = 0; i < shoppingTrips; i += 1) {
    add('Shopping', pick(SHOPPING_ONLINE), randInt(300, isFestivalMonth ? 6000 : 3500), randomDateInMonth(year, monthIndex0, { before: cutoff }));
  }
  if (chance(0.35) || isFestivalMonth) {
    add('Shopping', pick(SHOPPING_CLOTHES), randInt(800, 3500), randomDateInMonth(year, monthIndex0, { before: cutoff }));
  }

  for (let i = 0; i < randInt(1, 3); i += 1) {
    add('Entertainment', pick(MOVIES), randInt(280, 750), randomDateInMonth(year, monthIndex0, { weekendOnly: true, before: cutoff }));
  }
  for (let i = 0; i < randInt(1, 3); i += 1) {
    add('Entertainment', pick(OUTINGS), randInt(400, 1800), randomDateInMonth(year, monthIndex0, { weekendOnly: true, before: cutoff }));
  }

  add('Health', 'Gym membership', randInt(900, 1500), randomDateInMonth(year, monthIndex0, { before: cutoff }));
  for (let i = 0; i < randInt(1, 3); i += 1) {
    add('Health', pick(PHARMACY), randInt(150, 700), randomDateInMonth(year, monthIndex0, { before: cutoff }));
  }
  if (chance(0.2)) {
    add('Health', 'Doctor consultation', randInt(400, 1500), randomDateInMonth(year, monthIndex0, { before: cutoff }));
  }

  for (let i = 0; i < randInt(1, 2); i += 1) {
    add('Other', pick(GIFTS), randInt(200, isFestivalMonth ? 3000 : 1200), randomDateInMonth(year, monthIndex0, { before: cutoff }));
  }

  if (isVacationMonth) {
    add('Transport', 'Flight/train tickets - trip', randInt(3500, 9000), randomDateInMonth(year, monthIndex0, { before: cutoff }));
    add('Other', 'Hotel + trip expenses', randInt(5000, 16000), randomDateInMonth(year, monthIndex0, { before: cutoff }));
  }

  return items;
}

async function seedDemoAccountIfMissing() {
  const existing = await User.findOne({ email: DEMO_EMAIL });
  if (existing) return;

  console.log('[seedDemo] No demo account found — creating one with sample history...');

  const passwordHash = await hash(DEMO_PASSWORD);
  const user = await User.create({
    name: 'Demo User',
    email: DEMO_EMAIL,
    passwordHash,
    authProvider: 'email',
    currency: 'INR',
  });

  const categories = await categoryService.seedDefaultCategories(user._id);
  const categoryMap = Object.fromEntries(categories.map((c) => [c.name, c._id]));

  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - MONTHS_OF_HISTORY, 1);

  let allExpenses = [];
  let rent = 19000;
  let vacationCounter = 0;

  for (let i = 0; i <= MONTHS_OF_HISTORY; i += 1) {
    const cursor = new Date(start.getFullYear(), start.getMonth() + i, 1);
    const year = cursor.getFullYear();
    const monthIndex0 = cursor.getMonth();
    if (cursor > now) break;

    if (monthIndex0 === 3 && i > 0) rent += randInt(500, 1500);

    vacationCounter += 1;
    const isVacationMonth = vacationCounter >= 7 && chance(0.5);
    if (isVacationMonth) vacationCounter = 0;

    const isFestivalMonth = [9, 10].includes(monthIndex0);
    const cutoff = monthIndex0 === now.getMonth() && year === now.getFullYear() ? now : null;

    const monthExpenses = buildMonthExpenses(year, monthIndex0, categoryMap, { rent, isVacationMonth, isFestivalMonth, cutoff });
    allExpenses = allExpenses.concat(monthExpenses.map((e) => ({ ...e, userId: user._id })));
  }

  await Expense.insertMany(allExpenses);
  console.log(`[seedDemo] Created demo account (${DEMO_EMAIL} / ${DEMO_PASSWORD}) with ${allExpenses.length} expenses.`);
}

export { seedDemoAccountIfMissing, DEMO_EMAIL, DEMO_PASSWORD };
