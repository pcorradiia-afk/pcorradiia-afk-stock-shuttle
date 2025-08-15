// Temporary mock client until Supabase integration is completed
export const supabase = {
  auth: {
    getSession: async () => ({ data: { session: null } }),
    onAuthStateChange: (callback: any) => ({
      data: { subscription: { unsubscribe: () => {} } }
    }),
    signInWithPassword: async (credentials: any) => ({ 
      error: new Error('Complete la integración de Supabase para usar autenticación') 
    }),
    signUp: async (credentials: any) => ({ 
      data: { user: null },
      error: new Error('Complete la integración de Supabase para registrarse') 
    }),
    signOut: async () => ({ 
      error: new Error('Complete la integración de Supabase') 
    })
  },
  from: (table: string) => {
    const mockResponse = { data: [], error: new Error('Supabase no configurado') };
    return {
      select: (columns?: string) => {
        const chainable = {
          eq: (column: string, value: any) => ({
            single: async () => ({ data: null, error: new Error('Supabase no configurado') }),
            ...chainable
          }),
          gte: (column: string, value: any) => mockResponse,
          order: (column: string, options?: any) => mockResponse,
          ...mockResponse
        };
        return chainable;
      },
      insert: (values: any) => ({ 
        error: new Error('Supabase no configurado') 
      }),
      ...mockResponse
    };
  }
};