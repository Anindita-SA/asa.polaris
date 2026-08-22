CREATE TABLE public.hardware_opportunities (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL DEFAULT auth.uid(),
    title text NOT NULL,
    url text NULL,
    deadline date NULL,
    what_offered text NULL,
    project_fit text NULL,
    effort text NULL,
    status text NOT NULL DEFAULT 'drafting'::text,
    application_draft text NULL,
    task_id uuid NULL,
    created_at timestamp with time zone NULL DEFAULT now(),
    CONSTRAINT hardware_opportunities_pkey PRIMARY KEY (id),
    CONSTRAINT hardware_opportunities_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users (id)
);

-- Enable RLS
ALTER TABLE public.hardware_opportunities ENABLE ROW LEVEL SECURITY;

-- Create policy for users to manage their own records
CREATE POLICY "Users can manage their own hardware opportunities." 
ON public.hardware_opportunities 
FOR ALL 
USING (auth.uid() = user_id);
