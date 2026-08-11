import { relations } from 'drizzle-orm';
import { integer, pgTable, serial, text, timestamp, boolean, doublePrecision } from 'drizzle-orm/pg-core';

export const units = pgTable('units', {
  id: serial('id').primaryKey(),
  name: text('name').notNull().unique(),
  // 'dia_ban' | 'truong_hoc' | 'doanh_nghiep' | 'luc_luong_vu_trang'
  type: text('type').notNull().default('dia_ban'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow(),
});

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(), // Firebase Auth UID
  email: text('email').notNull(),
  fullName: text('full_name'),
  dob: text('dob'),
  gender: text('gender'),
  cccd: text('cccd'),
  phone: text('phone'),
  address: text('address'),
  unit: text('unit'), // Đơn vị học tập/công tác
  unitId: integer('unit_id').references(() => units.id), // Đơn vị Đoàn, NULL nếu chưa chọn
  skills: text('skills'),
  
  role: text('role').default('tnv'), // 'thanh_doan', 'doan_co_so', 'tnv'
  isVerified: boolean('is_verified').default(false), // Xác minh đoàn viên
  
  reputationPoints: integer('reputation_points').default(0),
  volunteerHours: doublePrecision('volunteer_hours').default(0),
  activitiesCount: integer('activities_count').default(0),
  
  createdAt: timestamp('created_at').defaultNow(),
});

export const activities = pgTable('activities', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description').notNull(),
  banner: text('banner'),
  organizerId: integer('organizer_id').references(() => users.id).notNull(),
  timeStart: timestamp('time_start').notNull(),
  timeEnd: timestamp('time_end').notNull(),
  location: text('location').notNull(),
  lat: doublePrecision('lat'),
  lng: doublePrecision('lng'),
  requiredVolunteers: integer('required_volunteers').notNull(),
  category: text('category'), // An sinh xã hội, Chuyển đổi số...
  zaloLink: text('zalo_link'),
  files: text('files'),
  status: text('status').default('pending'), // 'pending', 'approved', 'rejected'
  createdAt: timestamp('created_at').defaultNow(),
});

export const activityRegistrations = pgTable('activity_registrations', {
  id: serial('id').primaryKey(),
  activityId: integer('activity_id').references(() => activities.id).notNull(),
  userId: integer('user_id').references(() => users.id).notNull(),
  status: text('status').default('registered'), // 'registered', 'attended', 'absent'
  isReserve: boolean('is_reserve').default(false),
  createdAt: timestamp('created_at').defaultNow(),
});

export const usersRelations = relations(users, ({ one, many }) => ({
  activitiesOrganized: many(activities),
  registrations: many(activityRegistrations),
  unit: one(units, {
    fields: [users.unitId],
    references: [units.id],
  }),
}));

export const unitsRelations = relations(units, ({ many }) => ({
  members: many(users),
}));

export const activitiesRelations = relations(activities, ({ one, many }) => ({
  organizer: one(users, {
    fields: [activities.organizerId],
    references: [users.id],
  }),
  registrations: many(activityRegistrations),
}));

export const activityRegistrationsRelations = relations(activityRegistrations, ({ one }) => ({
  activity: one(activities, {
    fields: [activityRegistrations.activityId],
    references: [activities.id],
  }),
  user: one(users, {
    fields: [activityRegistrations.userId],
    references: [users.id],
  }),
}));
