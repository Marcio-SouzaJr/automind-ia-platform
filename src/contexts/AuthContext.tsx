// src/contexts/AuthContext.tsx
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth'; // User: tipo do objeto de usuário do Firebase
import { auth, db } from '../config/firebaseConfig'; // Nossa instância auth
import { logOut as firebaseLogOut } from '../services/authService'; // Renomeando para evitar conflito
import { doc, getDoc, } from 'firebase/firestore';


export interface DbUserData {
  uid: string; // Adicionar o UID aqui pode ser útil
  email: string | null;
  name?: string; // Nome é opcional por enquanto
  companyId: string;
  role: string;
  createdAt: any; // Ou importar Timestamp de firebase/firestore se precisar de manipulação específica
}

// 1. Definir o tipo de dados que o contexto fornecerá
interface AuthContextType {
  currentUser: User | null; // O objeto do usuário do Firebase ou null se não logado
  dbUser: DbUserData | null; // <--- ADICIONADO: Dados do Firestore
  loading: boolean;         // Indicador para saber se o estado de auth já foi verificado
  logOut: () => Promise<void>; // Função para fazer logout
}

// 2. Criar o Context com um valor inicial indefinido (ou nulo com type assertion)
// Usar undefined é mais seguro para checar se o Provider foi usado
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// 3. Criar o Hook customizado para consumir o contexto facilmente
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    // Isso geralmente acontece se você tentar usar o hook fora de um AuthProvider
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
};

// 4. Criar o Componente Provedor (Provider)
interface AuthProviderProps {
  children: ReactNode; // Tipo para aceitar qualquer elemento React como filho
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [dbUser, setDbUser] = useState<DbUserData | null>(null);
  const [loading, setLoading] = useState(true); // Começa true, pois estamos esperando o Firebase verificar

  // 5. Efeito para ouvir as mudanças de autenticação do Firebase
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => { // ✨➡️ Tornar callback async
        setCurrentUser(user); // Define o usuário do Auth (ou null)

        if (user) {
            // --- Usuário está logado ---
            console.log('Auth State Changed: User logado:', user.uid);
            try {
                // 🟢➡️ Buscar documento do usuário no Firestore
                const userDocRef = doc(db, "users", user.uid);
                const userDocSnap = await getDoc(userDocRef);

                if (userDocSnap.exists()) {
                    // 🟢➡️ Documento encontrado, extrair dados e atualizar estado dbUser
                    const userDataFromDb = userDocSnap.data() as Omit<DbUserData, 'uid'>; // Pega dados, assume que tem os campos esperados (exceto uid)
                    console.log("Dados do usuário no Firestore:", userDataFromDb);
                    setDbUser({
                        uid: user.uid, // Adiciona o uid que não vem do data()
                        email: userDataFromDb.email,
                        companyId: userDataFromDb.companyId,
                        role: userDataFromDb.role,
                        name: userDataFromDb.name, // Será undefined se não existir
                        createdAt: userDataFromDb.createdAt
                     });
                } else {
                    // 🟢➡️ Documento não encontrado (não deveria acontecer se o signup estiver correto)
                    console.warn("Usuário logado no Auth, mas documento não encontrado no Firestore:", user.uid);
                    setDbUser(null); // Garante que dbUser fique nulo
                }
            } catch (error) {
                console.error("Erro ao buscar dados do usuário no Firestore:", error);
                setDbUser(null); // Limpa dados em caso de erro na busca
            }
        } else {
            // --- Usuário está deslogado ---
            console.log('Auth State Changed: User deslogado');
            setDbUser(null); // 🟢➡️ Limpar dados do Firestore ao deslogar
        }

        setLoading(false); // Marca que a verificação inicial (Auth + Firestore) terminou
    });

    return () => {
        console.log('Unsubscribing from Auth State Changes');
        unsubscribe();
    };
}, [])

  // 6. Implementar a função de logout que será exposta pelo contexto
  const handleLogOut = async () => {
    try {
      await firebaseLogOut(); // Chama a função do nosso authService
      // O onAuthStateChanged vai detectar o logout e setar currentUser para null automaticamente
    } catch (error) {
      console.error("Erro ao fazer logout pelo context:", error);
      // Opcional: adicionar algum estado de erro de logout no contexto
    }
  };

  const value: AuthContextType = {
    currentUser,
    dbUser, // <-- GARANTIR QUE dbUser está sendo passado no valor
    loading,
    logOut: handleLogOut
};



  // 8. Renderizar o Provider com o valor, envolvendo os filhos
  // Só renderiza os filhos quando o loading inicial terminar
  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
      {/* Ou mostrar um spinner global enquanto loading for true */}
      {/* {loading ? <FullScreenSpinner /> : children} */}
    </AuthContext.Provider>
  );
};