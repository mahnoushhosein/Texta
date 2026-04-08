-- Run this in the Supabase SQL editor if you already applied schema.sql
-- Fixes:
--   1. infinite recursion in conversation_members policy
--   2. conversations INSERT RLS blocking authenticated users
--   3. conversations SELECT not including creator before membership is added
--   4. "Unknown" other participant — members_select was too restrictive

-- Helper function: checks if the current user is a member of a conversation.
-- SECURITY DEFINER bypasses RLS for the inner query, breaking the recursion cycle.
CREATE OR REPLACE FUNCTION is_conversation_member(conv_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM conversation_members
    WHERE conversation_id = conv_id AND user_id = auth.uid()
  );
$$;

-- Allow seeing ALL members of conversations you belong to (not just your own row)
DROP POLICY IF EXISTS "members_select" ON conversation_members;
CREATE POLICY "members_select" ON conversation_members FOR SELECT TO authenticated
  USING (is_conversation_member(conversation_id));

-- Fix conversations policies
DROP POLICY IF EXISTS "conversations_select" ON conversations;
DROP POLICY IF EXISTS "conversations_insert" ON conversations;

CREATE POLICY "conversations_select" ON conversations FOR SELECT TO authenticated
  USING (
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM conversation_members
      WHERE conversation_id = conversations.id AND user_id = auth.uid()
    )
  );

CREATE POLICY "conversations_insert" ON conversations FOR INSERT TO authenticated
  WITH CHECK (true);
