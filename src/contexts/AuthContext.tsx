import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Session, User } from '@supabase/supabase-js';

interface Company { id: string; name: string; email_domain: string }
interface Profile { id: string; user_id: string; company_id: string; email: string; full_name: string | null }

interface AuthCtx {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  company: Company | null;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  isMotorista: boolean;
  loading: boolean;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [isMotorista, setIsMotorista] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProfile = async (uid: string) => {
      const { data: prof } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', uid)
        .maybeSingle();
      setProfile(prof as Profile | null);
      if (prof) {
        const { data: comp } = await supabase
          .from('companies')
          .select('*')
          .eq('id', prof.company_id)
          .maybeSingle();
        setCompany(comp as Company | null);
        const { data: roles } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', uid);
        const roleList = (roles || []).map(r => r.role);
        const admin = roleList.some(r => r === 'admin' || r === 'super_admin');
        setIsAdmin(admin);
        setIsSuperAdmin(roleList.some(r => r === 'super_admin'));
        setIsMotorista(roleList.includes('motorista') && !admin);
      } else {
        setCompany(null);
        setIsAdmin(false);
        setIsSuperAdmin(false);
        setIsMotorista(false);
      }
    };

    const { data: sub } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(sess);
      setUser(sess?.user ?? null);
      if (sess?.user) {
        setLoading(true);
        setTimeout(() => {
          loadProfile(sess.user.id).finally(() => setLoading(false));
        }, 0);
      } else {
        setProfile(null); setCompany(null); setIsAdmin(false); setIsSuperAdmin(false); setIsMotorista(false);
        setLoading(false);
      }
    });

    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s); setUser(s?.user ?? null);
      if (s?.user) loadProfile(s.user.id).finally(() => setLoading(false));
      else setLoading(false);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null); setCompany(null); setIsAdmin(false); setIsSuperAdmin(false); setIsMotorista(false);
  };

  return (
    <Ctx.Provider value={{ session, user, profile, company, isAdmin, isSuperAdmin, isMotorista, loading, signOut }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useAuth deve ser usado dentro de AuthProvider');
  return c;
}
