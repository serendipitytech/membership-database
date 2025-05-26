-- Current Database Schema for NW Democrats Membership System
-- Generated from current database state

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";

-- Create admin check function
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

-- Create tables
CREATE TABLE IF NOT EXISTS "public"."admins" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "admins_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "admins_user_id_key" UNIQUE ("user_id"),
    CONSTRAINT "admins_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "public"."constant_contact_tokens" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "access_token" "text" NOT NULL,
    "refresh_token" "text" NOT NULL,
    "token_expiry" timestamp with time zone NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "constant_contact_tokens_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "public"."interest_categories" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "display_order" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "interest_categories_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "public"."interests" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "category_id" "uuid",
    "name" "text" NOT NULL,
    "description" "text",
    "display_order" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "interests_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "interests_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."interest_categories"("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "public"."meeting_attendance" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "meeting_id" "uuid",
    "member_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "meeting_attendance_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "meeting_attendance_meeting_id_member_id_key" UNIQUE ("meeting_id", "member_id"),
    CONSTRAINT "meeting_attendance_meeting_id_fkey" FOREIGN KEY ("meeting_id") REFERENCES "public"."meetings"("id") ON DELETE CASCADE,
    CONSTRAINT "meeting_attendance_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "public"."meetings" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "date" "date" NOT NULL,
    "time" "text" NOT NULL,
    "location" "text" NOT NULL,
    "type" "text" DEFAULT 'general'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "meetings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "public"."member_interests" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "member_id" "uuid",
    "interest_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "member_interests_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "member_interests_member_id_interest_id_key" UNIQUE ("member_id", "interest_id"),
    CONSTRAINT "member_interests_interest_id_fkey" FOREIGN KEY ("interest_id") REFERENCES "public"."interests"("id") ON DELETE CASCADE,
    CONSTRAINT "member_interests_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE CASCADE
);

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
    "constant_contact_sync_error" "text",
    CONSTRAINT "members_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "members_email_key" UNIQUE ("email"),
    CONSTRAINT "members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE,
    CONSTRAINT "members_shirt_size_check" CHECK (("shirt_size" = ANY (ARRAY['S'::"text", 'M'::"text", 'L'::"text", 'XL'::"text", '2XL'::"text", '3XL'::"text"]))),
    CONSTRAINT "members_tshirt_size_check" CHECK (("tshirt_size" = ANY (ARRAY['S'::"text", 'M'::"text", 'L'::"text", 'XL'::"text", '2XL'::"text", '3XL'::"text"])))
);

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
    CONSTRAINT "payments_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "payments_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "public"."volunteer_hours" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "member_id" "uuid",
    "date" "date" NOT NULL,
    "hours" numeric NOT NULL,
    "description" "text" NOT NULL,
    "category" "text",
    "meeting_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "event_id" "uuid",
    "notes" "text",
    CONSTRAINT "volunteer_hours_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "volunteer_hours_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE CASCADE,
    CONSTRAINT "volunteer_hours_meeting_id_fkey" FOREIGN KEY ("meeting_id") REFERENCES "public"."meetings"("id") ON DELETE SET NULL,
    CONSTRAINT "volunteer_hours_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."meetings"("id") ON DELETE SET NULL
);

-- Create indexes
CREATE INDEX "idx_members_constant_contact_sync" ON "public"."members" USING "btree" ("constant_contact_synced") WHERE ("constant_contact_synced" = false);

-- Enable Row Level Security
ALTER TABLE "public"."admins" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."constant_contact_tokens" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."interest_categories" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."interests" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."meeting_attendance" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."meetings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."member_interests" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."members" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."payments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."volunteer_hours" ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Admins can manage Constant Contact tokens" ON "public"."constant_contact_tokens" TO "authenticated" USING ("public"."is_admin"("auth"."uid"())) WITH CHECK ("public"."is_admin"("auth"."uid"()));
CREATE POLICY "Admins can manage all interests" ON "public"."member_interests" TO "authenticated" USING ("public"."is_admin"("auth"."uid"()));
CREATE POLICY "Admins can manage all members" ON "public"."members" TO "authenticated" USING ("public"."is_admin"("auth"."uid"())) WITH CHECK ("public"."is_admin"("auth"."uid"()));
CREATE POLICY "Admins can manage all payments" ON "public"."payments" TO "authenticated" USING ("public"."is_admin"("auth"."uid"())) WITH CHECK ("public"."is_admin"("auth"."uid"()));
CREATE POLICY "Admins can manage all volunteer hours" ON "public"."volunteer_hours" TO "authenticated" USING ("public"."is_admin"("auth"."uid"())) WITH CHECK ("public"."is_admin"("auth"."uid"()));
CREATE POLICY "Admins can manage meetings" ON "public"."meetings" TO "authenticated" USING ("public"."is_admin"("auth"."uid"())) WITH CHECK ("public"."is_admin"("auth"."uid"()));
CREATE POLICY "Admins can manage other admins" ON "public"."admins" TO "authenticated" USING ("public"."is_admin"("auth"."uid"()));
CREATE POLICY "Allow admin all operations on interest_categories" ON "public"."interest_categories" TO "authenticated" USING ((EXISTS ( SELECT 1 FROM "public"."members" WHERE (("members"."email" = ("auth"."jwt"() ->> 'email'::"text")) AND ("members"."is_admin" = true)))));
CREATE POLICY "Allow admin all operations on interests" ON "public"."interests" TO "authenticated" USING ((EXISTS ( SELECT 1 FROM "public"."members" WHERE (("members"."email" = ("auth"."jwt"() ->> 'email'::"text")) AND ("members"."is_admin" = true)))));
CREATE POLICY "Allow admin all operations on meeting_attendance" ON "public"."meeting_attendance" TO "authenticated" USING ((EXISTS ( SELECT 1 FROM "public"."members" WHERE (("members"."email" = ("auth"."jwt"() ->> 'email'::"text")) AND ("members"."is_admin" = true)))));
CREATE POLICY "Allow admin all operations on meetings" ON "public"."meetings" TO "authenticated" USING ((EXISTS ( SELECT 1 FROM "public"."members" WHERE (("members"."email" = ("auth"."jwt"() ->> 'email'::"text")) AND ("members"."is_admin" = true)))));
CREATE POLICY "Allow admin all operations on member_interests" ON "public"."member_interests" TO "authenticated" USING ((EXISTS ( SELECT 1 FROM "public"."members" WHERE (("members"."email" = ("auth"."jwt"() ->> 'email'::"text")) AND ("members"."is_admin" = true)))));
CREATE POLICY "Allow admin all operations on members" ON "public"."members" TO "authenticated" USING ("public"."is_admin"("auth"."uid"())) WITH CHECK ("public"."is_admin"("auth"."uid"()));
CREATE POLICY "Allow admin all operations on payments" ON "public"."payments" TO "authenticated" USING ((EXISTS ( SELECT 1 FROM "public"."members" WHERE (("members"."email" = ("auth"."jwt"() ->> 'email'::"text")) AND ("members"."is_admin" = true)))));
CREATE POLICY "Allow admin all operations on volunteer_hours" ON "public"."volunteer_hours" TO "authenticated" USING ((EXISTS ( SELECT 1 FROM "public"."members" WHERE (("members"."email" = ("auth"."jwt"() ->> 'email'::"text")) AND ("members"."is_admin" = true)))));
CREATE POLICY "Allow all operations for authenticated users" ON "public"."constant_contact_tokens" TO "authenticated" USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on member_interests" ON "public"."member_interests" TO "authenticated", "anon" USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on members" ON "public"."members" TO "authenticated", "anon" USING (true) WITH CHECK (true);
CREATE POLICY "Allow anonymous insert on member_interests" ON "public"."member_interests" FOR INSERT TO "anon" WITH CHECK (true);

-- Add comments
COMMENT ON COLUMN "public"."members"."is_cell_phone" IS 'Indicates if the phone number is a cell phone';
COMMENT ON COLUMN "public"."members"."emergency_contact_name" IS 'Name of emergency contact';
COMMENT ON COLUMN "public"."members"."emergency_contact_phone" IS 'Phone number of emergency contact';
COMMENT ON COLUMN "public"."members"."emergency_contact_relationship" IS 'Relationship to emergency contact';
COMMENT ON COLUMN "public"."members"."signature" IS 'Electronic signature of the member';
COMMENT ON COLUMN "public"."members"."date_of_birth" IS 'Member''s date of birth';
COMMENT ON COLUMN "public"."members"."shirt_size" IS 'Member''s t-shirt size';
COMMENT ON COLUMN "public"."members"."precinct" IS 'Member''s precinct number';
COMMENT ON COLUMN "public"."members"."voter_id" IS 'Member''s voter ID number';
COMMENT ON COLUMN "public"."members"."tell_us_more" IS 'Additional information about the member';
COMMENT ON COLUMN "public"."members"."terms_accepted" IS 'Indicates if the member has accepted the terms'; 