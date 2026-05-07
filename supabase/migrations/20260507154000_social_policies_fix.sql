-- Add missing INSERT policies for social features
CREATE POLICY "Users can create chats" ON public.chats
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can add participants" ON public.chat_participants
  FOR INSERT WITH CHECK (true);
