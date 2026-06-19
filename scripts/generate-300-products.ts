// Generate 300 realistic Indian supermarket products with branded SVG images.
// Inserts new categories + products into Neon Postgres.
//
// For images: generates professional branded SVG product cards locally
// (saved to /public/uploads/products/) showing brand name, product name,
// weight, and a category-colored gradient background. Each image is unique.

import { db } from '../src/lib/db'
import sharp from 'sharp'
import { writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'

// ─────────────────────────────────────────────────────────────────────────────
// 20 categories (existing 7 + 13 new ones requested by user)
// ─────────────────────────────────────────────────────────────────────────────
const CATEGORIES = [
  { name: 'Milk & Dairy', slug: 'milk-dairy', icon: 'Milk' },
  { name: 'Grocery', slug: 'grocery', icon: 'ShoppingBasket' },
  { name: 'Rice & Grains', slug: 'rice-grains', icon: 'Wheat' },
  { name: 'Atta & Flour', slug: 'atta-flour', icon: 'Wheat' },
  { name: 'Pulses & Dal', slug: 'pulses-dal', icon: 'Sprout' },
  { name: 'Oils & Ghee', slug: 'oils-ghee', icon: 'Droplet' },
  { name: 'Tea & Coffee', slug: 'tea-coffee', icon: 'Coffee' },
  { name: 'Biscuits', slug: 'biscuits', icon: 'Cookie' },
  { name: 'Chocolates', slug: 'chocolates', icon: 'Heart' },
  { name: 'Soft Drinks', slug: 'soft-drinks', icon: 'CupSoda' },
  { name: 'Juices', slug: 'juices', icon: 'GlassWater' },
  { name: 'Snacks', slug: 'snacks', icon: 'Cookie' },
  { name: 'Namkeen', slug: 'namkeen', icon: 'Cookie' },
  { name: 'Frozen Foods', slug: 'frozen-foods', icon: 'Snowflake' },
  { name: 'Personal Care', slug: 'personal-care', icon: 'ShowerHead' },
  { name: 'Home Care', slug: 'home-care', icon: 'Home' },
  { name: 'Cleaning Supplies', slug: 'cleaning-supplies', icon: 'SprayCan' },
  { name: 'Baby Care', slug: 'baby-care', icon: 'Baby' },
  { name: 'Fruits', slug: 'fruits', icon: 'Apple' },
  { name: 'Vegetables', slug: 'vegetables', icon: 'Carrot' },
]

// Category color themes for image generation
const CATEGORY_COLORS: Record<string, { from: string; to: string; emoji: string }> = {
  'milk-dairy': { from: '#3b82f6', to: '#1e40af', emoji: '🥛' },
  'grocery': { from: '#10b981', to: '#047857', emoji: '🛒' },
  'rice-grains': { from: '#f59e0b', to: '#d97706', emoji: '🌾' },
  'atta-flour': { from: '#f59e0b', to: '#b45309', emoji: '🌾' },
  'pulses-dal': { from: '#eab308', to: '#a16207', emoji: '🫘' },
  'oils-ghee': { from: '#fbbf24', to: '#f59e0b', emoji: '🫗' },
  'tea-coffee': { from: '#92400e', to: '#451a03', emoji: '☕' },
  'biscuits': { from: '#d97706', to: '#92400e', emoji: '🍪' },
  'chocolates': { from: '#7c2d12', to: '#431407', emoji: '🍫' },
  'soft-drinks': { from: '#ef4444', to: '#b91c1c', emoji: '🥤' },
  'juices': { from: '#f97316', to: '#ea580c', emoji: '🧃' },
  'snacks': { from: '#f59e0b', to: '#d97706', emoji: '🍿' },
  'namkeen': { from: '#dc2626', to: '#991b1b', emoji: '🥜' },
  'frozen-foods': { from: '#06b6d4', to: '#0e7490', emoji: '🧊' },
  'personal-care': { from: '#ec4899', to: '#be185d', emoji: '🧴' },
  'home-care': { from: '#8b5cf6', to: '#6d28d9', emoji: '🏠' },
  'cleaning-supplies': { from: '#0891b2', to: '#155e75', emoji: '🧽' },
  'baby-care': { from: '#f472b6', to: '#db2777', emoji: '👶' },
  'fruits': { from: '#ef4444', to: '#dc2626', emoji: '🍎' },
  'vegetables': { from: '#22c55e', to: '#15803d', emoji: '🥕' },
}

// ─────────────────────────────────────────────────────────────────────────────
// 300 products — real Indian supermarket items with realistic pricing
// Format: [name, brand, description, mrp, price, stock, unit, categorySlug]
// ─────────────────────────────────────────────────────────────────────────────
const PRODUCTS: [string, string, string, number, number, number, string, string][] = [
  // === Milk & Dairy (15) ===
  ['Amul Gold Milk 500ml', 'Amul', 'Full cream milk, 500ml pouch', 32, 28, 80, '500 ml', 'milk-dairy'],
  ['Amul Taaza Milk 500ml', 'Amul', 'Toned milk, 500ml pouch', 27, 25, 100, '500 ml', 'milk-dairy'],
  ['Amul Toned Milk 1L', 'Amul', 'Toned milk, 1 litre pouch', 58, 54, 70, '1 L', 'milk-dairy'],
  ['Mother Dairy Classic Milk 500ml', 'Mother Dairy', 'Full cream milk, 500ml', 30, 27, 60, '500 ml', 'milk-dairy'],
  ['Amul Butter 100g', 'Amul', 'Pasteurised salted butter, 100g', 56, 52, 90, '100 g', 'milk-dairy'],
  ['Amul Butter 500g', 'Amul', 'Pasteurised salted butter, 500g', 285, 268, 40, '500 g', 'milk-dairy'],
  ['Amul Cheese Slices 200g', 'Amul', 'Processed cheese slices, 200g pack', 145, 135, 65, '200 g', 'milk-dairy'],
  ['Amul Cheese Cube 750g', 'Amul', 'Processed cheese, 750g tin', 525, 495, 25, '750 g', 'milk-dairy'],
  ['Mother Dairy Curd 400g', 'Mother Dairy', 'Fresh thick curd, 400g pack', 40, 36, 85, '400 g', 'milk-dairy'],
  ['Amul Paneer 200g', 'Amul', 'Fresh soft paneer, 200g pack', 95, 89, 50, '200 g', 'milk-dairy'],
  ['Amul Fresh Cream 250ml', 'Amul', 'Fresh cream, 250ml pack', 105, 99, 45, '250 ml', 'milk-dairy'],
  ['Mother Dairy Lassi 200ml', 'Mother Dairy', 'Sweet lassi, 200ml bottle', 25, 22, 70, '200 ml', 'milk-dairy'],
  ['Amul Kool Milk Shake 180ml', 'Amul', 'Chocolate milk shake, 180ml', 25, 22, 60, '180 ml', 'milk-dairy'],
  ['Nestle Milkmaid 400g', 'Nestle', 'Sweetened condensed milk, 400g', 115, 108, 50, '400 g', 'milk-dairy'],
  ['Britannia Cheese Spread 180g', 'Britannia', 'Creamy cheese spread, 180g', 95, 89, 55, '180 g', 'milk-dairy'],

  // === Grocery (15) ===
  ['Tata Salt 1kg', 'Tata', 'Iodised refined salt, 1kg pack', 28, 25, 200, '1 kg', 'grocery'],
  ['Tata Salt 500g', 'Tata', 'Iodised refined salt, 500g pack', 16, 14, 150, '500 g', 'grocery'],
  ['Aashirvaad Iodized Salt 1kg', 'Aashirvaad', 'Iodised salt, 1kg pack', 28, 25, 180, '1 kg', 'grocery'],
  ['Madhur Sugar 1kg', 'Madhur', 'Refined white sugar, 1kg', 48, 44, 200, '1 kg', 'grocery'],
  ['Fortune Sugar 1kg', 'Fortune', 'Refined sugar, 1kg pack', 46, 42, 180, '1 kg', 'grocery'],
  ['Tata Sampann Poha 500g', 'Tata Sampann', 'Thick poha, 500g pack', 65, 58, 80, '500 g', 'grocery'],
  ['MTR Rava 1kg', 'MTR', 'Fine sooji rava, 1kg pack', 75, 68, 90, '1 kg', 'grocery'],
  ['Rajdhani Besan 500g', 'Rajdhani', 'Gram flour, 500g pack', 65, 58, 100, '500 g', 'grocery'],
  ['Tata Sampann Besan 500g', 'Tata Sampann', 'Gram flour, 500g pack', 75, 68, 70, '500 g', 'grocery'],
  ['MTR Besan 500g', 'MTR', 'Gram flour, 500g pack', 70, 63, 75, '500 g', 'grocery'],
  ['Patanjali Dalia 500g', 'Patanjali', 'Broken wheat, 500g pack', 45, 40, 60, '500 g', 'grocery'],
  ['Tata Sampann Poha Thick 500g', 'Tata Sampann', 'Thick poha, 500g', 60, 54, 65, '500 g', 'grocery'],
  ['Fortune Soya Chunks 200g', 'Fortune', 'Soya nuggets, 200g pack', 65, 58, 80, '200 g', 'grocery'],
  ['MTR Upma Mix 500g', 'MTR', 'Instant upma mix, 500g', 95, 85, 50, '500 g', 'grocery'],
  ['Patanjali Honey 500g', 'Patanjali', 'Pure honey, 500g bottle', 175, 155, 60, '500 g', 'grocery'],

  // === Rice & Grains (15) ===
  ['India Gate Basmati Rice 1kg', 'India Gate', 'Premium basmati rice, 1kg', 145, 130, 100, '1 kg', 'rice-grains'],
  ['India Gate Basmati Rice 5kg', 'India Gate', 'Premium basmati rice, 5kg', 695, 625, 40, '5 kg', 'rice-grains'],
  ['Daawat Basmati Rice 1kg', 'Daawat', 'Traditional basmati, 1kg', 135, 120, 90, '1 kg', 'rice-grains'],
  ['Daawat Rozana Basmati 5kg', 'Daawat', 'Everyday basmati, 5kg', 475, 425, 35, '5 kg', 'rice-grains'],
  ['Fortune Everyday Basmati 1kg', 'Fortune', 'Everyday basmati rice, 1kg', 99, 85, 110, '1 kg', 'rice-grains'],
  ['Tata Sampann Basmati 1kg', 'Tata Sampann', 'Premium basmati, 1kg', 145, 130, 60, '1 kg', 'rice-grains'],
  ['Patanjali Basmati Rice 1kg', 'Patanjali', 'Basmati rice, 1kg pack', 110, 99, 70, '1 kg', 'rice-grains'],
  ['Kohinoor Basmati 1kg', 'Kohinoor', 'Authentic basmati, 1kg', 145, 125, 55, '1 kg', 'rice-grains'],
  ['Aeroplane Basmati 1kg', 'Aeroplane', 'Basmati rice, 1kg pack', 135, 120, 50, '1 kg', 'rice-grains'],
  ['India Gate Brown Rice 1kg', 'India Gate', 'Brown basmati rice, 1kg', 125, 110, 40, '1 kg', 'rice-grains'],
  ['India Gate Idli Rice 1kg', 'India Gate', 'Idli rice, 1kg pack', 85, 75, 60, '1 kg', 'rice-grains'],
  ['Tata Sona Masoori Rice 1kg', 'Tata', 'Sona masoori rice, 1kg', 75, 68, 80, '1 kg', 'rice-grains'],
  ['Fortune Sona Masoori 1kg', 'Fortune', 'Sona masoori rice, 1kg', 72, 65, 90, '1 kg', 'rice-grains'],
  ['Daawat Brown Rice 1kg', 'Daawat', 'Brown rice, 1kg pack', 130, 115, 35, '1 kg', 'rice-grains'],
  ['India Gate Super Basmati 5kg', 'India Gate', 'Super basmati, 5kg pack', 795, 715, 25, '5 kg', 'rice-grains'],

  // === Atta & Flour (15) ===
  ['Aashirvaad Atta 5kg', 'Aashirvaad', 'Whole wheat flour, 5kg pack', 285, 255, 100, '5 kg', 'atta-flour'],
  ['Aashirvaad Atta 10kg', 'Aashirvaad', 'Whole wheat flour, 10kg pack', 565, 515, 50, '10 kg', 'atta-flour'],
  ['Pillsbury Atta 5kg', 'Pillsbury', 'Whole wheat flour, 5kg', 280, 250, 60, '5 kg', 'atta-flour'],
  ['Fortune Chakki Atta 5kg', 'Fortune', 'Chakki fresh atta, 5kg', 270, 245, 70, '5 kg', 'atta-flour'],
  ['Patanjali Atta 5kg', 'Patanjali', 'Whole wheat flour, 5kg', 265, 240, 55, '5 kg', 'atta-flour'],
  ['Tata Sampann Atta 5kg', 'Tata Sampann', 'Whole wheat flour, 5kg', 290, 260, 45, '5 kg', 'atta-flour'],
  ['Aashirvaad Shudh Chakki Atta 2kg', 'Aashirvaad', 'Shudh chakki atta, 2kg', 130, 115, 80, '2 kg', 'atta-flour'],
  ['Fortune Suji 1kg', 'Fortune', 'Sooji rava, 1kg pack', 65, 58, 90, '1 kg', 'atta-flour'],
  ['Rajdhani Sooji 1kg', 'Rajdhani', 'Sooji rava, 1kg pack', 60, 54, 85, '1 kg', 'atta-flour'],
  ['Pillsbury Maida 1kg', 'Pillsbury', 'Refined flour, 1kg pack', 55, 48, 75, '1 kg', 'atta-flour'],
  ['Rajdhani Maida 1kg', 'Rajdhani', 'Refined flour, 1kg pack', 50, 45, 80, '1 kg', 'atta-flour'],
  ['Aashirvaad Multigrain Atta 5kg', 'Aashirvaad', 'Multigrain atta, 5kg', 340, 305, 40, '5 kg', 'atta-flour'],
  ['Pillsbury Chakki Fresh Atta 5kg', 'Pillsbury', 'Chakki fresh atta, 5kg', 285, 255, 50, '5 kg', 'atta-flour'],
  ['Annapurna Atta 5kg', 'Annapurna', 'Whole wheat flour, 5kg', 260, 235, 45, '5 kg', 'atta-flour'],
  ['Fortune Besan 500g', 'Fortune', 'Gram flour, 500g pack', 60, 54, 70, '500 g', 'atta-flour'],

  // === Pulses & Dal (15) ===
  ['Tata Sampann Toor Dal 1kg', 'Tata Sampann', 'Unpolished toor dal, 1kg', 165, 148, 90, '1 kg', 'pulses-dal'],
  ['Fortune Toor Dal 1kg', 'Fortune', 'Toor dal, 1kg pack', 155, 138, 80, '1 kg', 'pulses-dal'],
  ['Tata Sampann Moong Dal 1kg', 'Tata Sampann', 'Yellow moong dal, 1kg', 175, 155, 70, '1 kg', 'pulses-dal'],
  ['Tata Sampann Chana Dal 1kg', 'Tata Sampann', 'Chana dal, 1kg pack', 125, 110, 85, '1 kg', 'pulses-dal'],
  ['Rajdhani Toor Dal 1kg', 'Rajdhani', 'Toor dal, 1kg pack', 145, 128, 75, '1 kg', 'pulses-dal'],
  ['Rajdhani Moong Dal 1kg', 'Rajdhani', 'Moong dal, 1kg pack', 165, 145, 65, '1 kg', 'pulses-dal'],
  ['Rajdhani Chana Dal 1kg', 'Rajdhani', 'Chana dal, 1kg pack', 115, 100, 80, '1 kg', 'pulses-dal'],
  ['Tata Sampann Urad Dal 1kg', 'Tata Sampann', 'Urad dal, 1kg pack', 195, 175, 55, '1 kg', 'pulses-dal'],
  ['Tata Sampann Masoor Dal 1kg', 'Tata Sampann', 'Masoor dal, 1kg pack', 125, 110, 60, '1 kg', 'pulses-dal'],
  ['Organic Tattva Toor Dal 1kg', 'Organic Tattva', 'Organic toor dal, 1kg', 195, 175, 40, '1 kg', 'pulses-dal'],
  ['Organic Tattva Moong Dal 500g', 'Organic Tattva', 'Organic moong dal, 500g', 130, 115, 35, '500 g', 'pulses-dal'],
  ['24 Mantra Organic Chana Dal 500g', '24 Mantra', 'Organic chana dal, 500g', 95, 85, 45, '500 g', 'pulses-dal'],
  ['Tata Sampann Kabuli Chana 1kg', 'Tata Sampann', 'Kabuli chana, 1kg pack', 145, 128, 50, '1 kg', 'pulses-dal'],
  ['Rajdhani Rajma 1kg', 'Rajdhani', 'Rajma, 1kg pack', 175, 155, 55, '1 kg', 'pulses-dal'],
  ['Tata Sampann Lobia 500g', 'Tata Sampann', 'Lobia, 500g pack', 75, 68, 60, '500 g', 'pulses-dal'],

  // === Oils & Ghee (15) ===
  ['Fortune Sunflower Oil 1L', 'Fortune', 'Refined sunflower oil, 1L pouch', 165, 145, 150, '1 L', 'oils-ghee'],
  ['Fortune Sunflower Oil 5L', 'Fortune', 'Refined sunflower oil, 5L jar', 825, 740, 40, '5 L', 'oils-ghee'],
  ['Saffola Gold Oil 1L', 'Saffola', 'Blended edible oil, 1L', 195, 175, 80, '1 L', 'oils-ghee'],
  ['Saffola Active Oil 1L', 'Saffola', 'Rice bran oil, 1L pouch', 165, 148, 70, '1 L', 'oils-ghee'],
  ['Sundrop Heart Oil 1L', 'Sundrop', 'Refined sunflower oil, 1L', 175, 155, 90, '1 L', 'oils-ghee'],
  ['Fortune Groundnut Oil 1L', 'Fortune', 'Refined groundnut oil, 1L', 195, 175, 60, '1 L', 'oils-ghee'],
  ['Fortune Mustard Oil 1L', 'Fortune', 'Refined mustard oil, 1L', 175, 155, 65, '1 L', 'oils-ghee'],
  ['Dhara Mustard Oil 1L', 'Dhara', 'Refined mustard oil, 1L', 170, 150, 70, '1 L', 'oils-ghee'],
  ['Fortune Rice Bran Oil 1L', 'Fortune', 'Rice bran oil, 1L pouch', 185, 165, 50, '1 L', 'oils-ghee'],
  ['Saffola Tasty Oil 1L', 'Saffola', 'Edible oil blend, 1L', 185, 165, 55, '1 L', 'oils-ghee'],
  ['Patanjali Mustard Oil 1L', 'Patanjali', 'Mustard oil, 1L pouch', 165, 145, 75, '1 L', 'oils-ghee'],
  ['Amul Pure Ghee 500ml', 'Amul', 'Pure cow ghee, 500ml', 325, 295, 80, '500 ml', 'oils-ghee'],
  ['Amul Pure Ghee 1L', 'Amul', 'Pure cow ghee, 1L tin', 645, 585, 45, '1 L', 'oils-ghee'],
  ['Mother Dairy Ghee 500ml', 'Mother Dairy', 'Pure ghee, 500ml', 325, 295, 55, '500 ml', 'oils-ghee'],
  ['Aashirvaad Svasti Ghee 500ml', 'Aashirvaad', 'Pure ghee, 500ml', 340, 305, 50, '500 ml', 'oils-ghee'],

  // === Tea & Coffee (15) ===
  ['Tata Tea Gold 500g', 'Tata Tea', 'Premium tea, 500g pack', 295, 265, 100, '500 g', 'tea-coffee'],
  ['Tata Tea Premium 1kg', 'Tata Tea', 'Premium tea, 1kg pack', 540, 485, 60, '1 kg', 'tea-coffee'],
  ['Red Label Tea 1kg', 'Brooke Bond', ' Brooke Bond Red Label tea, 1kg', 545, 490, 70, '1 kg', 'tea-coffee'],
  ['Red Label Tea 500g', 'Brooke Bond', 'Red Label tea, 500g', 285, 255, 90, '500 g', 'tea-coffee'],
  ['Taj Mahal Tea 500g', 'Taj Mahal', 'Premium tea, 500g pack', 305, 275, 65, '500 g', 'tea-coffee'],
  ['Society Tea 500g', 'Society', 'Tea, 500g pack', 235, 210, 55, '500 g', 'tea-coffee'],
  ['Wagh Bakri Tea 500g', 'Wagh Bakri', 'Premium tea, 500g', 265, 238, 75, '500 g', 'tea-coffee'],
  ['Lipton Green Tea 25 Bags', 'Lipton', 'Green tea bags, 25 count', 145, 128, 80, '25 bags', 'tea-coffee'],
  ['Tetley Green Tea 25 Bags', 'Tetley', 'Green tea bags, 25 count', 135, 118, 70, '25 bags', 'tea-coffee'],
  ['Nescafe Classic Coffee 100g', 'Nescafe', 'Instant coffee, 100g jar', 380, 340, 100, '100 g', 'tea-coffee'],
  ['Nescafe Gold Coffee 95g', 'Nescafe', 'Premium instant coffee, 95g', 410, 365, 60, '95 g', 'tea-coffee'],
  ['Bru Instant Coffee 100g', 'Bru', 'Instant coffee, 100g jar', 320, 285, 90, '100 g', 'tea-coffee'],
  ['Bru Gold Coffee 100g', 'Bru', 'Premium coffee, 100g', 365, 325, 50, '100 g', 'tea-coffee'],
  ['Davidoff Cafe Rich Coffee 100g', 'Davidoff', 'Premium coffee, 100g', 545, 485, 35, '100 g', 'tea-coffee'],
  ['Continental Filter Coffee 500g', 'Continental', 'Filter coffee, 500g', 285, 255, 45, '500 g', 'tea-coffee'],

  // === Biscuits (15) ===
  ['Parle-G Glucose Biscuits 100g', 'Parle', 'Glucose biscuits, 100g pack', 10, 9, 300, '100 g', 'biscuits'],
  ['Parle-G Family Pack 800g', 'Parle', 'Glucose biscuits, 800g', 80, 72, 100, '800 g', 'biscuits'],
  ['Britannia Marie Gold 250g', 'Britannia', 'Marie biscuits, 250g', 45, 40, 150, '250 g', 'biscuits'],
  ['Britannia Good Day Cashew 150g', 'Britannia', 'Cashew cookies, 150g', 50, 45, 120, '150 g', 'biscuits'],
  ['Britannia Good Day Butter 150g', 'Britannia', 'Butter cookies, 150g', 50, 45, 110, '150 g', 'biscuits'],
  ['Sunfeast Dark Fantasy 75g', 'Sunfeast', 'Choco filled biscuits, 75g', 50, 45, 90, '75 g', 'biscuits'],
  ['Sunfeast Marie Light 250g', 'Sunfeast', 'Marie biscuits, 250g', 40, 35, 100, '250 g', 'biscuits'],
  ['Oreo Original 120g', 'Oreo', 'Cream biscuits, 120g', 45, 40, 130, '120 g', 'biscuits'],
  ['Oreo Strawberry 120g', 'Oreo', 'Strawberry cream biscuits, 120g', 50, 45, 80, '120 g', 'biscuits'],
  ['Hide & Seek 100g', 'Parle', 'Chocolate chip biscuits, 100g', 45, 40, 110, '100 g', 'biscuits'],
  ['Hide & Seek Fab 100g', 'Parle', 'Vanilla cream biscuits, 100g', 50, 45, 70, '100 g', 'biscuits'],
  ['Bourbon Chocolate 150g', 'Britannia', 'Chocolate cream biscuits, 150g', 50, 45, 95, '150 g', 'biscuits'],
  ['20-20 Cashew Cookies 150g', 'Parle', 'Cashew cookies, 150g', 45, 40, 85, '150 g', 'biscuits'],
  ['Milk Bikis 200g', 'Britannia', 'Milk biscuits, 200g', 45, 40, 75, '200 g', 'biscuits'],
  ['NutriChoice Digestive 250g', 'Britannia', 'Digestive biscuits, 250g', 70, 62, 65, '250 g', 'biscuits'],

  // === Chocolates (15) ===
  ['Dairy Milk Silk 60g', 'Cadbury', 'Silk chocolate, 60g', 99, 89, 150, '60 g', 'chocolates'],
  ['Dairy Milk Silk Bubbly 60g', 'Cadbury', 'Bubbly silk chocolate, 60g', 99, 89, 100, '60 g', 'chocolates'],
  ['Dairy Milk Classic 52g', 'Cadbury', 'Milk chocolate, 52g', 45, 40, 200, '52 g', 'chocolates'],
  ['Dairy Milk Fruit & Nut 38g', 'Cadbury', 'Fruit and nut chocolate, 38g', 45, 40, 120, '38 g', 'chocolates'],
  ['Dairy Milk Crackle 38g', 'Cadbury', 'Crackle chocolate, 38g', 45, 40, 110, '38 g', 'chocolates'],
  ['5 Star 40g', 'Cadbury', 'Chocolate bar, 40g', 10, 9, 250, '40 g', 'chocolates'],
  ['Perk 14g', 'Cadbury', 'Chocolate wafer, 14g', 10, 9, 200, '14 g', 'chocolates'],
  ['KitKat 12g', 'Nestle', 'Chocolate wafer, 12g', 10, 9, 220, '12 g', 'chocolates'],
  ['KitKat Senses 37g', 'Nestle', 'Premium chocolate, 37g', 50, 45, 90, '37 g', 'chocolates'],
  ['Munch 20g', 'Nestle', 'Chocolate wafer, 20g', 10, 9, 180, '20 g', 'chocolates'],
  ['Ferrero Rocher 16 Pieces', 'Ferrero', 'Chocolate box, 16 pieces', 599, 540, 40, '200 g', 'chocolates'],
  ['Snickers 50g', 'Snickers', 'Chocolate bar, 50g', 50, 45, 100, '50 g', 'chocolates'],
  ['Mars 51g', 'Mars', 'Chocolate bar, 51g', 50, 45, 90, '51 g', 'chocolates'],
  ['Bournville 80g', 'Cadbury', 'Dark chocolate, 80g', 100, 89, 60, '80 g', 'chocolates'],
  ['Toblerone 100g', 'Toblerone', 'Swiss chocolate, 100g', 175, 155, 50, '100 g', 'chocolates'],

  // === Soft Drinks (15) ===
  ['Coca-Cola 750ml', 'Coca-Cola', 'Refreshing cola, 750ml', 42, 38, 200, '750 ml', 'soft-drinks'],
  ['Coca-Cola 2L', 'Coca-Cola', 'Refreshing cola, 2L bottle', 95, 85, 80, '2 L', 'soft-drinks'],
  ['Pepsi 750ml', 'Pepsi', 'Refreshing cola, 750ml', 42, 38, 180, '750 ml', 'soft-drinks'],
  ['Pepsi 2L', 'Pepsi', 'Refreshing cola, 2L bottle', 95, 85, 70, '2 L', 'soft-drinks'],
  ['Thums Up 750ml', 'Thums Up', 'Refreshing cola, 750ml', 42, 38, 150, '750 ml', 'soft-drinks'],
  ['Sprite 750ml', 'Sprite', 'Lemon lime soda, 750ml', 42, 38, 160, '750 ml', 'soft-drinks'],
  ['Sprite 2L', 'Sprite', 'Lemon lime soda, 2L bottle', 95, 85, 65, '2 L', 'soft-drinks'],
  ['Fanta Orange 750ml', 'Fanta', 'Orange soda, 750ml', 42, 38, 140, '750 ml', 'soft-drinks'],
  ['7Up 750ml', '7Up', 'Lemon lime soda, 750ml', 42, 38, 130, '750 ml', 'soft-drinks'],
  ['Mirinda Orange 750ml', 'Mirinda', 'Orange soda, 750ml', 42, 38, 120, '750 ml', 'soft-drinks'],
  ['Limca 750ml', 'Limca', 'Lemon soda, 750ml', 42, 38, 110, '750 ml', 'soft-drinks'],
  ['Mountain Dew 750ml', 'Mountain Dew', 'Refreshing soda, 750ml', 42, 38, 130, '750 ml', 'soft-drinks'],
  ['Red Bull 250ml', 'Red Bull', 'Energy drink, 250ml', 125, 110, 90, '250 ml', 'soft-drinks'],
  ['Sting Energy 250ml', 'Sting', 'Energy drink, 250ml', 25, 22, 150, '250 ml', 'soft-drinks'],
  ['Bisleri Soda 750ml', 'Bisleri', 'Carbonated water, 750ml', 30, 27, 100, '750 ml', 'soft-drinks'],

  // === Juices (15) ===
  ['Real Mixed Fruit Juice 1L', 'Real', '100% fruit juice, 1L pack', 130, 115, 100, '1 L', 'juices'],
  ['Real Orange Juice 1L', 'Real', '100% orange juice, 1L', 130, 115, 90, '1 L', 'juices'],
  ['Real Apple Juice 1L', 'Real', '100% apple juice, 1L', 130, 115, 85, '1 L', 'juices'],
  ['Real Mango Juice 1L', 'Real', '100% mango juice, 1L', 130, 115, 95, '1 L', 'juices'],
  ['Tropicana Orange Juice 1L', 'Tropicana', '100% orange juice, 1L', 130, 115, 80, '1 L', 'juices'],
  ['Tropicana Apple Juice 1L', 'Tropicana', '100% apple juice, 1L', 130, 115, 75, '1 L', 'juices'],
  ['Tropicana Mixed Fruit 1L', 'Tropicana', 'Mixed fruit juice, 1L', 130, 115, 85, '1 L', 'juices'],
  ['Tropicana Mango Juice 1L', 'Tropicana', '100% mango juice, 1L', 130, 115, 90, '1 L', 'juices'],
  ['Minute Maid Orange 1L', 'Minute Maid', 'Orange juice, 1L', 130, 115, 60, '1 L', 'juices'],
  ['B Natural Mixed Fruit 1L', 'B Natural', 'Fruit juice, 1L', 130, 115, 65, '1 L', 'juices'],
  ['B Natural Apple 1L', 'B Natural', 'Apple juice, 1L', 130, 115, 55, '1 L', 'juices'],
  ['Paper Boat Aam Panna 200ml', 'Paper Boat', 'Aam panna drink, 200ml', 35, 30, 100, '200 ml', 'juices'],
  ['Paper Boat Jaljeera 200ml', 'Paper Boat', 'Jaljeera drink, 200ml', 35, 30, 90, '200 ml', 'juices'],
  ['Real Active Orange 1L', 'Real', 'Active orange juice, 1L', 145, 128, 70, '1 L', 'juices'],
  ['Tropicana Litchi 1L', 'Tropicana', 'Litchi juice, 1L', 135, 120, 50, '1 L', 'juices'],

  // === Snacks (15) ===
  ["Lay's Classic Salted 52g", "Lay's", 'Salted potato chips, 52g', 20, 18, 300, '52 g', 'snacks'],
  ["Lay's American Style Cream 52g", "Lay's", 'Cream & onion chips, 52g', 20, 18, 200, '52 g', 'snacks'],
  ["Lay's Magic Masala 52g", "Lay's", 'Magic masala chips, 52g', 20, 18, 250, '52 g', 'snacks'],
  ['Kurkure Masala Munch 90g', 'Kurkure', 'Corn puffs, 90g pack', 20, 18, 200, '90 g', 'snacks'],
  ['Kurkure Green Chutney 90g', 'Kurkure', 'Corn puffs, 90g', 20, 18, 150, '90 g', 'snacks'],
  ['Bingo Mad Angles 70g', 'Bingo', 'Corn chips, 70g pack', 20, 18, 180, '70 g', 'snacks'],
  ['Bingo Tedhe Medhe 70g', 'Bingo', 'Masala chips, 70g', 20, 18, 160, '70 g', 'snacks'],
  ['Uncle Chipps Spice Treat 50g', 'Uncle Chipps', 'Spicy chips, 50g', 20, 18, 120, '50 g', 'snacks'],
  ['Pringles Original 107g', 'Pringles', 'Potato crisps, 107g', 99, 89, 80, '107 g', 'snacks'],
  ['Pringles Sour Cream 107g', 'Pringles', 'Sour cream crisps, 107g', 99, 89, 70, '107 g', 'snacks'],
  ['Too Yumm Multigrain Chips 50g', 'Too Yumm', 'Multigrain chips, 50g', 30, 27, 100, '50 g', 'snacks'],
  ['Maggi Noodles 70g', 'Maggi', 'Instant noodles, 70g pack', 14, 12, 400, '70 g', 'snacks'],
  ['Maggi Masala Noodles 4 Pack', 'Maggi', 'Instant noodles, 4x70g', 56, 50, 150, '280 g', 'snacks'],
  ['Yippee Noodles 70g', 'Yippee', 'Instant noodles, 70g', 14, 12, 200, '70 g', 'snacks'],
  ['Top Ramen Noodles 70g', 'Top Ramen', 'Instant noodles, 70g', 14, 12, 180, '70 g', 'snacks'],

  // === Namkeen (15) ===
  ["Haldiram's Bhujia 200g", "Haldiram's", 'Spicy bhujia, 200g', 65, 58, 200, '200 g', 'namkeen'],
  ["Haldiram's Aloo Bhujia 200g", "Haldiram's", 'Aloo bhujia, 200g', 70, 62, 180, '200 g', 'namkeen'],
  ["Haldiram's Sev Bhujia 200g", "Haldiram's", 'Sev bhujia, 200g', 65, 58, 150, '200 g', 'namkeen'],
  ["Haldiram's Navratan Mix 200g", "Haldiram's", 'Navratan namkeen, 200g', 75, 68, 160, '200 g', 'namkeen'],
  ["Haldiram's Khatta Meetha 200g", "Haldiram's", 'Khatta meetha namkeen, 200g', 75, 68, 140, '200 g', 'namkeen'],
  ["Haldiram's Mathri 200g", "Haldiram's", 'Mathri, 200g pack', 75, 68, 100, '200 g', 'namkeen'],
  ["Haldiram's Mix Mixture 200g", "Haldiram's", 'Mixed namkeen, 200g', 70, 62, 130, '200 g', 'namkeen'],
  ['Bikaji Bhujia 200g', 'Bikaji', 'Bikaneri bhujia, 200g', 60, 54, 180, '200 g', 'namkeen'],
  ['Bikaji Navratan 200g', 'Bikaji', 'Navratan mix, 200g', 70, 62, 150, '200 g', 'namkeen'],
  ['Bikaji Soya Sticks 200g', 'Bikaji', 'Soya sticks, 200g', 55, 48, 110, '200 g', 'namkeen'],
  ['Bikaji Khatta Meetha 200g', 'Bikaji', 'Khatta meetha, 200g', 70, 62, 120, '200 g', 'namkeen'],
  ['Balaji Wafers Namkeen 200g', 'Balaji', 'Namkeen mix, 200g', 55, 48, 130, '200 g', 'namkeen'],
  ['Too Yumm Multigrain Chips 50g', 'Too Yumm', 'Multigrain chips, 50g', 30, 27, 90, '50 g', 'namkeen'],
  ['Lehar Namkeen Mix 200g', 'Lehar', 'Namkeen mix, 200g', 50, 45, 100, '200 g', 'namkeen'],
  ['Lehar Peanuts Masala 200g', 'Lehar', 'Masala peanuts, 200g', 45, 40, 120, '200 g', 'namkeen'],

  // === Frozen Foods (15) ===
  ['McCain French Fries 750g', 'McCain', 'Frozen french fries, 750g', 199, 175, 60, '750 g', 'frozen-foods'],
  ['McCain Smiles 400g', 'McCain', 'Potato smiles, 400g', 145, 128, 50, '400 g', 'frozen-foods'],
  ['McCain Aloo Tikki 400g', 'McCain', 'Aloo tikki, 400g', 135, 118, 55, '400 g', 'frozen-foods'],
  ['McCain Veg Nuggets 400g', 'McCain', 'Veg nuggets, 400g', 145, 128, 45, '400 g', 'frozen-foods'],
  ['ITC Master Chef Veg Patty 400g', 'ITC', 'Veg patty, 400g', 199, 175, 35, '400 g', 'frozen-foods'],
  ['ITC Master Chef Veg Spring Roll 400g', 'ITC', 'Spring rolls, 400g', 215, 190, 30, '400 g', 'frozen-foods'],
  ['Sumeru Veg Nuggets 400g', 'Sumeru', 'Veg nuggets, 400g', 145, 128, 40, '400 g', 'frozen-foods'],
  ['Sumeru Veg Spring Roll 400g', 'Sumeru', 'Spring rolls, 400g', 155, 138, 35, '400 g', 'frozen-foods'],
  ['Venky\'s Chicken Nuggets 400g', "Venky's", 'Chicken nuggets, 400g', 225, 200, 30, '400 g', 'frozen-foods'],
  ['Venky\'s Chicken Sausage 400g', "Venky's", 'Chicken sausage, 400g', 195, 175, 35, '400 g', 'frozen-foods'],
  ['Godrej Yummiez Chicken Nugget 400g', 'Godrej', 'Chicken nuggets, 400g', 245, 218, 25, '400 g', 'frozen-foods'],
  ['Godrej Yummiez Veg Burger Patty 400g', 'Godrej', 'Veg patty, 400g', 165, 145, 40, '400 g', 'frozen-foods'],
  ['ITC Master Chef Sweet Corn 500g', 'ITC', 'Frozen sweet corn, 500g', 110, 98, 60, '500 g', 'frozen-foods'],
  ['McCain Sweet Corn 500g', 'McCain', 'Frozen sweet corn, 500g', 115, 102, 55, '500 g', 'frozen-foods'],
  ['Taj Frozen Peas 500g', 'Taj', 'Frozen green peas, 500g', 99, 88, 70, '500 g', 'frozen-foods'],

  // === Personal Care (15) ===
  ['Colgate Strong Teeth 200g', 'Colgate', 'Toothpaste, 200g', 110, 95, 150, '200 g', 'personal-care'],
  ['Colgate MaxFresh 150g', 'Colgate', 'Cool mint toothpaste, 150g', 95, 85, 120, '150 g', 'personal-care'],
  ['Sensodyne Fresh Mint 75g', 'Sensodyne', 'Toothpaste for sensitive teeth, 75g', 145, 128, 90, '75 g', 'personal-care'],
  ['Pepsodent Germicheck 150g', 'Pepsodent', 'Toothpaste, 150g', 75, 65, 110, '150 g', 'personal-care'],
  ['Closeup Red 150g', 'Closeup', 'Toothpaste, 150g', 95, 85, 100, '150 g', 'personal-care'],
  ['Dove Cream Beauty Soap 100g', 'Dove', 'Beauty soap, 100g', 60, 52, 200, '100 g', 'personal-care'],
  ['Lux Soft Glow 100g', 'Lux', 'Beauty soap, 100g', 45, 40, 180, '100 g', 'personal-care'],
  ['Cinthol Original 100g', 'Cinthol', 'Bath soap, 100g', 40, 35, 150, '100 g', 'personal-care'],
  ['Lifebuoy Total 125g', 'Lifebuoy', 'Germ protection soap, 125g', 40, 35, 200, '125 g', 'personal-care'],
  ['Dettol Skincare 125g', 'Dettol', 'Antibacterial soap, 125g', 45, 40, 160, '125 g', 'personal-care'],
  ['Nivea Soft Cream 50ml', 'Nivea', 'Moisturising cream, 50ml', 199, 175, 90, '50 ml', 'personal-care'],
  ['Nivea Body Lotion 200ml', 'Nivea', 'Body lotion, 200ml', 245, 218, 70, '200 ml', 'personal-care'],
  ['Pond\'s Cold Cream 100ml', "Pond's", 'Cold cream, 100ml', 145, 128, 80, '100 ml', 'personal-care'],
  ['Vaseline Intensive Care 200ml', 'Vaseline', 'Body lotion, 200ml', 199, 175, 75, '200 ml', 'personal-care'],
  ['Garnier Men Face Wash 100ml', 'Garnier', 'Face wash, 100ml', 175, 155, 65, '100 ml', 'personal-care'],

  // === Home Care (15) ===
  ['Surf Excel Easy Wash 1kg', 'Surf Excel', 'Detergent powder, 1kg', 145, 128, 200, '1 kg', 'home-care'],
  ['Surf Excel Matic 2kg', 'Surf Excel', 'Front load detergent, 2kg', 295, 265, 80, '2 kg', 'home-care'],
  ['Ariel Matic 2kg', 'Ariel', 'Front load detergent, 2kg', 305, 275, 90, '2 kg', 'home-care'],
  ['Ariel Perfect Wash 1kg', 'Ariel', 'Detergent powder, 1kg', 150, 132, 150, '1 kg', 'home-care'],
  ['Tide Plus 1kg', 'Tide', 'Detergent powder, 1kg', 110, 98, 180, '1 kg', 'home-care'],
  ['Tide Plus Extra Power 2kg', 'Tide', 'Detergent powder, 2kg', 215, 192, 100, '2 kg', 'home-care'],
  ['Wheel Active 1kg', 'Wheel', 'Detergent powder, 1kg', 70, 62, 160, '1 kg', 'home-care'],
  ['Ghadi Detergent 1kg', 'Ghadi', 'Detergent powder, 1kg', 80, 70, 140, '1 kg', 'home-care'],
  ['Comfort Fabric Conditioner 860ml', 'Comfort', 'Fabric softener, 860ml', 215, 192, 70, '860 ml', 'home-care'],
  ['Comfort After Wash 460ml', 'Comfort', 'Fabric conditioner, 460ml', 130, 115, 90, '460 ml', 'home-care'],
  ['Rin Soap Bar 250g', 'Rin', 'Detergent soap, 250g', 35, 30, 200, '250 g', 'home-care'],
  ['Rin Detergent Bar 700g (4x175g)', 'Rin', 'Detergent bar, 700g', 105, 92, 120, '700 g', 'home-care'],
  ['Clinic Plus Shampoo 340ml', 'Clinic Plus', 'Hair shampoo, 340ml', 220, 195, 100, '340 ml', 'home-care'],
  ['Dove Shampoo 340ml', 'Dove', 'Hair shampoo, 340ml', 285, 255, 80, '340 ml', 'home-care'],
  ['Head & Shoulders Shampoo 340ml', 'Head & Shoulders', 'Anti-dandruff shampoo, 340ml', 325, 290, 75, '340 ml', 'home-care'],

  // === Cleaning Supplies (15) ===
  ['Vim Dishwash Liquid 750ml', 'Vim', 'Dishwash liquid gel, 750ml', 199, 175, 150, '750 ml', 'cleaning-supplies'],
  ['Vim Dishwash Bar 300g (3x100g)', 'Vim', 'Dishwash bar, 300g', 45, 40, 200, '300 g', 'cleaning-supplies'],
  ['Pril Dishwash 425ml', 'Pril', 'Dishwash liquid, 425ml', 99, 88, 130, '425 ml', 'cleaning-supplies'],
  ['Exo Round Bar 500g', 'Exo', 'Dishwash bar, 500g', 35, 30, 180, '500 g', 'cleaning-supplies'],
  ['Harpic Power Plus 1L', 'Harpic', 'Toilet cleaner, 1L', 115, 99, 140, '1 L', 'cleaning-supplies'],
  ['Harpic Flushmatic 35g', 'Harpic', 'Toilet cleaner, 35g', 99, 88, 90, '35 g', 'cleaning-supplies'],
  ['Domex Disinfectant 750ml', 'Domex', 'Floor cleaner, 750ml', 145, 128, 100, '750 ml', 'cleaning-supplies'],
  ['Lizol Floor Cleaner 975ml', 'Lizol', 'Floor cleaner, 975ml', 199, 175, 110, '975 ml', 'cleaning-supplies'],
  ['Lizol Disinfectant 525ml', 'Lizol', 'Surface cleaner, 525ml', 130, 115, 90, '525 ml', 'cleaning-supplies'],
  ['Colin Glass Cleaner 500ml', 'Colin', 'Glass cleaner, 500ml', 99, 88, 120, '500 ml', 'cleaning-supplies'],
  ['Good Home Freshener 230ml', 'Good Home', 'Room freshener, 230ml', 145, 128, 80, '230 ml', 'cleaning-supplies'],
  ['Odonil Air Freshener 75g', 'Odonil', 'Bathroom freshener, 75g', 75, 65, 100, '75 g', 'cleaning-supplies'],
  ['Colin Floor Cleaner 500ml', 'Colin', 'Floor cleaner, 500ml', 99, 88, 85, '500 ml', 'cleaning-supplies'],
  ['Savlon Antiseptic 500ml', 'Savlon', 'Antiseptic liquid, 500ml', 165, 145, 110, '500 ml', 'cleaning-supplies'],
  ['Dettol Antiseptic 250ml', 'Dettol', 'Antiseptic liquid, 250ml', 130, 115, 130, '250 ml', 'cleaning-supplies'],

  // === Baby Care (15) ===
  ['Pampers New Baby Diapers M (36)', 'Pampers', 'Baby diapers, Medium, 36 count', 525, 470, 80, '36 pcs', 'baby-care'],
  ['Pampers New Baby Diapers L (30)', 'Pampers', 'Baby diapers, Large, 30 count', 525, 470, 70, '30 pcs', 'baby-care'],
  ['Pampers New Baby Diapers XL (28)', 'Pampers', 'Baby diapers, XL, 28 count', 525, 470, 60, '28 pcs', 'baby-care'],
  ['Huggies Wonder Pants M (32)', 'Huggies', 'Pants diapers, Medium, 32 count', 575, 515, 75, '32 pcs', 'baby-care'],
  ['Huggies Wonder Pants L (28)', 'Huggies', 'Pants diapers, Large, 28 count', 575, 515, 65, '28 pcs', 'baby-care'],
  ['MamyPoko Pants M (32)', 'MamyPoko', 'Pants diapers, Medium, 32 count', 499, 445, 70, '32 pcs', 'baby-care'],
  ['MamyPoko Pants L (28)', 'MamyPoko', 'Pants diapers, Large, 28 count', 499, 445, 60, '28 pcs', 'baby-care'],
  ['Johnson\'s Baby Shampoo 200ml', "Johnson's", 'Baby shampoo, 200ml', 215, 192, 110, '200 ml', 'baby-care'],
  ['Johnson\'s Baby Soap 75g', "Johnson's", 'Baby bath soap, 75g', 65, 58, 130, '75 g', 'baby-care'],
  ['Johnson\'s Baby Lotion 200ml', "Johnson's", 'Baby lotion, 200ml', 215, 192, 95, '200 ml', 'baby-care'],
  ['Johnson\'s Baby Oil 200ml', "Johnson's", 'Baby massage oil, 200ml', 245, 218, 85, '200 ml', 'baby-care'],
  ['Himalaya Baby Lotion 200ml', 'Himalaya', 'Baby lotion, 200ml', 175, 155, 90, '200 ml', 'baby-care'],
  ['Himalaya Baby Shampoo 200ml', 'Himalaya', 'Baby shampoo, 200ml', 165, 145, 100, '200 ml', 'baby-care'],
  ['Pigeon Baby Wipes 72 Sheets', 'Pigeon', 'Baby wet wipes, 72 sheets', 199, 175, 120, '72 pcs', 'baby-care'],
  ['Mee Mee Baby Wipes 80 Sheets', 'Mee Mee', 'Baby wet wipes, 80 sheets', 215, 192, 100, '80 pcs', 'baby-care'],

  // === Fruits (15) ===
  ['Fresh Bananas 1 dozen', 'Local Farm', 'Sweet ripe bananas', 60, 49, 100, '1 dozen', 'fruits'],
  ['Red Apples - Shimla 1kg', 'Shimla', 'Crispy sweet apples', 220, 180, 80, '1 kg', 'fruits'],
  ['Green Apples 1kg', 'Imported', 'Crunchy green apples', 240, 200, 60, '1 kg', 'fruits'],
  ['Sweet Oranges - Nagpur 1kg', 'Nagpur', 'Juicy oranges', 110, 90, 90, '1 kg', 'fruits'],
  ['Ripe Mangoes - Alphonso 1kg', 'Alphonso', 'Premium Alphonso mangoes', 420, 350, 40, '1 kg', 'fruits'],
  ['Green Grapes - Seedless 500g', 'Local Farm', 'Seedless green grapes', 150, 120, 70, '500 g', 'fruits'],
  ['Black Grapes 500g', 'Local Farm', 'Sweet black grapes', 130, 105, 65, '500 g', 'fruits'],
  ['Fresh Pomegranate 1kg', 'Local Farm', 'Juicy pomegranates', 190, 160, 75, '1 kg', 'fruits'],
  ['Sweet Lime - Mosambi 1kg', 'Local Farm', 'Sweet lime fruits', 90, 75, 85, '1 kg', 'fruits'],
  ['Papaya 1kg', 'Local Farm', 'Ripe papaya', 60, 50, 80, '1 kg', 'fruits'],
  ['Watermelon 1 piece (~5kg)', 'Local Farm', 'Fresh watermelon', 175, 145, 30, '1 piece', 'fruits'],
  ['Pineapple 1 piece', 'Local Farm', 'Fresh pineapple', 95, 79, 40, '1 piece', 'fruits'],
  ['Fresh Strawberries 200g', 'Local Farm', 'Sweet strawberries', 110, 89, 50, '200 g', 'fruits'],
  ['Kiwi Fruit 3 pieces', 'Imported', 'Fresh kiwi fruit', 145, 120, 45, '3 pcs', 'fruits'],
  ['Fresh Guava 500g', 'Local Farm', 'Pink guava', 50, 40, 70, '500 g', 'fruits'],

  // === Vegetables (15) ===
  ['Fresh Tomatoes 1kg', 'Local Farm', 'Farm fresh ripe tomatoes', 45, 35, 200, '1 kg', 'vegetables'],
  ['Onions 1kg', 'Local Farm', 'Quality onions', 50, 38, 250, '1 kg', 'vegetables'],
  ['Potatoes 1kg', 'Local Farm', 'Fresh potatoes', 40, 32, 220, '1 kg', 'vegetables'],
  ['Green Capsicum 500g', 'Local Farm', 'Crunchy green capsicum', 75, 60, 80, '500 g', 'vegetables'],
  ['Fresh Carrots 500g', 'Local Farm', 'Sweet crunchy carrots', 55, 45, 120, '500 g', 'vegetables'],
  ['Green Spinach (Palak) 500g', 'Local Farm', 'Fresh leafy spinach', 30, 25, 90, '500 g', 'vegetables'],
  ['Cauliflower 1 piece', 'Local Farm', 'Fresh cauliflower', 65, 55, 60, '1 piece', 'vegetables'],
  ['Cabbage 1 piece', 'Local Farm', 'Fresh green cabbage', 45, 35, 70, '1 piece', 'vegetables'],
  ['Bottle Gourd (Lauki) 1 piece', 'Local Farm', 'Fresh lauki', 45, 35, 80, '1 piece', 'vegetables'],
  ['Ridge Gourd (Turai) 500g', 'Local Farm', 'Fresh turai', 40, 32, 75, '500 g', 'vegetables'],
  ['Bitter Gourd (Karela) 500g', 'Local Farm', 'Fresh karela', 50, 40, 65, '500 g', 'vegetables'],
  ['Lady Finger (Bhindi) 500g', 'Local Farm', 'Fresh bhindi', 50, 40, 90, '500 g', 'vegetables'],
  ['Brinjal (Baingan) 500g', 'Local Farm', 'Fresh brinjal', 40, 32, 85, '500 g', 'vegetables'],
  ['Fresh Ginger 200g', 'Local Farm', 'Aromatic ginger', 45, 38, 100, '200 g', 'vegetables'],
  ['Fresh Garlic 100g', 'Local Farm', 'Aromatic garlic', 40, 32, 110, '100 g', 'vegetables'],
]

// ─────────────────────────────────────────────────────────────────────────────
// SVG image generator — creates a professional branded product card
// ─────────────────────────────────────────────────────────────────────────────
function generateProductSVG(opts: {
  productName: string
  brand: string
  unit: string
  categorySlug: string
}): string {
  const colors = CATEGORY_COLORS[opts.categorySlug] || { from: '#6b7280', to: '#374151', emoji: '📦' }
  // Escape XML special characters — must handle & first to avoid double-encoding
  const escape = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;')
  // Apply uppercasing BEFORE escaping so XML entity case isn't corrupted
  // (&apos; must stay lowercase — toUpperCase() would turn it into &APOS; which is invalid)
  const productName = escape(opts.productName)
  const brand = escape(opts.brand.toUpperCase())
  const unit = escape(opts.unit)

  // Truncate long product names for display
  const displayName = productName.length > 30 ? productName.substring(0, 28) + '…' : productName

  return `<svg width="600" height="600" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${colors.from}"/>
      <stop offset="100%" stop-color="${colors.to}"/>
    </linearGradient>
    <linearGradient id="overlay" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="rgba(255,255,255,0.15)"/>
      <stop offset="100%" stop-color="rgba(0,0,0,0.15)"/>
    </linearGradient>
    <filter id="shadow">
      <feGaussianBlur stdDeviation="4"/>
      <feOffset dy="3"/>
      <feComponentTransfer><feFuncA type="linear" slope="0.3"/></feComponentTransfer>
      <feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>

  <!-- Background -->
  <rect width="600" height="600" fill="url(#bg)"/>
  <rect width="600" height="600" fill="url(#overlay)"/>

  <!-- Decorative circles -->
  <circle cx="500" cy="100" r="80" fill="rgba(255,255,255,0.08)"/>
  <circle cx="80" cy="520" r="120" fill="rgba(255,255,255,0.06)"/>

  <!-- Category emoji (large, centered) -->
  <text x="300" y="280" font-size="180" text-anchor="middle" dominant-baseline="middle" filter="url(#shadow)">${colors.emoji}</text>

  <!-- Brand badge (top) -->
  <rect x="40" y="40" width="${brand.length * 12 + 40}" height="44" rx="22" fill="rgba(255,255,255,0.95)"/>
  <text x="${40 + (brand.length * 12 + 40) / 2}" y="68" font-family="Arial, sans-serif" font-size="20" font-weight="bold" fill="${colors.to}" text-anchor="middle">${brand}</text>

  <!-- Product name (bottom area) -->
  <rect x="0" y="430" width="600" height="170" fill="rgba(0,0,0,0.4)"/>
  <text x="300" y="475" font-family="Arial, sans-serif" font-size="28" font-weight="bold" fill="white" text-anchor="middle">${displayName}</text>

  <!-- Weight/unit -->
  <rect x="240" y="510" width="120" height="36" rx="18" fill="rgba(255,255,255,0.25)"/>
  <text x="300" y="534" font-family="Arial, sans-serif" font-size="18" font-weight="600" fill="white" text-anchor="middle">${unit}</text>

  <!-- "Mehta Super Market" footer -->
  <text x="300" y="575" font-family="Arial, sans-serif" font-size="13" fill="rgba(255,255,255,0.6)" text-anchor="middle">Mehta Super Market • Rajula</text>
</svg>`
}

// ─────────────────────────────────────────────────────────────────────────────
// Main script
// ─────────────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`=== Generating ${PRODUCTS.length} products with branded SVG images ===\n`)

  // Step 1: Create missing categories
  console.log('Step 1: Ensuring all 20 categories exist...')
  for (const c of CATEGORIES) {
    const existing = await db.category.findFirst({ where: { slug: c.slug } })
    if (!existing) {
      await db.category.create({ data: { name: c.name, slug: c.slug, icon: c.icon } })
      console.log(`  + Created category: ${c.name}`)
    }
  }
  const allCats = await db.category.findMany()
  console.log(`  Total categories: ${allCats.length}\n`)

  // Step 2: Generate SVG images locally
  console.log('Step 2: Generating branded SVG images locally...')
  const imgDir = path.join(process.cwd(), 'public', 'uploads', 'products')
  if (!existsSync(imgDir)) await mkdir(imgDir, { recursive: true })

  const categoryMap = new Map(allCats.map((c) => [c.slug, c.id]))
  const productsToInsert: any[] = []

  for (let i = 0; i < PRODUCTS.length; i++) {
    const [name, brand, description, mrp, price, stock, unit, catSlug] = PRODUCTS[i]
    const categoryId = categoryMap.get(catSlug)
    if (!categoryId) {
      console.error(`Category not found: ${catSlug} for product ${name}`)
      continue
    }

    // Generate SVG → convert to PNG via sharp
    const svg = generateProductSVG({ productName: name, brand, unit, categorySlug: catSlug })
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').substring(0, 50)
    const filename = `${slug}.png`
    const filepath = path.join(imgDir, filename)

    if (!existsSync(filepath)) {
      await sharp(Buffer.from(svg)).png().toFile(filepath)
    }

    const imageUrl = `/uploads/products/${filename}`

    productsToInsert.push({
      name,
      description,
      price,
      mrp,
      unit,
      images: JSON.stringify([imageUrl]),
      categoryId,
      stock,
      isActive: true,
    })

    if ((i + 1) % 50 === 0) {
      console.log(`  Generated ${i + 1}/${PRODUCTS.length} images`)
    }
  }
  console.log(`  Generated all ${productsToInsert.length} images\n`)

  // Step 3: Insert products (skip if already exists by name)
  console.log('Step 3: Inserting products into Neon Postgres...')
  let inserted = 0
  let skipped = 0
  for (const p of productsToInsert) {
    const existing = await db.product.findFirst({ where: { name: p.name } })
    if (existing) {
      skipped++
      continue
    }
    await db.product.create({ data: p })
    inserted++
  }
  console.log(`  Inserted: ${inserted}`)
  console.log(`  Skipped (already exist): ${skipped}\n`)

  // Step 4: Summary
  const totalProducts = await db.product.count()
  const totalCategories = await db.category.count()
  console.log('═══════════════════════════════════════════════════════════════')
  console.log('  SUMMARY')
  console.log('═══════════════════════════════════════════════════════════════')
  console.log(`  Total categories: ${totalCategories}`)
  console.log(`  Total products:   ${totalProducts}`)
  console.log(`  Images generated: ${productsToInsert.length} (in /public/uploads/products/)`)
  console.log('═══════════════════════════════════════════════════════════════')

  await db.$disconnect()
}

main().catch((e) => { console.error(e); process.exit(1) })
