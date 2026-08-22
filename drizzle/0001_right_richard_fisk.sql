ALTER TABLE "activities" ADD COLUMN "registered_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
-- Điền registered_count cho các hoạt động đã có.
UPDATE "activities" a
SET registered_count = (
  SELECT count(*) FROM "activity_registrations" r WHERE r.activity_id = a.id
);--> statement-breakpoint
CREATE INDEX "idx_activities_status_created" ON "activities" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "idx_registrations_user_created" ON "activity_registrations" USING btree ("user_id","created_at");--> statement-breakpoint
-- Dọn đăng ký trùng trước khi tạo ràng buộc duy nhất.
-- Giữ bản ghi cũ nhất theo id, xóa các bản trùng còn lại.
DELETE FROM "activity_registrations" a
USING "activity_registrations" b
WHERE a.activity_id = b.activity_id
  AND a.user_id = b.user_id
  AND a.id > b.id;--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_registrations_activity_user" ON "activity_registrations" USING btree ("activity_id","user_id");--> statement-breakpoint
CREATE INDEX "idx_users_reputation" ON "users" USING btree ("reputation_points");--> statement-breakpoint
CREATE INDEX "idx_users_unit_reputation" ON "users" USING btree ("unit_id","reputation_points");