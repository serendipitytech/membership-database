


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;




ALTER SCHEMA "public" OWNER TO "postgres";


CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."is_admin"("user_id" "uuid") RETURNS boolean
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $_$
  SELECT EXISTS (
    SELECT 1 FROM admins WHERE admins.user_id = $1
  ) OR EXISTS (
    SELECT 1 FROM members WHERE members.user_id = $1 AND is_admin = true
  );
$_$;


ALTER FUNCTION "public"."is_admin"("user_id" "uuid") OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."admins" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."admins" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."constant_contact_tokens" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "access_token" "text" NOT NULL,
    "refresh_token" "text" NOT NULL,
    "token_expiry" timestamp with time zone NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."constant_contact_tokens" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."event_attendance" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "event_id" "uuid" NOT NULL,
    "member_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."event_attendance" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "date" "date" NOT NULL,
    "time" time without time zone,
    "location" "text",
    "description" "text",
    "type" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."import_mappings" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" "text" NOT NULL,
    "type" "text" NOT NULL,
    "source_fields" "jsonb" NOT NULL,
    "transformations" "jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."import_mappings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."interest_categories" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "display_order" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."interest_categories" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."interests" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "category_id" "uuid",
    "name" "text" NOT NULL,
    "description" "text",
    "display_order" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."interests" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."meeting_attendance" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "meeting_id" "uuid",
    "member_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."meeting_attendance" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."meetings" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "date" "date" NOT NULL,
    "time" "text" NOT NULL,
    "location" "text" NOT NULL,
    "type" "text" DEFAULT 'general'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."meetings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."member_interests" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "member_id" "uuid",
    "interest_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."member_interests" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."members" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "first_name" "text" NOT NULL,
    "last_name" "text" NOT NULL,
    "email" "text" NOT NULL,
    "phone" "text",
    "address" "text",
    "city" "text",
    "state" "text",
    "zip" "text",
    "membership_type" "text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "joined_date" timestamp with time zone DEFAULT "now"(),
    "renewal_date" timestamp with time zone DEFAULT ("now"() + '1 year'::interval),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "user_id" "uuid",
    "is_admin" boolean DEFAULT false NOT NULL,
    "is_cell_phone" boolean DEFAULT true,
    "tshirt_size" "text",
    "birthdate" "date",
    "special_skills" "text",
    "emergency_contact_name" "text",
    "emergency_contact_phone" "text",
    "emergency_contact_relationship" "text",
    "health_issues" "text",
    "registration_date" "date" DEFAULT CURRENT_DATE,
    "signature" "text",
    "date_of_birth" "date",
    "shirt_size" "text",
    "precinct" "text",
    "voter_id" "text",
    "tell_us_more" "text",
    "terms_accepted" boolean DEFAULT false,
    "constant_contact_synced" boolean DEFAULT false,
    "constant_contact_sync_date" timestamp with time zone,
    "constant_contact_sync_error" "text"
);


ALTER TABLE "public"."members" OWNER TO "postgres";


COMMENT ON COLUMN "public"."members"."phone" IS 'Phone number stored as digits only (no formatting)';



COMMENT ON COLUMN "public"."members"."is_cell_phone" IS 'Indicates if the phone number is a cell phone';



COMMENT ON COLUMN "public"."members"."tshirt_size" IS 'Member''s t-shirt size (values managed through pick_list_values)';



COMMENT ON COLUMN "public"."members"."emergency_contact_name" IS 'Name of emergency contact';



COMMENT ON COLUMN "public"."members"."emergency_contact_phone" IS 'Emergency contact phone number stored as digits only (no formatting)';



COMMENT ON COLUMN "public"."members"."emergency_contact_relationship" IS 'Relationship to emergency contact';



COMMENT ON COLUMN "public"."members"."signature" IS 'Electronic signature of the member';



COMMENT ON COLUMN "public"."members"."date_of_birth" IS 'Member''s date of birth';



COMMENT ON COLUMN "public"."members"."shirt_size" IS 'Member''s t-shirt size (values managed through pick_list_values)';



COMMENT ON COLUMN "public"."members"."precinct" IS 'Member''s precinct number';



COMMENT ON COLUMN "public"."members"."voter_id" IS 'Member''s voter ID number';



COMMENT ON COLUMN "public"."members"."tell_us_more" IS 'Additional information about the member';



COMMENT ON COLUMN "public"."members"."terms_accepted" IS 'Indicates if the member has accepted the terms';



CREATE TABLE IF NOT EXISTS "public"."payments" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "member_id" "uuid",
    "amount" numeric NOT NULL,
    "date" "date" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "payment_method" "text",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "is_recurring" boolean DEFAULT false NOT NULL,
    "receipt_id" "text"
);


ALTER TABLE "public"."payments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."pick_list_categories" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "display_order" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."pick_list_categories" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."pick_list_values" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "category_id" "uuid" NOT NULL,
    "value" "text" NOT NULL,
    "description" "text",
    "display_order" integer DEFAULT 0,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "name" "text" NOT NULL
);


ALTER TABLE "public"."pick_list_values" OWNER TO "postgres";


COMMENT ON COLUMN "public"."pick_list_values"."value" IS 'HTML-compatible value (auto-generated)';



COMMENT ON COLUMN "public"."pick_list_values"."description" IS 'Optional detailed description';



COMMENT ON COLUMN "public"."pick_list_values"."name" IS 'User-friendly name (what user enters)';



CREATE TABLE IF NOT EXISTS "public"."volunteer_hours" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "member_id" "uuid",
    "date" "date",
    "hours" numeric NOT NULL,
    "description" "text" NOT NULL,
    "category" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "event_id" "uuid",
    "notes" "text"
);


ALTER TABLE "public"."volunteer_hours" OWNER TO "postgres";


ALTER TABLE ONLY "public"."admins"
    ADD CONSTRAINT "admins_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."admins"
    ADD CONSTRAINT "admins_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."constant_contact_tokens"
    ADD CONSTRAINT "constant_contact_tokens_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."event_attendance"
    ADD CONSTRAINT "event_attendance_event_id_member_id_key" UNIQUE ("event_id", "member_id");



ALTER TABLE ONLY "public"."event_attendance"
    ADD CONSTRAINT "event_attendance_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."events"
    ADD CONSTRAINT "events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."import_mappings"
    ADD CONSTRAINT "import_mappings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."interest_categories"
    ADD CONSTRAINT "interest_categories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."interests"
    ADD CONSTRAINT "interests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."meeting_attendance"
    ADD CONSTRAINT "meeting_attendance_meeting_id_member_id_key" UNIQUE ("meeting_id", "member_id");



ALTER TABLE ONLY "public"."meeting_attendance"
    ADD CONSTRAINT "meeting_attendance_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."meetings"
    ADD CONSTRAINT "meetings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."member_interests"
    ADD CONSTRAINT "member_interests_member_id_interest_id_key" UNIQUE ("member_id", "interest_id");



ALTER TABLE ONLY "public"."member_interests"
    ADD CONSTRAINT "member_interests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."members"
    ADD CONSTRAINT "members_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."members"
    ADD CONSTRAINT "members_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pick_list_categories"
    ADD CONSTRAINT "pick_list_categories_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."pick_list_categories"
    ADD CONSTRAINT "pick_list_categories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pick_list_values"
    ADD CONSTRAINT "pick_list_values_category_id_value_key" UNIQUE ("category_id", "value");



ALTER TABLE ONLY "public"."pick_list_values"
    ADD CONSTRAINT "pick_list_values_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."volunteer_hours"
    ADD CONSTRAINT "volunteer_hours_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_members_constant_contact_sync" ON "public"."members" USING "btree" ("constant_contact_synced") WHERE ("constant_contact_synced" = false);



ALTER TABLE ONLY "public"."admins"
    ADD CONSTRAINT "admins_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."event_attendance"
    ADD CONSTRAINT "event_attendance_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."event_attendance"
    ADD CONSTRAINT "event_attendance_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."interests"
    ADD CONSTRAINT "interests_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."interest_categories"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."meeting_attendance"
    ADD CONSTRAINT "meeting_attendance_meeting_id_fkey" FOREIGN KEY ("meeting_id") REFERENCES "public"."meetings"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."meeting_attendance"
    ADD CONSTRAINT "meeting_attendance_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."member_interests"
    ADD CONSTRAINT "member_interests_interest_id_fkey" FOREIGN KEY ("interest_id") REFERENCES "public"."interests"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."member_interests"
    ADD CONSTRAINT "member_interests_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."members"
    ADD CONSTRAINT "members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pick_list_values"
    ADD CONSTRAINT "pick_list_values_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."pick_list_categories"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."volunteer_hours"
    ADD CONSTRAINT "volunteer_hours_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."volunteer_hours"
    ADD CONSTRAINT "volunteer_hours_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE CASCADE;



CREATE POLICY "Admins can manage Constant Contact tokens" ON "public"."constant_contact_tokens" TO "authenticated" USING ("public"."is_admin"("auth"."uid"())) WITH CHECK ("public"."is_admin"("auth"."uid"()));



CREATE POLICY "Admins can manage all interests" ON "public"."member_interests" TO "authenticated" USING ("public"."is_admin"("auth"."uid"()));



CREATE POLICY "Admins can manage all members" ON "public"."members" TO "authenticated" USING ("public"."is_admin"("auth"."uid"())) WITH CHECK ("public"."is_admin"("auth"."uid"()));



CREATE POLICY "Admins can manage all payments" ON "public"."payments" TO "authenticated" USING ("public"."is_admin"("auth"."uid"())) WITH CHECK ("public"."is_admin"("auth"."uid"()));



CREATE POLICY "Admins can manage all volunteer hours" ON "public"."volunteer_hours" TO "authenticated" USING ("public"."is_admin"("auth"."uid"())) WITH CHECK ("public"."is_admin"("auth"."uid"()));



CREATE POLICY "Admins can manage meetings" ON "public"."meetings" TO "authenticated" USING ("public"."is_admin"("auth"."uid"())) WITH CHECK ("public"."is_admin"("auth"."uid"()));



CREATE POLICY "Admins can manage other admins" ON "public"."admins" TO "authenticated" USING ("public"."is_admin"("auth"."uid"()));



CREATE POLICY "Allow admin all operations on interest_categories" ON "public"."interest_categories" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."members"
  WHERE (("members"."email" = ("auth"."jwt"() ->> 'email'::"text")) AND ("members"."is_admin" = true)))));



CREATE POLICY "Allow admin all operations on interests" ON "public"."interests" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."members"
  WHERE (("members"."email" = ("auth"."jwt"() ->> 'email'::"text")) AND ("members"."is_admin" = true)))));



CREATE POLICY "Allow admin all operations on meeting_attendance" ON "public"."meeting_attendance" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."members"
  WHERE (("members"."email" = ("auth"."jwt"() ->> 'email'::"text")) AND ("members"."is_admin" = true)))));



CREATE POLICY "Allow admin all operations on meetings" ON "public"."meetings" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."members"
  WHERE (("members"."email" = ("auth"."jwt"() ->> 'email'::"text")) AND ("members"."is_admin" = true)))));



CREATE POLICY "Allow admin all operations on member_interests" ON "public"."member_interests" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."members"
  WHERE (("members"."email" = ("auth"."jwt"() ->> 'email'::"text")) AND ("members"."is_admin" = true)))));



CREATE POLICY "Allow admin all operations on members" ON "public"."members" TO "authenticated" USING ("public"."is_admin"("auth"."uid"())) WITH CHECK ("public"."is_admin"("auth"."uid"()));



CREATE POLICY "Allow admin all operations on payments" ON "public"."payments" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."members"
  WHERE (("members"."email" = ("auth"."jwt"() ->> 'email'::"text")) AND ("members"."is_admin" = true)))));



CREATE POLICY "Allow admin all operations on volunteer_hours" ON "public"."volunteer_hours" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."members"
  WHERE (("members"."email" = ("auth"."jwt"() ->> 'email'::"text")) AND ("members"."is_admin" = true)))));



CREATE POLICY "Allow all access to pick_list_categories" ON "public"."pick_list_categories" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Allow all access to pick_list_values" ON "public"."pick_list_values" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Allow all operations for authenticated users" ON "public"."constant_contact_tokens" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Allow all operations on member_interests" ON "public"."member_interests" TO "authenticated", "anon" USING (true) WITH CHECK (true);



CREATE POLICY "Allow all operations on members" ON "public"."members" TO "authenticated", "anon" USING (true) WITH CHECK (true);



CREATE POLICY "Allow anonymous insert on member_interests" ON "public"."member_interests" FOR INSERT TO "anon" WITH CHECK (true);



CREATE POLICY "Allow anonymous insert on members" ON "public"."members" FOR INSERT TO "anon" WITH CHECK (true);



CREATE POLICY "Allow anonymous select on interest_categories" ON "public"."interest_categories" FOR SELECT TO "anon" USING (true);



CREATE POLICY "Allow anonymous select on interests" ON "public"."interests" FOR SELECT TO "anon" USING (true);



CREATE POLICY "Allow authenticated read on meeting_attendance" ON "public"."meeting_attendance" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Allow authenticated read on meetings" ON "public"."meetings" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Allow authenticated read on member_interests" ON "public"."member_interests" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Allow authenticated read on members" ON "public"."members" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Allow authenticated read on payments" ON "public"."payments" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Allow authenticated read on volunteer_hours" ON "public"."volunteer_hours" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Allow authenticated select on interest_categories" ON "public"."interest_categories" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Allow authenticated select on interests" ON "public"."interests" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Allow logged in users to read their member record" ON "public"."members" FOR SELECT USING (("auth"."email"() = "email"));



CREATE POLICY "Allow read access to everyone" ON "public"."members" FOR SELECT USING (true);



CREATE POLICY "Anyone can add interests during registration" ON "public"."member_interests" FOR INSERT TO "anon" WITH CHECK (true);



CREATE POLICY "Anyone can create payments" ON "public"."payments" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Anyone can read meetings" ON "public"."meetings" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Anyone can register as a member" ON "public"."members" FOR INSERT TO "anon" WITH CHECK (true);



CREATE POLICY "Enable delete for admins" ON "public"."meeting_attendance" FOR DELETE TO "authenticated" USING ("public"."is_admin"("auth"."uid"()));



CREATE POLICY "Enable delete for authenticated users" ON "public"."event_attendance" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "Enable delete for authenticated users" ON "public"."events" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "Enable delete for authenticated users" ON "public"."import_mappings" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "Enable delete for authenticated users" ON "public"."payments" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "Enable delete for authenticated users only" ON "public"."event_attendance" FOR DELETE USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Enable delete for authenticated users only" ON "public"."events" FOR DELETE USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Enable delete for members" ON "public"."member_interests" FOR DELETE TO "authenticated" USING (("member_id" IN ( SELECT "members"."id"
   FROM "public"."members"
  WHERE ("members"."user_id" = "auth"."uid"()))));



CREATE POLICY "Enable insert for admins" ON "public"."meeting_attendance" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_admin"("auth"."uid"()));



CREATE POLICY "Enable insert for authenticated users" ON "public"."constant_contact_tokens" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Enable insert for authenticated users" ON "public"."event_attendance" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Enable insert for authenticated users" ON "public"."events" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Enable insert for authenticated users" ON "public"."import_mappings" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Enable insert for authenticated users" ON "public"."payments" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Enable insert for authenticated users only" ON "public"."event_attendance" FOR INSERT WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Enable insert for authenticated users only" ON "public"."events" FOR INSERT WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Enable insert for members" ON "public"."member_interests" FOR INSERT TO "authenticated" WITH CHECK (("member_id" IN ( SELECT "members"."id"
   FROM "public"."members"
  WHERE ("members"."user_id" = "auth"."uid"()))));



CREATE POLICY "Enable read access for all authenticated users" ON "public"."meeting_attendance" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Enable read access for all authenticated users" ON "public"."member_interests" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Enable read access for all users" ON "public"."event_attendance" FOR SELECT USING (true);



CREATE POLICY "Enable read access for all users" ON "public"."events" FOR SELECT USING (true);



CREATE POLICY "Enable read access for all users" ON "public"."pick_list_categories" FOR SELECT USING (true);



CREATE POLICY "Enable read access for all users" ON "public"."pick_list_values" FOR SELECT USING (true);



CREATE POLICY "Enable read access for authenticated users" ON "public"."constant_contact_tokens" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Enable read access for authenticated users" ON "public"."event_attendance" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Enable read access for authenticated users" ON "public"."events" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Enable read access for authenticated users" ON "public"."import_mappings" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Enable read access for authenticated users" ON "public"."payments" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Enable update for admins" ON "public"."meeting_attendance" FOR UPDATE TO "authenticated" USING ("public"."is_admin"("auth"."uid"())) WITH CHECK ("public"."is_admin"("auth"."uid"()));



CREATE POLICY "Enable update for authenticated users" ON "public"."constant_contact_tokens" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Enable update for authenticated users" ON "public"."event_attendance" FOR UPDATE TO "authenticated" USING (true);



CREATE POLICY "Enable update for authenticated users" ON "public"."events" FOR UPDATE TO "authenticated" USING (true);



CREATE POLICY "Enable update for authenticated users" ON "public"."import_mappings" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Enable update for authenticated users" ON "public"."payments" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Enable update for authenticated users only" ON "public"."event_attendance" FOR UPDATE USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Enable update for authenticated users only" ON "public"."events" FOR UPDATE USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Enable update for members" ON "public"."member_interests" FOR UPDATE TO "authenticated" USING (("member_id" IN ( SELECT "members"."id"
   FROM "public"."members"
  WHERE ("members"."user_id" = "auth"."uid"())))) WITH CHECK (("member_id" IN ( SELECT "members"."id"
   FROM "public"."members"
  WHERE ("members"."user_id" = "auth"."uid"()))));



CREATE POLICY "Meetings are readable by all" ON "public"."meetings" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Members can read their own attendance" ON "public"."meeting_attendance" FOR SELECT TO "authenticated" USING (("member_id" IN ( SELECT "members"."id"
   FROM "public"."members"
  WHERE ("members"."email" = ("auth"."jwt"() ->> 'email'::"text")))));



CREATE POLICY "Members can read their own data" ON "public"."members" FOR SELECT TO "authenticated" USING (("email" = ("auth"."jwt"() ->> 'email'::"text")));



CREATE POLICY "Members can read their own interests" ON "public"."member_interests" FOR SELECT TO "authenticated" USING (("member_id" IN ( SELECT "members"."id"
   FROM "public"."members"
  WHERE ("members"."email" = ("auth"."jwt"() ->> 'email'::"text")))));



CREATE POLICY "Members can read their own payments" ON "public"."payments" FOR SELECT TO "authenticated" USING (("member_id" IN ( SELECT "members"."id"
   FROM "public"."members"
  WHERE ("members"."email" = ("auth"."jwt"() ->> 'email'::"text")))));



CREATE POLICY "Members can read their own volunteer hours" ON "public"."volunteer_hours" FOR SELECT TO "authenticated" USING (("member_id" IN ( SELECT "members"."id"
   FROM "public"."members"
  WHERE ("members"."email" = ("auth"."jwt"() ->> 'email'::"text")))));



CREATE POLICY "Members can update their own data" ON "public"."members" FOR UPDATE USING (("auth"."uid"() = "id"));



CREATE POLICY "Members can view their own data" ON "public"."members" FOR SELECT USING (("auth"."uid"() = "id"));



CREATE POLICY "Members can view their own interests" ON "public"."member_interests" FOR SELECT TO "authenticated" USING (("member_id" IN ( SELECT "members"."id"
   FROM "public"."members"
  WHERE ("members"."email" = ("auth"."jwt"() ->> 'email'::"text")))));



CREATE POLICY "Users can check their own admin status" ON "public"."admins" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."admins" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."constant_contact_tokens" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."event_attendance" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."events" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."import_mappings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."interest_categories" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."interests" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."meeting_attendance" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."meetings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."member_interests" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."members" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."payments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."pick_list_categories" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."pick_list_values" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."volunteer_hours" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


REVOKE USAGE ON SCHEMA "public" FROM PUBLIC;
GRANT ALL ON SCHEMA "public" TO PUBLIC;
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "anon";

























































































































































GRANT ALL ON FUNCTION "public"."is_admin"("user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_admin"("user_id" "uuid") TO "anon";


















GRANT ALL ON TABLE "public"."admins" TO "authenticated";
GRANT ALL ON TABLE "public"."admins" TO "anon";



GRANT ALL ON TABLE "public"."constant_contact_tokens" TO "authenticated";



GRANT ALL ON TABLE "public"."event_attendance" TO "authenticated";



GRANT ALL ON TABLE "public"."events" TO "authenticated";



GRANT ALL ON TABLE "public"."import_mappings" TO "authenticated";



GRANT ALL ON TABLE "public"."interest_categories" TO "authenticated";
GRANT ALL ON TABLE "public"."interest_categories" TO "anon";



GRANT ALL ON TABLE "public"."interests" TO "authenticated";
GRANT ALL ON TABLE "public"."interests" TO "anon";



GRANT ALL ON TABLE "public"."meeting_attendance" TO "authenticated";
GRANT ALL ON TABLE "public"."meeting_attendance" TO "anon";



GRANT ALL ON TABLE "public"."meetings" TO "authenticated";
GRANT ALL ON TABLE "public"."meetings" TO "anon";



GRANT ALL ON TABLE "public"."member_interests" TO "authenticated";
GRANT ALL ON TABLE "public"."member_interests" TO "anon";



GRANT ALL ON TABLE "public"."members" TO "authenticated";
GRANT ALL ON TABLE "public"."members" TO "anon";



GRANT ALL ON TABLE "public"."payments" TO "authenticated";
GRANT ALL ON TABLE "public"."payments" TO "anon";



GRANT ALL ON TABLE "public"."pick_list_categories" TO "authenticated";
GRANT SELECT ON TABLE "public"."pick_list_categories" TO "anon";



GRANT ALL ON TABLE "public"."pick_list_values" TO "authenticated";
GRANT SELECT ON TABLE "public"."pick_list_values" TO "anon";



GRANT ALL ON TABLE "public"."volunteer_hours" TO "authenticated";
GRANT ALL ON TABLE "public"."volunteer_hours" TO "anon";

































RESET ALL;
