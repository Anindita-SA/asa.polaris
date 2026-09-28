CREATE OR REPLACE FUNCTION get_user_data(p_user_id UUID, p_tables TEXT[])
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    t TEXT;
    query TEXT;
    res JSONB := '{}'::jsonb;
    temp_json JSONB;
BEGIN
    FOREACH t IN ARRAY p_tables
    LOOP
        BEGIN
            query := format('SELECT COALESCE(jsonb_agg(row_to_json(tbl)), ''[]''::jsonb) FROM public.%I tbl WHERE user_id = $1', t);
            EXECUTE query INTO temp_json USING p_user_id;
            res := jsonb_set(res, ARRAY[t], temp_json, true);
        EXCEPTION 
            WHEN undefined_column THEN
                -- Silently skip tables that do not have a user_id column
                CONTINUE;
            WHEN undefined_table THEN
                -- Silently skip tables that do not exist
                CONTINUE;
        END;
    END LOOP;
    RETURN res;
END;
$$;
