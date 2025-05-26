-- Create pick list tables
CREATE TABLE IF NOT EXISTS "public"."pick_list_categories" (
    "id" uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    "name" text NOT NULL,
    "description" text,
    "display_order" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT now(),
    "updated_at" timestamp with time zone DEFAULT now(),
    CONSTRAINT "pick_list_categories_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "pick_list_categories_name_key" UNIQUE ("name")
);

CREATE TABLE IF NOT EXISTS "public"."pick_list_values" (
    "id" uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    "category_id" uuid NOT NULL,
    "value" text NOT NULL,
    "description" text,
    "display_order" integer DEFAULT 0,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT now(),
    "updated_at" timestamp with time zone DEFAULT now(),
    CONSTRAINT "pick_list_values_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "pick_list_values_category_id_value_key" UNIQUE ("category_id", "value"),
    CONSTRAINT "pick_list_values_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."pick_list_categories"("id") ON DELETE CASCADE
);

-- Enable RLS
ALTER TABLE "public"."pick_list_categories" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."pick_list_values" ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Admins can manage pick list categories" ON "public"."pick_list_categories" 
    TO authenticated 
    USING (public.is_admin(auth.uid())) 
    WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can manage pick list values" ON "public"."pick_list_values" 
    TO authenticated 
    USING (public.is_admin(auth.uid())) 
    WITH CHECK (public.is_admin(auth.uid()));

-- Insert initial pick list categories
INSERT INTO "public"."pick_list_categories" ("name", "description", "display_order") VALUES
    ('meeting_types', 'Types of meetings that can be scheduled', 1),
    ('membership_types', 'Types of membership available', 2),
    ('member_statuses', 'Possible statuses for members', 3),
    ('payment_statuses', 'Possible statuses for payments', 4),
    ('payment_methods', 'Accepted payment methods', 5),
    ('tshirt_sizes', 'Available t-shirt sizes', 6),
    ('volunteer_categories', 'Categories for volunteer hours', 7);

-- Insert initial values for each category
INSERT INTO "public"."pick_list_values" ("category_id", "value", "description", "display_order") 
SELECT 
    (SELECT id FROM pick_list_categories WHERE name = 'meeting_types'),
    unnest(ARRAY['general', 'board', 'committee', 'special']),
    unnest(ARRAY['General Meeting', 'Board Meeting', 'Committee Meeting', 'Special Event']),
    unnest(ARRAY[1, 2, 3, 4]);

INSERT INTO "public"."pick_list_values" ("category_id", "value", "description", "display_order") 
SELECT 
    (SELECT id FROM pick_list_categories WHERE name = 'membership_types'),
    unnest(ARRAY['regular', 'student', 'senior', 'lifetime']),
    unnest(ARRAY['Regular Membership', 'Student Membership', 'Senior Membership', 'Lifetime Membership']),
    unnest(ARRAY[1, 2, 3, 4]);

INSERT INTO "public"."pick_list_values" ("category_id", "value", "description", "display_order") 
SELECT 
    (SELECT id FROM pick_list_categories WHERE name = 'member_statuses'),
    unnest(ARRAY['pending', 'active', 'inactive', 'expired']),
    unnest(ARRAY['Pending Approval', 'Active Member', 'Inactive Member', 'Expired Membership']),
    unnest(ARRAY[1, 2, 3, 4]);

INSERT INTO "public"."pick_list_values" ("category_id", "value", "description", "display_order") 
SELECT 
    (SELECT id FROM pick_list_categories WHERE name = 'payment_statuses'),
    unnest(ARRAY['pending', 'completed', 'failed', 'refunded']),
    unnest(ARRAY['Pending Payment', 'Payment Completed', 'Payment Failed', 'Payment Refunded']),
    unnest(ARRAY[1, 2, 3, 4]);

INSERT INTO "public"."pick_list_values" ("category_id", "value", "description", "display_order") 
SELECT 
    (SELECT id FROM pick_list_categories WHERE name = 'payment_methods'),
    unnest(ARRAY['cash', 'check', 'credit_card', 'paypal']),
    unnest(ARRAY['Cash', 'Check', 'Credit Card', 'PayPal']),
    unnest(ARRAY[1, 2, 3, 4]);

INSERT INTO "public"."pick_list_values" ("category_id", "value", "description", "display_order") 
SELECT 
    (SELECT id FROM pick_list_categories WHERE name = 'tshirt_sizes'),
    unnest(ARRAY['S', 'M', 'L', 'XL', '2XL', '3XL']),
    unnest(ARRAY['Small', 'Medium', 'Large', 'Extra Large', '2X Large', '3X Large']),
    unnest(ARRAY[1, 2, 3, 4, 5, 6]);

INSERT INTO "public"."pick_list_values" ("category_id", "value", "description", "display_order") 
SELECT 
    (SELECT id FROM pick_list_categories WHERE name = 'volunteer_categories'),
    unnest(ARRAY['event', 'office', 'outreach', 'other']),
    unnest(ARRAY['Event Support', 'Office Work', 'Community Outreach', 'Other Activities']),
    unnest(ARRAY[1, 2, 3, 4]); 